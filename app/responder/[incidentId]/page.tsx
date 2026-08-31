import React from "react";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Flame, Navigation, AlertOctagon, HeartPulse, PersonStanding, MoveRight, Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Tactical Responder View — ResQRoute",
  description: "First responder emergency tactical map and extraction priority queue.",
};

export default async function ResponderView({ params }: { params: Promise<{ incidentId: string }> }) {
  const { incidentId } = await params;
  
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: { originRoom: true }
  });

  if (!incident) return <div>Incident Not Found</div>;

  const originRoom = incident.originRoom.number;
  
  // Real priority targets and floor queries in parallel
  const [allGuests, distress, floorRooms] = await Promise.all([
    prisma.guest.findMany({
      include: { room: true }
    }),
    prisma.distressMessage.findMany({
      where: { incidentId },
      include: { room: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.room.findMany({
      where: { floor: incident.originRoom.floor }
    })
  ]);

  const priorityEvacs = allGuests.reduce<{
    id: string;
    name: string;
    room: string;
    floor: number;
    x: number;
    y: number;
    status: string;
    reason: string;
    flag: string;
  }[]>((acc, g) => {
    if (g.status !== "safe" && (g.accessibilityFlag || g.room.floor === incident.originRoom.floor)) {
      acc.push({
        id: g.id,
        name: g.name,
        room: g.room.number,
        floor: g.room.floor,
        x: g.room.x,
        y: g.room.y,
        status: g.status,
        reason: g.accessibilityFlag ? "Accessibility Flag" : "Danger Proximity",
        flag: g.accessibilityFlag ? "mobility" : "fire-exposure"
      });
    }
    return acc;
  }, []);

  const floorPriorityEvacs = priorityEvacs.filter(g => g.floor === incident.originRoom.floor);
  const totalSafe = allGuests.filter(g => g.status === 'safe').length;
  const dangerZoneCount = priorityEvacs.length;

  return (
    <div className="min-h-screen bg-slate-50 text-zinc-900 flex flex-col font-mono selection:bg-blue-100 relative overflow-hidden">

      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[800px] h-[400px] bg-red-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 blur-[150px] pointer-events-none" />

      {/* Tactical Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-zinc-200 p-4 flex justify-between items-center z-10 sticky top-0 shadow-sm">

        <div className="flex items-center gap-5 z-10 w-full">
          <div className="bg-red-600 px-4 py-2 rounded font-bold tracking-widest text-sm text-white flex items-center gap-3 shadow-md shadow-red-500/30 border border-red-500">
            <Flame className="w-5 h-5 animate-pulse" />
            FIRE DETECTED
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-3">
              TACTICAL OVERVIEW <MoveRight className="w-4 h-4 text-blue-600" /> INCIDENT {incidentId.substring(0,6).toUpperCase()}
            </h1>
            <p className="text-sm text-blue-600 mt-0.5 tracking-wider">Grand Harbor Hotel // Origin: Room {originRoom}</p>
          </div>

          <div className="flex gap-8 items-center bg-white px-6 py-2 rounded-lg border border-zinc-200 shadow-sm">
            <div className="text-right">
              <p className="text-[10px] text-blue-600 uppercase tracking-widest mb-1 font-semibold">Danger Zone</p>
              <p className="text-3xl text-red-600 font-bold leading-none">{dangerZoneCount}</p>
            </div>
            <div className="w-px h-10 bg-zinc-200"></div>
            <div className="text-left">
              <p className="text-[10px] text-blue-600 uppercase tracking-widest mb-1 font-semibold">Cleared Safe</p>
              <p className="text-3xl text-emerald-600 font-bold leading-none">{totalSafe}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Tablet Layout */}
      <main className="flex-1 p-5 grid grid-cols-12 gap-5 h-[calc(100vh-5rem)] z-10">

        {/* Left Column: Priority Targets & Live Feed */}
        <div className="col-span-4 flex flex-col gap-5 overflow-hidden h-full">

          {/* High Priority List */}
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm flex flex-col shrink-0">
            <div className="p-3 bg-red-50 border-b border-red-200 flex items-center gap-3">
              <AlertOctagon className="w-5 h-5 text-red-600 animate-pulse" />
              <h2 className="text-sm uppercase tracking-widest text-red-600 font-bold">Priority Extractions</h2>
            </div>
            <ul className="divide-y divide-zinc-100">
              {priorityEvacs.map(target => (
                <li key={target.id} className="p-4 bg-white hover:bg-red-50/60 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-mono text-xs rounded-sm">RM {target.room}</Badge>
                      <span className="font-bold text-zinc-900">{target.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">FLR {target.floor}</span>
                  </div>
                  <p className="text-xs text-zinc-500 flex items-center gap-2">
                    {target.flag === 'mobility' ? <PersonStanding className="w-4 h-4 text-orange-600" /> : <Flame className="w-4 h-4 text-orange-600" />}
                    {target.reason}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Distress Feed */}
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden flex-1 flex flex-col shadow-sm">
            <div className="p-3 bg-blue-50 border-b border-blue-200 flex items-center gap-3 shrink-0">
              <HeartPulse className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm uppercase tracking-widest text-blue-700 font-bold">Live Distress Comms</h2>
            </div>
            <div className="p-4 overflow-y-auto space-y-4">
              {distress.length === 0 ? (
                <div className="text-center text-zinc-400 text-xs py-10">No active comms</div>
              ) : distress.map(d => (
                <div key={d.id} className="bg-slate-50 border border-zinc-200 border-l-2 border-l-red-500 p-3 rounded-r-lg text-sm relative">
                  <div className="text-[10px] text-zinc-500 mb-1.5 font-mono tracking-wider">RM {d.room.number}</div>
                  <p className="text-zinc-700">&ldquo;{d.text}&rdquo;</p>
                  <div className="absolute top-3 right-3 text-[10px] text-red-600 font-bold uppercase tracking-widest">{d.category}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Blueprint View */}
        <div className="col-span-8 flex flex-col">
          <div className="bg-white border border-zinc-200 rounded-xl flex-1 h-full overflow-hidden flex flex-col relative shadow-sm">

            {/* Top Toolbar */}
            <div className="p-3 border-b border-zinc-200 flex items-center justify-between shrink-0 bg-white/90 backdrop-blur-md absolute w-full top-0 z-20">
              <h2 className="text-sm uppercase tracking-widest text-blue-700 font-bold flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                Floor 4 Map Grid
              </h2>
              <div className="flex gap-2">
                 {['Floor 1', 'Floor 2', 'Floor 3'].map(f => (
                   <button key={f} type="button" className="px-3 py-1 text-xs font-bold text-zinc-600 bg-slate-50 hover:bg-slate-100 border border-zinc-200 rounded transition-colors uppercase tracking-wider">{f}</button>
                 ))}
                 <button type="button" className="px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded uppercase tracking-wider shadow-sm shadow-blue-500/30">Floor 4</button>
              </div>
            </div>

            {/* Tactical Grid Body */}
            <div className="flex-1 flex items-center justify-center bg-slate-50 mt-12 pb-4 relative">

              {/* Technical Grid Background */}
              <div className="absolute inset-0"
                   style={{
                     backgroundImage: `
                       linear-gradient(rgba(37, 99, 235, 0.08) 1px, transparent 1px),
                       linear-gradient(90deg, rgba(37, 99, 235, 0.08) 1px, transparent 1px),
                       linear-gradient(rgba(37, 99, 235, 0.04) 1px, transparent 1px),
                       linear-gradient(90deg, rgba(37, 99, 235, 0.04) 1px, transparent 1px)
                     `,
                     backgroundSize: '100px 100px, 100px 100px, 20px 20px, 20px 20px'
                   }}
              />

              <div className="relative w-full max-w-3xl aspect-[2/1] border-2 border-blue-200 bg-blue-50/50 rounded-lg overflow-hidden z-10 shadow-[0_0_50px_rgba(59,130,246,0.08)] flex items-center justify-center">

                 {/* Blueprint Graphic */}
                 <svg width="80%" height="80%" viewBox="0 0 400 200" fill="none" stroke="#93c5fd" strokeWidth="2">
                   {/* Dynamic Map Nodes */}
                   {floorRooms.map(r => (
                     <g key={r.id} className={`translate-x-[${r.x * 400}px] translate-y-[${r.y * 200}px]`}>
                       {/* Room Border if needed */}
                     </g>
                   ))}

                   {/* Origin Ping */}
                   <g style={{ transform: `translate(${incident.originRoom.x * 400}px, ${incident.originRoom.y * 200}px)` }}>
                     <circle cx="0" cy="0" r="12" fill="rgba(239,68,68,0.2)" className="animate-ping" />
                     <circle cx="0" cy="0" r="6" fill="#dc2626" />
                     <text x="12" y="4" fontSize="12" fill="#dc2626" stroke="none" className="font-sans font-bold drop-shadow-md">{incident.originRoom.number}</text>
                   </g>

                   {/* Priority Guests */}
                   {floorPriorityEvacs.map(v => (
                     <g key={v.id} style={{ transform: `translate(${v.x * 400}px, ${v.y * 200}px)` }}>
                       <circle cx="-10" cy="-10" r="4" fill={v.status === 'trapped' ? "#ea580c" : "#ca8a04"} />
                       <circle cx="-10" cy="-10" r="7" stroke={v.status === 'trapped' ? "#ea580c" : "#ca8a04"} strokeDasharray="2 2" className="animate-spin-slow" />
                       <text x="0" y="-8" fontSize="9" fill={v.status === 'trapped' ? "#ea580c" : "#ca8a04"} stroke="none" className="font-sans font-bold">{v.room}</text>
                     </g>
                   ))}
                 </svg>

                 {/* Corner Accents */}
                 <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500" />
                 <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-500" />
                 <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-500" />
                 <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500" />
              </div>
            </div>

            <div className="absolute bottom-0 right-0 bg-blue-50 px-3 py-1 text-[10px] text-blue-700 font-bold border-t border-l border-blue-200 rounded-tl">
              <Eye className="w-3 h-3 inline pb-0.5 mr-1" />
              LIVE TELEMETRY
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}
