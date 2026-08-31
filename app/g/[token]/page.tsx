import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Map, ShieldCheck, AlertTriangle, ArrowRight, ActivitySquare, AlertOctagon, LogOut } from "lucide-react";
import GuestActionButtons from "@/components/GuestActionButtons";
import VoiceDistress from "@/components/VoiceDistress";
import { signOutGuest } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { computeEvacuationRoute } from "@/lib/routing";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import EvacuationMap from "@/components/EvacuationMap";

export const metadata: Metadata = {
  title: "Live Evacuation Dashboard — ResQRoute",
  description: "Real-time emergency status, dynamic evacuation routes, and distress communication.",
};

export default async function GuestView({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [guest, incident] = await Promise.all([
    prisma.guest.findUnique({
      where: { token },
      include: { room: true }
    }),
    prisma.incident.findFirst({
      orderBy: { startedAt: 'desc' }
    })
  ]);

  if (!guest) return <div>Invalid Session</div>;

  const hazardRooms = incident ? [incident.originRoomId] : [];
  const [route, floorRooms] = await Promise.all([
    computeEvacuationRoute(guest.roomId, hazardRooms),
    prisma.room.findMany({
      where: { floor: guest.room.floor }
    })
  ]);
  
  return (
    <div className="min-h-screen bg-slate-50 font-sans flex items-center justify-center p-0 sm:p-6">

      {/* Mobile Constraint Wrapper */}
      <div className="w-full h-full sm:h-auto sm:max-w-[400px] bg-white sm:rounded-[40px] sm:border-8 border-zinc-200 shadow-2xl shadow-red-500/10 overflow-hidden relative flex flex-col">

        {/* Background Ambient Glow */}
        <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[40%] bg-gradient-to-b from-red-500/10 to-transparent blur-3xl pointer-events-none" />

        {/* Header */}
        <header className="px-6 pt-10 pb-6 bg-gradient-to-b from-red-50 to-transparent z-10">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="bg-white border border-red-200 p-2 rounded-xl shadow-sm animate-pulse">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-zinc-900 uppercase">Emergency</h1>
                <p className="text-red-600 font-medium text-sm">Evacuate Immediately</p>
              </div>
            </div>
            <form action={signOutGuest}>
              <button
                type="submit"
                title="Sign out (check out)"
                className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 hover:text-zinc-900 flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-zinc-100 transition-colors"
              >
                <LogOut className="w-3 h-3" />
                Sign out
              </button>
            </form>
          </div>
        </header>

        {/* Main Content Scrollable */}
        <main className="flex-1 overflow-y-auto px-5 pb-8 z-10 flex flex-col gap-6">
          
          {/* Action Buttons */}
          <GuestActionButtons token={token} />

          {/* Dynamic Route Card */}
          <section className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Map className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-zinc-900">Live Safe Route</h2>
              </div>
              <Dialog>
                <DialogTrigger
                  render={
                    <Button variant="outline" size="sm" className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:text-blue-700 h-7 text-xs px-3" />
                  }
                >
                  View Evac Plan
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-[800px] h-[80vh] p-0 bg-white border-zinc-200 overflow-hidden flex flex-col">
                  <div className="sr-only">
                    <DialogTitle>Nearest Evacuation Plan</DialogTitle>
                    <DialogDescription>Interactive map showing the nearest evacuation route.</DialogDescription>
                  </div>
                  <EvacuationMap route={route} floorRooms={floorRooms} currentFloor={guest.room.floor} />
                </DialogContent>
              </Dialog>
            </div>

            <div className="p-5">
              <div className="space-y-0 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-500/60 before:to-transparent">
                {route.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-4 text-center">
                    <AlertOctagon className="w-8 h-8 text-red-600 mb-2" />
                    <p className="text-zinc-900 font-bold">No Safe Route Available</p>
                    <p className="text-sm text-zinc-500 mt-1">Shelter in place. Responders are notified.</p>
                  </div>
                ) : route.map((step, idx) => (
                  <div key={`${step.roomId}-${step.floor}-${idx}`} className="relative flex items-center mb-6 last:mb-0 group">
                    {/* Node Circle */}
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 shrink-0 z-10 transition-colors ${
                      idx === 0
                        ? "bg-blue-500 border-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.35)]"
                        : "bg-white border-zinc-200"
                    }`}>
                      {idx === 0 ? <ArrowRight className="w-4 h-4 text-white" /> : <div className="w-2 h-2 rounded-full bg-zinc-400" />}
                    </div>
                    {/* Label */}
                    <div className={`ml-4 text-sm font-medium ${
                      idx === 0 ? "text-zinc-900 text-base font-bold" : "text-zinc-500"
                    }`}>
                      {step.roomNumber.includes("EXIT") ? "Exit" : `Room / Hallway ${step.roomNumber}`}
                      {idx === 0 && <p className="text-blue-600 text-xs font-normal mt-0.5 tracking-wider uppercase">Evacuate From Here</p>}
                      {idx === route.length - 1 && <p className="text-emerald-600 text-xs font-bold mt-0.5 uppercase">Rendezvous Point</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Distress Intercom Segment */}
          <VoiceDistress token={token} />

        </main>
      </div>
    </div>
  );
}
