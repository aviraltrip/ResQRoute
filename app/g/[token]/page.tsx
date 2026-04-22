import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Map, ShieldCheck, AlertTriangle, ArrowRight, ActivitySquare, AlertOctagon } from "lucide-react";
import GuestActionButtons from "@/components/GuestActionButtons";
import { prisma } from "@/lib/prisma";
import { computeEvacuationRoute } from "@/lib/routing";

export default async function GuestView({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const guest = await prisma.guest.findUnique({
    where: { token },
    include: { room: true }
  });

  if (!guest) return <div>Invalid Session</div>;

  const incident = await prisma.incident.findFirst({
    orderBy: { startedAt: 'desc' }
  });

  const hazardRooms = incident ? [incident.originRoomId] : [];
  const route = await computeEvacuationRoute(guest.roomId, hazardRooms);
  
  return (
    <div className="min-h-screen bg-slate-950 font-sans flex items-center justify-center p-0 sm:p-6">
      
      {/* Mobile Constraint Wrapper */}
      <div className="w-full h-full sm:h-auto sm:max-w-[400px] bg-neutral-950 sm:rounded-[40px] sm:border-[8px] border-slate-800 shadow-2xl shadow-red-900/20 overflow-hidden relative flex flex-col">
        
        {/* Background Ambient Glow */}
        <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[40%] bg-gradient-to-b from-red-600/20 to-transparent blur-3xl pointer-events-none" />

        {/* Header */}
        <header className="px-6 pt-10 pb-6 bg-gradient-to-b from-red-950/80 to-transparent z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-red-500/20 p-2 rounded-xl animate-pulse">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white uppercase">Emergency</h1>
              <p className="text-red-400 font-medium text-sm">Evacuate Immediately</p>
            </div>
          </div>
        </header>

        {/* Main Content Scrollable */}
        <main className="flex-1 overflow-y-auto px-5 pb-8 z-10 flex flex-col gap-6">
          
          {/* Action Buttons */}
          <GuestActionButtons token={token} />

          {/* Dynamic Route Card */}
          <section className="bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-2">
                <Map className="w-5 h-5 text-blue-400" />
                <h2 className="font-semibold text-white">Live Safe Route</h2>
              </div>
              <div className="px-2 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest rounded-full">
                Updating
              </div>
            </div>
            
            <div className="p-5">
              <div className="space-y-0 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-500/50 before:to-transparent">
                {route.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-4 text-center">
                    <AlertOctagon className="w-8 h-8 text-red-500 mb-2" />
                    <p className="text-white font-bold">No Safe Route Available</p>
                    <p className="text-sm text-neutral-400 mt-1">Shelter in place. Responders are notified.</p>
                  </div>
                ) : route.map((step, idx) => (
                  <div key={idx} className="relative flex items-center mb-6 last:mb-0 group">
                    {/* Node Circle */}
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 shrink-0 z-10 transition-colors ${
                      idx === 0 
                        ? "bg-blue-500 border-blue-900 shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                        : "bg-neutral-900 border-neutral-800"
                    }`}>
                      {idx === 0 ? <ArrowRight className="w-4 h-4 text-white" /> : <div className="w-2 h-2 rounded-full bg-neutral-600" />}
                    </div>
                    {/* Label */}
                    <div className={`ml-4 text-sm font-medium ${
                      idx === 0 ? "text-white text-base font-bold" : "text-neutral-400"
                    }`}>
                      {step.roomNumber.includes("EXIT") ? "Exit" : `Room / Hallway ${step.roomNumber}`}
                      {idx === 0 && <p className="text-blue-400 text-xs font-normal mt-0.5 tracking-wider uppercase">Evacuate From Here</p>}
                      {idx === route.length - 1 && <p className="text-emerald-400 text-xs font-bold mt-0.5 uppercase">Rendezvous Point</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Distress Intercom Segment */}
          <section className="bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-5 text-center flex flex-col items-center">
            <h3 className="font-semibold text-white mb-1">Distress Intercom</h3>
            <p className="text-xs text-neutral-400 mb-5">Speak directly to responders. AI summarizes your message.</p>
            
            <div className="relative w-24 h-24 mb-4 flex items-center justify-center">
              <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
              <button className="relative w-16 h-16 bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] text-white focus:outline-none focus:scale-95 transition-all">
                <Mic className="w-8 h-8" />
              </button>
            </div>

            <div className="w-full bg-black/50 p-3 rounded-xl border border-white/5 text-left">
              <p className="text-sm text-neutral-300 italic font-medium leading-relaxed">
                &ldquo;The hallway is currently blocked by fallen debris, please send help!&rdquo;
              </p>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
