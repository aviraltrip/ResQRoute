"use client";

import React, { useMemo, useEffect, useState } from 'react';
import { RouteStep } from '@/lib/routing';
import { Room } from '@prisma/client';
import { Flame, ArrowRight, ShieldCheck, Footprints } from 'lucide-react';

interface EvacuationMapProps {
  route: RouteStep[];
  floorRooms: Room[];
  currentFloor: number;
}

// Coordinates for the rooms on the detailed map based on their last 2 digits (e.g., 01 -> 301)
// We map the DB's simplistic 5 rooms to the first 5 rooms on the top row to show the concept,
// or we can map them dynamically.
const MAP_WIDTH = 1200;
const MAP_HEIGHT = 800;

// Top corridor: y = 200, x from 200 to 1000
const CORRIDOR_Y = 220;

export default function EvacuationMap({ route, floorRooms, currentFloor }: EvacuationMapProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Map DB room numbers to our detailed SVG layout
  const getRoomPosition = (roomNumber: string) => {
    // If it's an exit
    if (roomNumber === "LOBBY") return { x: 200, y: 150 }; // Map lobby exit to top-left stairwell
    if (roomNumber === "REAR-EXIT") return { x: 1000, y: 150 }; // Map rear exit to top-right stairwell

    // For standard rooms, use the last two digits to place them on the top row
    const numMatch = roomNumber.match(/\d{2}$/);
    if (numMatch) {
      const idx = parseInt(numMatch[0], 10);
      // Top row rooms (301 to 320)
      if (idx >= 1 && idx <= 5) {
        // Space them out along the top corridor
        return { x: 200 + (idx - 1) * 80, y: 140 };
      }
    }
    // Fallback based on DB x/y if it doesn't match our hardcoded demo rooms
    const dbRoom = floorRooms.find(r => r.number === roomNumber);
    if (dbRoom) {
      return { x: 200 + dbRoom.x * 600, y: 220 };
    }
    
    return { x: 600, y: 220 }; // default center
  };

  const getCorridorPoint = (roomNumber: string) => {
    const pos = getRoomPosition(roomNumber);
    // Move point from room center down to the corridor
    if (roomNumber.includes("EXIT")) return pos;
    return { x: pos.x, y: CORRIDOR_Y };
  };

  const routePoints = useMemo(() => {
    if (!route || route.length === 0) return [];
    
    const points: {x: number, y: number}[] = [];
    
    // Add start room point
    points.push(getRoomPosition(route[0].roomNumber));
    
    // Connect through the corridor
    route.forEach((step, i) => {
      if (i > 0) {
        points.push(getCorridorPoint(step.roomNumber));
      }
    });

    // Finally enter the exit room
    const lastStep = route[route.length - 1];
    points.push(getRoomPosition(lastStep.roomNumber));

    return points;
  }, [route, floorRooms]);

  const pathD = useMemo(() => {
    if (routePoints.length === 0) return '';
    return routePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [routePoints]);

  if (!mounted) return null;

  return (
    <div className="w-full h-full bg-[#f4f1ea] text-slate-800 font-sans relative overflow-hidden flex flex-col items-center justify-center">
      
      {/* Header matching the image */}
      <div className="absolute top-4 left-4 flex flex-col items-center bg-white p-4 shadow-xl border border-slate-200 z-10 w-64 rounded-sm">
        <h1 className="font-serif text-xl font-bold tracking-widest text-[#8b7355] uppercase text-center mb-1">
          Grand Horizon Hotel
        </h1>
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-4">Your Safety, Our Priority</p>
        
        <div className="w-full h-px bg-slate-200 mb-4" />
        
        <h2 className="text-2xl font-bold text-[#1a4a38] uppercase">Floor {currentFloor}</h2>
        <p className="text-sm font-semibold tracking-wider mb-4">EVACUATION MAP</p>
        
        <div className="w-full border-2 border-red-500 rounded p-2 text-center bg-red-50">
          <p className="text-red-600 font-bold uppercase text-xs">You Are Here</p>
          <p className="font-bold text-lg">Room {route[0]?.roomNumber || `312`}</p>
        </div>
      </div>

      <div className="w-full h-full max-w-full overflow-auto relative">
        <svg 
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} 
          className="w-full h-full min-w-[1000px] object-contain drop-shadow-2xl"
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
          </defs>

          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Central Core Area */}
          <g filter="url(#shadow)">
            <rect x="350" y="300" width="500" height="150" fill="#e2dcd0" stroke="#a39a8c" strokeWidth="2" />
            {/* Elevators */}
            <rect x="500" y="300" width="200" height="60" fill="#d1ccc0" stroke="#a39a8c" strokeWidth="2" />
            <text x="600" y="340" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#555">ELEVATORS</text>
            
            {/* Central Stairs */}
            <rect x="350" y="300" width="80" height="150" fill="#c4bfb3" stroke="#a39a8c" strokeWidth="2" />
            <text x="390" y="380" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#555" transform="rotate(-90 390,380)">STAIRS</text>
            <rect x="770" y="300" width="80" height="150" fill="#c4bfb3" stroke="#a39a8c" strokeWidth="2" />
            <text x="810" y="380" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#555" transform="rotate(-90 810,380)">STAIRS</text>

            {/* Washrooms */}
            <rect x="430" y="360" width="140" height="90" fill="#a4bbf0" stroke="#a39a8c" strokeWidth="2" />
            <text x="500" y="410" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#333">WASHROOMS</text>
          </g>

          {/* Top Rooms 301 - 320 */}
          <g filter="url(#shadow)">
            {Array.from({length: 15}).map((_, i) => {
              const x = 160 + (i * 55);
              const isStart = route[0]?.roomNumber === `${currentFloor}0${i+1}`;
              return (
                <g key={`top-${i}`}>
                  <rect x={x} y="60" width="55" height="100" fill={isStart ? "#fee2e2" : "#fcf8f2"} stroke="#a39a8c" strokeWidth="2" />
                  <text x={x + 27.5} y="115" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#333">
                    {301 + i}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Left Rooms 321 - 325 */}
          <g filter="url(#shadow)">
            {Array.from({length: 5}).map((_, i) => (
              <g key={`left-${i}`}>
                <rect x="60" y="240 + (i * 60)" width="100" height="60" fill="#fcf8f2" stroke="#a39a8c" strokeWidth="2" />
                <text x="110" y={275 + (i * 60)} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#333">
                  {321 + i}
                </text>
              </g>
            ))}
          </g>

          {/* Emergency Exit Stairwells */}
          <g filter="url(#shadow)">
            {/* Exit A (Left) */}
            <rect x="60" y="60" width="100" height="100" fill="#d1e7dd" stroke="#0f5132" strokeWidth="3" />
            <text x="110" y="105" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#0f5132">EXIT A</text>
            <text x="110" y="125" textAnchor="middle" fontSize="10" fill="#0f5132">Stairwell</text>

            {/* Exit B (Right) */}
            <rect x="985" y="60" width="100" height="100" fill="#d1e7dd" stroke="#0f5132" strokeWidth="3" />
            <text x="1035" y="105" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#0f5132">EXIT B</text>
            <text x="1035" y="125" textAnchor="middle" fontSize="10" fill="#0f5132">Stairwell</text>
          </g>

          {/* Corridor Background (visually hollowed out area) */}
          <path d="M 160 160 L 985 160 L 985 240 L 160 240 Z" fill="rgba(0,0,0,0.03)" />

          {/* Hazard Blockage (Fire/Smoke) */}
          {route.length === 0 && (
            <g className="animate-pulse">
              <rect x="600" y="160" width="100" height="80" fill="url(#diagonalHatch)" stroke="#dc2626" strokeWidth="3" />
              <rect x="600" y="160" width="100" height="80" fill="rgba(220, 38, 38, 0.2)" />
              <text x="650" y="195" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#dc2626">FIRE / SMOKE</text>
              <text x="650" y="210" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#dc2626">BLOCKAGE</text>
              <line x1="610" y1="170" x2="690" y2="230" stroke="#dc2626" strokeWidth="4" />
              <line x1="690" y1="170" x2="610" y2="230" stroke="#dc2626" strokeWidth="4" />
            </g>
          )}

          {/* Hatch Pattern for Hazard */}
          <defs>
            <pattern id="diagonalHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="10" stroke="#dc2626" strokeWidth="2" opacity="0.3"/>
            </pattern>
          </defs>

          {/* Evacuation Route path */}
          {pathD && (
            <>
              {/* Outer stroke for visibility */}
              <path
                d={pathD}
                fill="none"
                stroke="#ffffff"
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.8"
              />
              {/* Animated dashed path */}
              <path
                d={pathD}
                fill="none"
                stroke="#10b981"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="15, 15"
                className="animate-[dash_1.5s_linear_infinite]"
                filter="url(#glowRoute)"
              />
            </>
          )}

          {/* Start Point Marker (You Are Here) */}
          {routePoints[0] && (
            <g transform={`translate(${routePoints[0].x}, ${routePoints[0].y - 20})`} filter="url(#shadow)">
              <path d="M 0 0 C 15 -15 15 -35 0 -45 C -15 -35 -15 -15 0 0 Z" fill="#ef4444" />
              <circle cx="0" cy="-25" r="6" fill="#ffffff" />
              <text x="0" y="-55" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#ef4444">YOU ARE HERE</text>
            </g>
          )}

          {/* End Point Marker (Exit) */}
          {routePoints.length > 0 && routePoints[routePoints.length - 1] && (
            <g transform={`translate(${routePoints[routePoints.length - 1].x}, ${routePoints[routePoints.length - 1].y})`}>
              <circle cx="0" cy="0" r="16" fill="#10b981" className="animate-pulse" filter="url(#glowRoute)" />
              <Footprints className="w-6 h-6 text-white" x="-12" y="-12" />
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
      <div className="absolute bottom-6 right-6 flex flex-col gap-4">
        {/* Key Info */}
        <div className="bg-white p-4 shadow-xl border border-slate-200 rounded-sm w-64">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest mb-3 border-b pb-2">Key Information</h3>
          <div className="flex items-start gap-3 mb-4">
            <div className="bg-emerald-600 p-1.5 rounded">
              <Footprints className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Nearest Exit</p>
              <p className="text-xs text-slate-600">Emergency Exit A</p>
            </div>
          </div>
          <div className="border-t pt-3">
            <p className="text-xs font-bold text-slate-800">Est. Time to Exit (Normal)</p>
            <p className="text-sm text-slate-600">~ 45 seconds</p>
          </div>
        </div>
      </div>
      
      {/* Legend Left */}
      <div className="absolute bottom-6 left-4 bg-white p-4 shadow-xl border border-slate-200 rounded-sm w-48">
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
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 flex items-center justify-center bg-red-100 border border-red-500 text-red-600 font-bold text-[10px]">X</div>
            <span className="text-xs font-medium text-slate-700">Blocked / Hazard</span>
          </div>
        </div>
      </div>

    </div>
  );
}
