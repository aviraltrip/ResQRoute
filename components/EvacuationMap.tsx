"use client";

import React, { useMemo, useEffect, useState, useSyncExternalStore } from 'react';
import { RouteStep } from '@/lib/routing';
import { Room } from '@prisma/client';
import { Footprints, MousePointerClick, Flame } from 'lucide-react';

interface EvacuationMapProps {
  route: RouteStep[];
  floorRooms: Room[];
  currentFloor: number;
}

const MAP_WIDTH = 1200;
const MAP_HEIGHT = 800;

type MapRoom = {
  id: string;
  number: string;
  x: number;
  y: number;
  width: number;
  height: number;
  corridorNodeX: number;
  corridorNodeY: number;
};

// Generate static layout map based on reference image
const mapRooms: MapRoom[] = [];
// Top (301 - 320)
for (let i = 0; i < 20; i++) {
  mapRooms.push({
    id: `3${(i + 1).toString().padStart(2, '0')}`,
    number: `3${(i + 1).toString().padStart(2, '0')}`,
    x: 180 + i * 42, y: 80, width: 40, height: 100,
    corridorNodeX: 180 + i * 42 + 20, corridorNodeY: 220
  });
}
// Left (321 - 325)
for (let i = 0; i < 5; i++) {
  mapRooms.push({
    id: `3${21 + i}`,
    number: `3${21 + i}`,
    x: 60, y: 260 + i * 64, width: 100, height: 60,
    corridorNodeX: 200, corridorNodeY: 260 + i * 64 + 30
  });
}
// Bottom (328 - 341) - 14 rooms
for (let i = 0; i < 14; i++) {
  mapRooms.push({
    id: `3${28 + i}`,
    number: `3${28 + i}`,
    x: 270 + i * 50, y: 640, width: 45, height: 100,
    corridorNodeX: 270 + i * 50 + 22.5, corridorNodeY: 600
  });
}
// Right (342 - 346)
for (let i = 0; i < 5; i++) {
  mapRooms.push({
    id: `3${42 + i}`,
    number: `3${42 + i}`,
    x: 1040, y: 260 + (4 - i) * 64, width: 100, height: 60,
    corridorNodeX: 1000, corridorNodeY: 260 + (4 - i) * 64 + 30
  });
}

const exits = [
  { id: 'EXIT_A', label: 'EXIT A', x: 60, y: 80, width: 100, height: 100, corridorNodeX: 200, corridorNodeY: 220 },
  { id: 'EXIT_B', label: 'EXIT B', x: 1040, y: 80, width: 100, height: 100, corridorNodeX: 1000, corridorNodeY: 220 }
];

type CoreTile = {
  id: string;
  label: string;
  kind: 'stairs' | 'elevator' | 'washroom';
  x: number; y: number; width: number; height: number;
  centerX: number; centerY: number;
  taps: { id: string; x: number; y: number }[];
};

const coreTiles: CoreTile[] = [
  {
    id: 'STAIRS_L', label: 'Stairwell L', kind: 'stairs',
    x: 350, y: 320, width: 100, height: 180, centerX: 400, centerY: 410,
    taps: [
      { id: 'C_STAIRS_L_T', x: 400, y: 220 },
      { id: 'C_STAIRS_L_B', x: 400, y: 600 },
    ],
  },
  {
    id: 'ELEVATORS', label: 'Elevators', kind: 'elevator',
    x: 480, y: 320, width: 240, height: 80, centerX: 600, centerY: 360,
    taps: [{ id: 'C_ELEVATORS_T', x: 600, y: 220 }],
  },
  {
    id: 'STAIRS_R', label: 'Stairwell R', kind: 'stairs',
    x: 750, y: 320, width: 100, height: 180, centerX: 800, centerY: 410,
    taps: [
      { id: 'C_STAIRS_R_T', x: 800, y: 220 },
      { id: 'C_STAIRS_R_B', x: 800, y: 600 },
    ],
  },
  {
    id: 'WASH_M', label: 'Male WC', kind: 'washroom',
    x: 480, y: 400, width: 120, height: 100, centerX: 540, centerY: 450,
    taps: [{ id: 'C_WASH_M_B', x: 540, y: 600 }],
  },
  {
    id: 'WASH_F', label: 'Female WC', kind: 'washroom',
    x: 600, y: 400, width: 120, height: 100, centerX: 660, centerY: 450,
    taps: [{ id: 'C_WASH_F_B', x: 660, y: 600 }],
  },
];

// Fire hazards — any graph edge whose segment comes within HAZARD_BLOCK_RADIUS
// of a hazard is dropped, so Dijkstra naturally reroutes to the other exit.
const hazards = [
  { id: 'HZ_1', x: 620, y: 220 }, // mid top corridor
  { id: 'HZ_2', x: 1000, y: 440 }, // mid right corridor
];

const HAZARD_BLOCK_RADIUS = 30;

function distPointToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

// --- Build Navigation Graph ---
type GraphNode = { id: string; x: number; y: number };
type GraphEdge = { from: string; to: string; weight: number };
const nodes: GraphNode[] = [];
const edges: GraphEdge[] = [];

mapRooms.forEach(r => {
  nodes.push({ id: r.id, x: r.x + r.width / 2, y: r.y + r.height / 2 });
  nodes.push({ id: `C_${r.id}`, x: r.corridorNodeX, y: r.corridorNodeY });
});
exits.forEach(e => {
  nodes.push({ id: e.id, x: e.x + e.width / 2, y: e.y + e.height / 2 });
  nodes.push({ id: `C_${e.id}`, x: e.corridorNodeX, y: e.corridorNodeY });
});
coreTiles.forEach(t => {
  nodes.push({ id: t.id, x: t.centerX, y: t.centerY });
  t.taps.forEach(tap => nodes.push({ id: tap.id, x: tap.x, y: tap.y }));
});
// Corners
nodes.push({ id: 'C_TL', x: 200, y: 220 }, { id: 'C_TR', x: 1000, y: 220 });
nodes.push({ id: 'C_BL', x: 200, y: 600 }, { id: 'C_BR', x: 1000, y: 600 });

function addEdge(n1: string, n2: string) {
  const node1 = nodes.find(n => n.id === n1);
  const node2 = nodes.find(n => n.id === n2);
  if (!node1 || !node2) return;
  for (const h of hazards) {
    if (distPointToSegment(h.x, h.y, node1.x, node1.y, node2.x, node2.y) < HAZARD_BLOCK_RADIUS) {
      return;
    }
  }
  const dist = Math.sqrt(Math.pow(node1.x - node2.x, 2) + Math.pow(node1.y - node2.y, 2));
  edges.push({ from: n1, to: n2, weight: dist });
  edges.push({ from: n2, to: n1, weight: dist });
}

mapRooms.forEach(r => addEdge(r.id, `C_${r.id}`));
exits.forEach(e => addEdge(e.id, `C_${e.id}`));
coreTiles.forEach(t => t.taps.forEach(tap => addEdge(t.id, tap.id)));

// Connect Corridors
['220', '600'].forEach(yStr => {
  const y = parseInt(yStr);
  const corridor = nodes.filter(n => n.id.startsWith('C_') && Math.abs(n.y - y) < 1).sort((a, b) => a.x - b.x);
  for (let i = 0; i < corridor.length - 1; i++) addEdge(corridor[i].id, corridor[i + 1].id);
});
['200', '1000'].forEach(xStr => {
  const x = parseInt(xStr);
  const corridor = nodes.filter(n => n.id.startsWith('C_') && Math.abs(n.x - x) < 1).sort((a, b) => a.y - b.y);
  for (let i = 0; i < corridor.length - 1; i++) addEdge(corridor[i].id, corridor[i + 1].id);
});

// Dijkstra Pathfinding
function findShortestPath(startId: string, exitIds: string[]) {
  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const unvisited = new Set<string>();

  nodes.forEach(n => {
    dist[n.id] = Infinity;
    prev[n.id] = null;
    unvisited.add(n.id);
  });
  if (!unvisited.has(startId)) return { path: [], exitId: null, distance: 0 };
  
  dist[startId] = 0;

  while (unvisited.size > 0) {
    let current: string | null = null;
    let minDist = Infinity;
    for (const n of unvisited) {
      if (dist[n] < minDist) { minDist = dist[n]; current = n; }
    }
    if (!current || minDist === Infinity) break;
    unvisited.delete(current);

    const neighbors = edges.filter(e => e.from === current);
    for (const e of neighbors) {
      if (unvisited.has(e.to)) {
        const alt = dist[current] + e.weight;
        if (alt < dist[e.to]) {
          dist[e.to] = alt;
          prev[e.to] = current;
        }
      }
    }
  }

  let bestExit = null;
  let minExitDist = Infinity;
  for (const exitId of exitIds) {
    if (dist[exitId] < minExitDist) {
      minExitDist = dist[exitId];
      bestExit = exitId;
    }
  }

  if (!bestExit) return { path: [], exitId: null, distance: 0 };

  const path = [];
  let curr: string | null = bestExit;
  while (curr) {
    path.unshift(curr);
    curr = prev[curr];
  }
  return { path, exitId: bestExit, distance: minExitDist };
}

export default function EvacuationMap({ route, floorRooms, currentFloor }: EvacuationMapProps) {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  
  // Try to default to the backend route start if possible, otherwise 312
  const defaultStart = route && route[0] ? route[0].roomNumber.match(/\d{2}$/) ? `3${route[0].roomNumber.match(/\d{2}$/)![0]}` : '312' : '312';
  const [startRoom, setStartRoom] = useState<string>(defaultStart);

  const { path: activePathIds, exitId: activeExitId, distance } = useMemo(() => {
    return findShortestPath(startRoom, ['EXIT_A', 'EXIT_B']);
  }, [startRoom]);

  const pathD = useMemo(() => {
    if (activePathIds.length === 0) return '';
    const points = activePathIds.map(id => nodes.find(n => n.id === id)!);
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [activePathIds]);

  if (!mounted) return null;

  const distMeters = (distance / 12).toFixed(0);
  const timeSecs = (distance / 12 / 1.5).toFixed(0); // Assuming 1.5m/s walking speed

  const selectedCore = coreTiles.find(t => t.id === startRoom);
  const startLabel = selectedCore ? selectedCore.label : `Room ${startRoom}`;

  return (
    <div className="w-full h-full bg-[#f4f1ea] text-slate-800 font-sans relative overflow-hidden flex flex-col items-center justify-center">

      {/* Top-left title card (compact) */}
      <div className="absolute top-3 left-3 flex flex-col items-center bg-white px-3 py-2.5 shadow-lg border border-slate-200 z-10 w-44 rounded-sm pointer-events-none">
        <h1 className="font-serif text-sm font-bold tracking-widest text-[#8b7355] uppercase text-center leading-tight">
          Grand Horizon Hotel
        </h1>
        <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-2">Your Safety, Our Priority</p>

        <div className="w-full h-px bg-slate-200 mb-2" />

        <h2 className="text-base font-bold text-[#1a4a38] uppercase leading-none">Floor {currentFloor}</h2>
        <p className="text-[10px] font-semibold tracking-wider mb-2">EVACUATION MAP</p>

        <div className="w-full border border-red-500 rounded px-2 py-1.5 text-center bg-red-50 flex flex-col items-center">
          <p className="text-red-600 font-bold uppercase text-[9px] flex items-center gap-1">
            <MousePointerClick className="w-2.5 h-2.5" /> Select a Start
          </p>
          <p className="font-bold text-xs mt-0.5 truncate max-w-full">{startLabel}</p>
        </div>
      </div>

      <div className="w-full h-full max-w-full overflow-auto relative">
        <svg 
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} 
          className="w-full h-full min-w-[1000px] object-contain drop-shadow-2xl select-none"
          style={{ background: '#f4f1ea' }}
        >
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,0,0,0.02)" strokeWidth="1"/>
            </pattern>
            <filter id="shadow">
              <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.1"/>
            </filter>
            <filter id="glowRoute">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <pattern id="diagonalHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="10" stroke="#dc2626" strokeWidth="2" opacity="0.3"/>
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Central Core Area — clickable tiles for stairs / elevators / washrooms */}
          <g filter="url(#shadow)">
            {/* Soft backing block behind the core tiles */}
            <rect x="346" y="316" width="508" height="188" rx="6" fill="#ece6d8" stroke="#c9bfa8" strokeWidth="1.5" />

            {(() => {
              const kindFill: Record<CoreTile['kind'], { fill: string; stroke: string; text: string }> = {
                stairs:   { fill: '#e0e7ff', stroke: '#6366f1', text: '#3730a3' },
                elevator: { fill: '#fef3c7', stroke: '#d97706', text: '#92400e' },
                washroom: { fill: '#ccfbf1', stroke: '#0d9488', text: '#115e59' },
              };
              return coreTiles.map(t => {
                const isStart = startRoom === t.id;
                const palette = kindFill[t.kind];
                return (
                  <g
                    key={t.id}
                    onClick={() => setStartRoom(t.id)}
                    className="cursor-pointer group"
                  >
                    <rect
                      x={t.x} y={t.y} width={t.width} height={t.height}
                      rx="4"
                      fill={isStart ? '#fee2e2' : palette.fill}
                      stroke={isStart ? '#ef4444' : palette.stroke}
                      strokeWidth={isStart ? 3 : 2}
                      className="transition-all duration-200 group-hover:brightness-95"
                    />
                    <text
                      x={t.centerX} y={t.centerY + 4}
                      textAnchor="middle"
                      fontSize={t.kind === 'elevator' ? 14 : 13}
                      fontWeight="bold"
                      fill={isStart ? '#991b1b' : palette.text}
                      className="pointer-events-none uppercase tracking-wider"
                    >
                      {t.label}
                    </text>
                  </g>
                );
              });
            })()}
          </g>

          {/* Rooms */}
          <g filter="url(#shadow)">
            {mapRooms.map((r) => {
              const isStart = startRoom === r.id;
              return (
                <g key={r.id} onClick={() => setStartRoom(r.id)} className="cursor-pointer group">
                  <rect 
                    x={r.x} y={r.y} width={r.width} height={r.height} 
                    fill={isStart ? "#fee2e2" : "#fcf8f2"} 
                    stroke={isStart ? "#ef4444" : "#a39a8c"} 
                    strokeWidth={isStart ? "3" : "2"} 
                    className="transition-colors duration-300 group-hover:fill-red-50"
                  />
                  <text x={r.x + r.width/2} y={r.y + r.height/2 + 5} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#333" className="pointer-events-none">
                    {r.number}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Emergency Exit Stairwells */}
          <g filter="url(#shadow)">
            {exits.map(e => (
              <g key={e.id}>
                <rect x={e.x} y={e.y} width={e.width} height={e.height} fill="#d1e7dd" stroke="#0f5132" strokeWidth="3" />
                <text x={e.x + e.width/2} y={e.y + e.height/2 - 5} textAnchor="middle" fontSize="16" fontWeight="bold" fill="#0f5132">{e.label}</text>
                <text x={e.x + e.width/2} y={e.y + e.height/2 + 15} textAnchor="middle" fontSize="12" fill="#0f5132">Stairwell</text>
              </g>
            ))}
          </g>

          {/* Corridor Hollow Area overlay (to show corridor shape, not actually filled) */}
          <path d="M 160 180 L 1040 180 L 1040 260 L 160 260 Z" fill="rgba(0,0,0,0.02)" className="pointer-events-none" />
          <path d="M 160 560 L 1040 560 L 1040 640 L 160 640 Z" fill="rgba(0,0,0,0.02)" className="pointer-events-none" />
          <path d="M 160 260 L 260 260 L 260 560 L 160 560 Z" fill="rgba(0,0,0,0.02)" className="pointer-events-none" />
          <path d="M 940 260 L 1040 260 L 1040 560 L 940 560 Z" fill="rgba(0,0,0,0.02)" className="pointer-events-none" />

          {/* Evacuation Route path */}
          {pathD && (
            <g className="pointer-events-none">
              <path
                d={pathD} fill="none" stroke="#ffffff" strokeWidth="12"
                strokeLinecap="round" strokeLinejoin="round" opacity="0.8"
              />
              <path
                d={pathD} fill="none" stroke="#10b981" strokeWidth="8"
                strokeLinecap="round" strokeLinejoin="round" strokeDasharray="15, 15"
                className="animate-[dash_1.5s_linear_infinite]" filter="url(#glowRoute)"
              />
            </g>
          )}

          {/* Start Point Marker */}
          {activePathIds.length > 0 && (
            <g transform={`translate(${nodes.find(n => n.id === startRoom)!.x}, ${nodes.find(n => n.id === startRoom)!.y - 20})`} className="pointer-events-none" filter="url(#shadow)">
              <path d="M 0 0 C 15 -15 15 -35 0 -45 C -15 -35 -15 -15 0 0 Z" fill="#ef4444" />
              <circle cx="0" cy="-25" r="6" fill="#ffffff" />
              <text x="0" y="-55" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#ef4444">START</text>
            </g>
          )}

          {/* End Point Marker */}
          {activeExitId && (
            <g transform={`translate(${nodes.find(n => n.id === activeExitId)!.x}, ${nodes.find(n => n.id === activeExitId)!.y})`} className="pointer-events-none">
              <circle cx="0" cy="0" r="20" fill="#10b981" className="animate-pulse" filter="url(#glowRoute)" />
              <Footprints className="w-8 h-8 text-white" x="-16" y="-16" />
            </g>
          )}

          {/* Fire Hazards — block nearby graph edges */}
          {hazards.map(h => (
            <g key={h.id} transform={`translate(${h.x}, ${h.y})`} className="pointer-events-none">
              <circle r="26" fill="rgba(239,68,68,0.18)" className="animate-ping" />
              <circle r="16" fill="#fee2e2" stroke="#dc2626" strokeWidth="2.5" />
              <Flame className="w-5 h-5 text-red-600" x="-10" y="-10" />
              <text x="0" y="30" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#b91c1c" className="uppercase tracking-widest">
                Hazard
              </text>
            </g>
          ))}

        </svg>
      </div>

      <style>{`
        @keyframes dash {
          to { stroke-dashoffset: -30; }
        }
      `}</style>
      
      {/* Calculation Results (compact) */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-3 pointer-events-none">
        <div className="bg-white px-3 py-2.5 shadow-lg border border-slate-200 rounded-sm w-48">
          <h3 className="font-bold text-slate-800 text-[10px] uppercase tracking-widest mb-2 border-b pb-1.5">Calculation</h3>
          <div className="flex items-start gap-2 mb-2">
            <div className="bg-emerald-600 p-1 rounded shrink-0">
              <Footprints className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-800 leading-tight">Nearest Exit</p>
              <p className="text-[10px] text-emerald-700 font-bold truncate">{activeExitId === 'EXIT_A' ? 'Exit A (Left)' : activeExitId === 'EXIT_B' ? 'Exit B (Right)' : 'Select Start'}</p>
            </div>
          </div>
          <div className="border-t pt-2 flex justify-between">
            <div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Distance</p>
              <p className="text-xs font-semibold text-slate-700">{distMeters} m</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Est. Time</p>
              <p className="text-xs font-semibold text-slate-700">~ {timeSecs}s</p>
            </div>
          </div>
        </div>
      </div>

      {/* Legend (compact) */}
      <div className="absolute bottom-3 left-3 bg-white px-3 py-2.5 shadow-lg border border-slate-200 rounded-sm w-40 pointer-events-none">
        <h3 className="font-bold text-slate-800 text-[10px] uppercase tracking-widest mb-2 border-b pb-1.5 text-center">Legend</h3>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-3 bg-[#fcf8f2] border border-[#a39a8c] shrink-0"></div>
            <span className="text-[10px] font-medium text-slate-700">Guest Room</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-3 bg-[#e0e7ff] border border-[#6366f1] shrink-0"></div>
            <span className="text-[10px] font-medium text-slate-700">Stairs</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-3 bg-[#fef3c7] border border-[#d97706] shrink-0"></div>
            <span className="text-[10px] font-medium text-slate-700">Elevator</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-3 bg-[#d1e7dd] border border-[#0f5132] shrink-0"></div>
            <span className="text-[10px] font-medium text-slate-700">Exit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-3 bg-red-100 border-2 border-red-500 rounded-full shrink-0"></div>
            <span className="text-[10px] font-bold text-red-700">Fire Hazard</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-0 border-t-[3px] border-dashed border-emerald-500 shrink-0"></div>
            <span className="text-[10px] font-medium text-slate-700">Route</span>
          </div>
        </div>
      </div>

    </div>
  );
}
