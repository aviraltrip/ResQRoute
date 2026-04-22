"use client";

import React, { useMemo, useEffect, useState } from 'react';
import { RouteStep } from '@/lib/routing';
import { Room } from '@prisma/client';
import { Footprints, MousePointerClick, ArrowRight } from 'lucide-react';

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
// Corners
nodes.push({ id: 'C_TL', x: 200, y: 220 }, { id: 'C_TR', x: 1000, y: 220 });
nodes.push({ id: 'C_BL', x: 200, y: 600 }, { id: 'C_BR', x: 1000, y: 600 });

function addEdge(n1: string, n2: string) {
  const node1 = nodes.find(n => n.id === n1);
  const node2 = nodes.find(n => n.id === n2);
  if (!node1 || !node2) return;
  const dist = Math.sqrt(Math.pow(node1.x - node2.x, 2) + Math.pow(node1.y - node2.y, 2));
  edges.push({ from: n1, to: n2, weight: dist });
  edges.push({ from: n2, to: n1, weight: dist });
}

mapRooms.forEach(r => addEdge(r.id, `C_${r.id}`));
exits.forEach(e => addEdge(e.id, `C_${e.id}`));

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
  const [mounted, setMounted] = useState(false);
  
  // Try to default to the backend route start if possible, otherwise 312
  const defaultStart = route && route[0] ? route[0].roomNumber.match(/\d{2}$/) ? `3${route[0].roomNumber.match(/\d{2}$/)![0]}` : '312' : '312';
  const [startRoom, setStartRoom] = useState<string>(defaultStart);

  useEffect(() => setMounted(true), []);

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

  return (
    <div className="w-full h-full bg-[#f4f1ea] text-slate-800 font-sans relative overflow-hidden flex flex-col items-center justify-center">
      
      {/* Header matching the image */}
      <div className="absolute top-4 left-4 flex flex-col items-center bg-white p-4 shadow-xl border border-slate-200 z-10 w-64 rounded-sm pointer-events-none">
        <h1 className="font-serif text-xl font-bold tracking-widest text-[#8b7355] uppercase text-center mb-1">
          Grand Horizon Hotel
        </h1>
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-4">Your Safety, Our Priority</p>
        
        <div className="w-full h-px bg-slate-200 mb-4" />
        
        <h2 className="text-2xl font-bold text-[#1a4a38] uppercase">Floor {currentFloor}</h2>
        <p className="text-sm font-semibold tracking-wider mb-4">EVACUATION MAP</p>
        
        <div className="w-full border-2 border-red-500 rounded p-2 text-center bg-red-50 flex flex-col items-center">
          <p className="text-red-600 font-bold uppercase text-xs flex items-center gap-1">
            <MousePointerClick className="w-3 h-3" /> Select a Room
          </p>
          <p className="font-bold text-lg mt-1">Room {startRoom}</p>
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

          {/* Central Core Area */}
          <g filter="url(#shadow)">
            <rect x="350" y="320" width="500" height="180" fill="#e2dcd0" stroke="#a39a8c" strokeWidth="2" />
            
            {/* Elevators (Center Top of core) */}
            <rect x="480" y="320" width="240" height="80" fill="#d1ccc0" stroke="#a39a8c" strokeWidth="2" />
            <text x="600" y="365" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#555">ELEVATORS</text>
            <g transform="translate(520, 335)">
              <rect x="0" y="0" width="25" height="25" fill="none" stroke="#555" strokeWidth="2" />
              <ArrowRight className="w-5 h-5 text-[#555]" x="2" y="2" transform="rotate(90 12.5 12.5) scale(0.8)" />
            </g>
            <g transform="translate(560, 335)">
              <rect x="0" y="0" width="25" height="25" fill="none" stroke="#555" strokeWidth="2" />
              <ArrowRight className="w-5 h-5 text-[#555]" x="2" y="2" transform="rotate(90 12.5 12.5) scale(0.8)" />
            </g>
            <g transform="translate(600, 335)">
              <rect x="0" y="0" width="25" height="25" fill="none" stroke="#555" strokeWidth="2" />
              <ArrowRight className="w-5 h-5 text-[#555]" x="2" y="2" transform="rotate(-90 12.5 12.5) scale(0.8)" />
            </g>
            <g transform="translate(640, 335)">
              <rect x="0" y="0" width="25" height="25" fill="none" stroke="#555" strokeWidth="2" />
              <ArrowRight className="w-5 h-5 text-[#555]" x="2" y="2" transform="rotate(-90 12.5 12.5) scale(0.8)" />
            </g>

            {/* Central Stairs (Left & Right inside core) */}
            <rect x="350" y="320" width="100" height="180" fill="#c4bfb3" stroke="#a39a8c" strokeWidth="2" />
            <text x="400" y="410" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#555" transform="rotate(-90 400,410)">STAIRS</text>
            <line x1="370" y1="320" x2="370" y2="500" stroke="#a39a8c" strokeWidth="1" strokeDasharray="5,5" />
            
            <rect x="750" y="320" width="100" height="180" fill="#c4bfb3" stroke="#a39a8c" strokeWidth="2" />
            <text x="800" y="410" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#555" transform="rotate(-90 800,410)">STAIRS</text>
            <line x1="770" y1="320" x2="770" y2="500" stroke="#a39a8c" strokeWidth="1" strokeDasharray="5,5" />

            {/* Washrooms (Bottom Center of core) */}
            <rect x="480" y="400" width="120" height="100" fill="#a4bbf0" stroke="#a39a8c" strokeWidth="2" />
            <text x="540" y="450" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#333">MALE</text>
            <text x="540" y="465" textAnchor="middle" fontSize="10" fill="#333">WASHROOM</text>
            
            <rect x="600" y="400" width="120" height="100" fill="#a4bbf0" stroke="#a39a8c" strokeWidth="2" />
            <text x="660" y="450" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#333">FEMALE</text>
            <text x="660" y="465" textAnchor="middle" fontSize="10" fill="#333">WASHROOM</text>
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

        </svg>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes dash {
          to { stroke-dashoffset: -30; }
        }
      `}} />
      
      {/* Legend overlays */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-4 pointer-events-none">
        {/* Key Info */}
        <div className="bg-white p-4 shadow-xl border border-slate-200 rounded-sm w-64">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest mb-3 border-b pb-2">Calculation Results</h3>
          <div className="flex items-start gap-3 mb-4">
            <div className="bg-emerald-600 p-1.5 rounded">
              <Footprints className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Nearest Exit</p>
              <p className="text-xs text-emerald-700 font-bold">{activeExitId === 'EXIT_A' ? 'Emergency Exit A (Left)' : activeExitId === 'EXIT_B' ? 'Emergency Exit B (Right)' : 'Select Room'}</p>
            </div>
          </div>
          <div className="border-t pt-3 flex justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800">Distance</p>
              <p className="text-sm text-slate-600">{distMeters} m</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-800">Est. Time</p>
              <p className="text-sm text-slate-600">~ {timeSecs} sec</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Legend Left */}
      <div className="absolute bottom-6 left-4 bg-white p-4 shadow-xl border border-slate-200 rounded-sm w-48 pointer-events-none">
        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest mb-3 border-b pb-2 text-center">Legend</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-6 h-4 bg-[#fcf8f2] border border-[#a39a8c]"></div>
            <span className="text-xs font-medium text-slate-700">Guest Room</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-4 bg-[#d1e7dd] border border-[#0f5132]"></div>
            <span className="text-xs font-medium text-slate-700">Emergency Exit</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-2 border-t-[3px] border-dashed border-emerald-500"></div>
            <span className="text-xs font-medium text-slate-700">Evacuation Route</span>
          </div>
        </div>
      </div>

    </div>
  );
}
