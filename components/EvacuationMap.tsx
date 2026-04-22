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

const MAP_WIDTH = 1400;
const MAP_HEIGHT = 900;

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

// Generate static layout map
const mapRooms: MapRoom[] = [];
let roomId = 1;

// Top (19 rooms, 301-319)
for (let i = 0; i < 19; i++) {
  const num = `3${roomId.toString().padStart(2, '0')}`;
  mapRooms.push({
    id: num, number: num,
    x: 220 + i * 40, y: 80, width: 40, height: 100,
    corridorNodeX: 220 + i * 40 + 20, corridorNodeY: 210
  });
  roomId++;
}
// Right (6 rooms, 320-325)
for (let i = 0; i < 6; i++) {
  const num = `3${roomId.toString().padStart(2, '0')}`;
  mapRooms.push({
    id: num, number: num,
    x: 1040, y: 240 + i * 60, width: 100, height: 60,
    corridorNodeX: 1010, corridorNodeY: 240 + i * 60 + 30
  });
  roomId++;
}
// Bottom Right (7 rooms, 326-332)
for (let i = 0; i < 7; i++) {
  const num = `3${roomId.toString().padStart(2, '0')}`;
  mapRooms.push({
    id: num, number: num,
    x: 940 - i * 40, y: 660, width: 40, height: 100,
    corridorNodeX: 940 - i * 40 + 20, corridorNodeY: 630
  });
  roomId++;
}
// Bottom Left (7 rooms, 333-339)
for (let i = 0; i < 7; i++) {
  const num = `3${roomId.toString().padStart(2, '0')}`;
  mapRooms.push({
    id: num, number: num,
    x: 460 - i * 40, y: 660, width: 40, height: 100,
    corridorNodeX: 460 - i * 40 + 20, corridorNodeY: 630
  });
  roomId++;
}
// Left (6 rooms, 340-345)
for (let i = 0; i < 6; i++) {
  const num = `3${roomId.toString().padStart(2, '0')}`;
  mapRooms.push({
    id: num, number: num,
    x: 60, y: 540 - i * 60, width: 100, height: 60,
    corridorNodeX: 190, corridorNodeY: 540 - i * 60 + 30
  });
  roomId++;
}

const exits = [
  { id: 'EXIT_A', label: 'EXIT A', x: 60, y: 80, width: 100, height: 100, corridorNodeX: 190, corridorNodeY: 210 },
  { id: 'EXIT_B', label: 'EXIT B', x: 1040, y: 80, width: 100, height: 100, corridorNodeX: 1010, corridorNodeY: 210 }
];

const specialAreas = [
  { id: 'WASH_M_L', label: 'Male Washroom', cx: 400, cy: 420, nx: 400, ny: 630 },
  { id: 'WASH_F_L', label: 'Female Washroom', cx: 440, cy: 420, nx: 440, ny: 630 },
  { id: 'STAIRS_L', label: 'Left Stairs', cx: 490, cy: 420, nx: 490, ny: 630 },
  { id: 'ELEVATORS', label: 'Elevators', cx: 600, cy: 420, nx: 600, ny: 630 },
  { id: 'STAIRS_R', label: 'Right Stairs', cx: 710, cy: 420, nx: 710, ny: 630 },
  { id: 'WASH_F_R', label: 'Female Washroom', cx: 760, cy: 420, nx: 760, ny: 630 },
  { id: 'WASH_M_R', label: 'Male Washroom', cx: 800, cy: 420, nx: 800, ny: 630 },
  { id: 'LINEN', label: 'Linen Room', cx: 110, cy: 210, nx: 190, ny: 210 },
  { id: 'UTILITY', label: 'Utility Room', cx: 1090, cy: 210, nx: 1010, ny: 210 },
  { id: 'RECEPTION', label: 'Reception', cx: 600, cy: 710, nx: 600, ny: 630 },
];

const getRoomLabel = (id: string) => {
  const special = specialAreas.find(s => s.id === id);
  if (special) return special.label;
  if (id.startsWith('3')) return `Room ${id}`;
  return id;
};

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
specialAreas.forEach(a => {
  nodes.push({ id: a.id, x: a.cx, y: a.cy });
  nodes.push({ id: `C_${a.id}`, x: a.nx, y: a.ny });
});

// Corners
nodes.push({ id: 'C_TL', x: 190, y: 210 }, { id: 'C_TR', x: 1010, y: 210 });
nodes.push({ id: 'C_BL', x: 190, y: 630 }, { id: 'C_BR', x: 1010, y: 630 });

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
specialAreas.forEach(a => addEdge(a.id, `C_${a.id}`));

const isBlocked = (x1: number, y1: number, x2: number, y2: number) => {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  // Top right corridor blockage
  if (Math.abs(y1 - 210) < 1 && Math.abs(y2 - 210) < 1) {
    if (minX < 875 && maxX > 845) return true;
  }
  // Bottom left corridor blockage
  if (Math.abs(y1 - 630) < 1 && Math.abs(y2 - 630) < 1) {
    if (minX < 310 && maxX > 290) return true;
  }
  return false;
};

// Connect Corridors
['210', '630'].forEach(yStr => {
  const y = parseInt(yStr);
  const corridor = nodes.filter(n => n.id.startsWith('C_') && Math.abs(n.y - y) < 1).sort((a, b) => a.x - b.x);
  for (let i = 0; i < corridor.length - 1; i++) {
    if (!isBlocked(corridor[i].x, corridor[i].y, corridor[i+1].x, corridor[i+1].y)) {
      addEdge(corridor[i].id, corridor[i+1].id);
    }
  }
});
['190', '1010'].forEach(xStr => {
  const x = parseInt(xStr);
  const corridor = nodes.filter(n => n.id.startsWith('C_') && Math.abs(n.x - x) < 1).sort((a, b) => a.y - b.y);
  for (let i = 0; i < corridor.length - 1; i++) {
    if (!isBlocked(corridor[i].x, corridor[i].y, corridor[i+1].x, corridor[i+1].y)) {
      addEdge(corridor[i].id, corridor[i+1].id);
    }
  }
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
  const timeSecs = (distance / 12 / 1.5).toFixed(0);

  return (
    <div className="w-full h-full bg-[#f4f1ea] text-slate-800 font-sans relative overflow-hidden flex flex-col items-center justify-center">
      
      {/* Header scaled down to preserve map space */}
      <div className="absolute top-3 left-3 flex flex-col items-center bg-white/95 p-3 shadow-xl border border-slate-200 z-10 w-48 rounded-sm backdrop-blur-sm pointer-events-none">
        <h1 className="font-serif text-lg font-bold tracking-widest text-[#8b7355] uppercase text-center mb-0.5 leading-tight">
          Grand Horizon Hotel
        </h1>
        <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-2">Your Safety, Our Priority</p>
        
        <div className="w-full h-px bg-slate-200 mb-2" />
        
        <h2 className="text-xl font-bold text-[#1a4a38] uppercase">Floor {currentFloor}</h2>
        <p className="text-xs font-semibold tracking-wider mb-3">EVACUATION MAP</p>
        
        <div className="w-full border border-red-500 rounded p-1.5 text-center bg-red-50 flex flex-col items-center">
          <p className="text-red-600 font-bold uppercase text-[10px] flex items-center gap-1">
            <MousePointerClick className="w-3 h-3" /> Select a Room
          </p>
          <p className="font-bold text-base mt-0.5">{getRoomLabel(startRoom)}</p>
        </div>
      </div>

      <div className="w-full h-full max-w-full overflow-auto relative">
        <svg 
          viewBox="-50 -50 1300 900" 
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

          <rect x="-50" y="-50" width="1300" height="900" fill="url(#grid)" />

          {/* Central Core Area with proper symmetry */}
          <g filter="url(#shadow)">
            <rect x="380" y="330" width="440" height="180" fill="#e2dcd0" stroke="#a39a8c" strokeWidth="2" />
            
            {/* Left Washrooms */}
            <g onClick={() => setStartRoom('WASH_M_L')} className="cursor-pointer group">
              <rect x="380" y="330" width="40" height="180" fill={startRoom === 'WASH_M_L' ? "#fee2e2" : "#a4bbf0"} stroke={startRoom === 'WASH_M_L' ? "#ef4444" : "#a39a8c"} strokeWidth={startRoom === 'WASH_M_L' ? "3" : "1"} className="transition-all duration-300 group-hover:brightness-110" />
              <text x="400" y="420" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#333" transform="rotate(-90 400,420)" className="pointer-events-none">MALE</text>
            </g>
            <g onClick={() => setStartRoom('WASH_F_L')} className="cursor-pointer group">
              <rect x="420" y="330" width="40" height="180" fill={startRoom === 'WASH_F_L' ? "#fee2e2" : "#f0a4b4"} stroke={startRoom === 'WASH_F_L' ? "#ef4444" : "#a39a8c"} strokeWidth={startRoom === 'WASH_F_L' ? "3" : "1"} className="transition-all duration-300 group-hover:brightness-110" />
              <text x="440" y="420" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#333" transform="rotate(-90 440,420)" className="pointer-events-none">FEMALE</text>
            </g>
            
            {/* Left Stairs */}
            <g onClick={() => setStartRoom('STAIRS_L')} className="cursor-pointer group">
              <rect x="460" y="330" width="60" height="180" fill={startRoom === 'STAIRS_L' ? "#fee2e2" : "#c4bfb3"} stroke={startRoom === 'STAIRS_L' ? "#ef4444" : "#a39a8c"} strokeWidth={startRoom === 'STAIRS_L' ? "3" : "1"} className="transition-all duration-300 group-hover:brightness-110" />
              <text x="490" y="420" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#555" transform="rotate(-90 490,420)" className="pointer-events-none">STAIRS</text>
              <line x1="475" y1="330" x2="475" y2="510" stroke="#a39a8c" strokeWidth="1" strokeDasharray="4,4" className="pointer-events-none" />
              <line x1="505" y1="330" x2="505" y2="510" stroke="#a39a8c" strokeWidth="1" strokeDasharray="4,4" className="pointer-events-none" />
            </g>

            {/* Elevators */}
            <g onClick={() => setStartRoom('ELEVATORS')} className="cursor-pointer group">
              <rect x="520" y="330" width="160" height="180" fill={startRoom === 'ELEVATORS' ? "#fee2e2" : "#d1ccc0"} stroke={startRoom === 'ELEVATORS' ? "#ef4444" : "#a39a8c"} strokeWidth={startRoom === 'ELEVATORS' ? "3" : "1"} className="transition-all duration-300 group-hover:brightness-110" />
              <text x="600" y="425" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#555" className="pointer-events-none">ELEVATORS</text>
              <rect x="540" y="340" width="30" height="30" fill="none" stroke="#555" strokeWidth="2" className="pointer-events-none" />
              <rect x="580" y="340" width="30" height="30" fill="none" stroke="#555" strokeWidth="2" className="pointer-events-none" />
              <rect x="630" y="340" width="30" height="30" fill="none" stroke="#555" strokeWidth="2" className="pointer-events-none" />
            </g>
            
            {/* Right Stairs */}
            <g onClick={() => setStartRoom('STAIRS_R')} className="cursor-pointer group">
              <rect x="680" y="330" width="60" height="180" fill={startRoom === 'STAIRS_R' ? "#fee2e2" : "#c4bfb3"} stroke={startRoom === 'STAIRS_R' ? "#ef4444" : "#a39a8c"} strokeWidth={startRoom === 'STAIRS_R' ? "3" : "1"} className="transition-all duration-300 group-hover:brightness-110" />
              <text x="710" y="420" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#555" transform="rotate(-90 710,420)" className="pointer-events-none">STAIRS</text>
              <line x1="695" y1="330" x2="695" y2="510" stroke="#a39a8c" strokeWidth="1" strokeDasharray="4,4" className="pointer-events-none" />
              <line x1="725" y1="330" x2="725" y2="510" stroke="#a39a8c" strokeWidth="1" strokeDasharray="4,4" className="pointer-events-none" />
            </g>

            {/* Right Washrooms */}
            <g onClick={() => setStartRoom('WASH_F_R')} className="cursor-pointer group">
              <rect x="740" y="330" width="40" height="180" fill={startRoom === 'WASH_F_R' ? "#fee2e2" : "#f0a4b4"} stroke={startRoom === 'WASH_F_R' ? "#ef4444" : "#a39a8c"} strokeWidth={startRoom === 'WASH_F_R' ? "3" : "1"} className="transition-all duration-300 group-hover:brightness-110" />
              <text x="760" y="420" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#333" transform="rotate(-90 760,420)" className="pointer-events-none">FEMALE</text>
            </g>
            <g onClick={() => setStartRoom('WASH_M_R')} className="cursor-pointer group">
              <rect x="780" y="330" width="40" height="180" fill={startRoom === 'WASH_M_R' ? "#fee2e2" : "#a4bbf0"} stroke={startRoom === 'WASH_M_R' ? "#ef4444" : "#a39a8c"} strokeWidth={startRoom === 'WASH_M_R' ? "3" : "1"} className="transition-all duration-300 group-hover:brightness-110" />
              <text x="800" y="420" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#333" transform="rotate(-90 800,420)" className="pointer-events-none">MALE</text>
            </g>
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

          {/* Corner Amenities & Reception */}
          <g filter="url(#shadow)">
            <g onClick={() => setStartRoom('LINEN')} className="cursor-pointer group">
              <rect x="60" y="180" width="100" height="60" fill={startRoom === 'LINEN' ? "#fee2e2" : "#e2dcd0"} stroke={startRoom === 'LINEN' ? "#ef4444" : "#a39a8c"} strokeWidth={startRoom === 'LINEN' ? "3" : "2"} className="transition-all duration-300 group-hover:brightness-110" />
              <text x="110" y="215" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#555" className="pointer-events-none">LINEN</text>
            </g>
            
            <g onClick={() => setStartRoom('UTILITY')} className="cursor-pointer group">
              <rect x="1040" y="180" width="100" height="60" fill={startRoom === 'UTILITY' ? "#fee2e2" : "#e2dcd0"} stroke={startRoom === 'UTILITY' ? "#ef4444" : "#a39a8c"} strokeWidth={startRoom === 'UTILITY' ? "3" : "2"} className="transition-all duration-300 group-hover:brightness-110" />
              <text x="1090" y="215" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#555" className="pointer-events-none">UTILITY</text>
            </g>
            
            <g onClick={() => setStartRoom('RECEPTION')} className="cursor-pointer group">
              <rect x="500" y="660" width="200" height="100" fill={startRoom === 'RECEPTION' ? "#fee2e2" : "#d1ccc0"} stroke={startRoom === 'RECEPTION' ? "#ef4444" : "#a39a8c"} strokeWidth={startRoom === 'RECEPTION' ? "3" : "2"} className="transition-all duration-300 group-hover:brightness-110" />
              <text x="600" y="715" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#333" className="pointer-events-none">RECEPTION DESK</text>
            </g>
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

          {/* Blockages */}
          <g>
            {/* Top Right Corridor Fire */}
            <rect x="845" y="180" width="30" height="60" fill="url(#diagonalHatch)" stroke="#dc2626" strokeWidth="2" />
            <rect x="845" y="180" width="30" height="60" fill="rgba(220, 38, 38, 0.1)" />
            <text x="860" y="210" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#dc2626">FIRE</text>
            <text x="860" y="222" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#dc2626">BLOCK</text>

            {/* Bottom Left Obstruction */}
            <rect x="290" y="600" width="20" height="60" fill="url(#diagonalHatch)" stroke="#dc2626" strokeWidth="2" />
            <rect x="290" y="600" width="20" height="60" fill="rgba(220, 38, 38, 0.1)" />
            <path d="M 292 605 L 308 655 M 308 605 L 292 655" stroke="#dc2626" strokeWidth="2" />
          </g>

          {/* Corridor Hollow Area overlay (shows corridor shape, not actually filled) */}
          <path 
            d="M 160 180 h 880 v 480 h -880 Z M 220 240 h 760 v 360 h -760 Z" 
            fill="rgba(0,0,0,0.03)" fillRule="evenodd" className="pointer-events-none" 
          />

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
      <div className="absolute bottom-3 right-3 flex flex-col gap-3 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-sm p-3 shadow-xl border border-slate-200 rounded-sm w-52">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest mb-2 border-b pb-1.5">Calculation Results</h3>
          <div className="flex items-start gap-2 mb-2.5">
            <div className="bg-emerald-600 p-1 rounded">
              <Footprints className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Nearest Exit</p>
              <p className="text-[10px] leading-tight text-emerald-700 font-bold">{activeExitId === 'EXIT_A' ? 'Emergency Exit A (Left)' : activeExitId === 'EXIT_B' ? 'Emergency Exit B (Right)' : 'Select Room'}</p>
            </div>
          </div>
          <div className="border-t pt-2 flex justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-800">Distance</p>
              <p className="text-xs text-slate-600">{distMeters} m</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-800">Est. Time</p>
              <p className="text-xs text-slate-600">~ {timeSecs} sec</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Legend Left */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm p-3 shadow-xl border border-slate-200 rounded-sm w-40 pointer-events-none">
        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest mb-2 border-b pb-1.5 text-center">Legend</h3>
        <div className="space-y-2.5">
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
          <div className="flex items-center gap-3">
            <div className="w-6 h-4 bg-red-100 border border-red-500 flex items-center justify-center overflow-hidden">
              <svg width="24" height="16" className="opacity-50">
                <pattern id="diag" width="4" height="4" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="4" stroke="#dc2626" strokeWidth="1" />
                </pattern>
                <rect width="24" height="16" fill="url(#diag)" />
              </svg>
            </div>
            <span className="text-xs font-medium text-slate-700">Blocked / Hazard</span>
          </div>
        </div>
      </div>

    </div>
  );
}
