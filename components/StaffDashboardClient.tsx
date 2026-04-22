"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Siren, HelpCircle, Activity, User, Maximize2, ShieldAlert, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Guest, DistressMessage, Room, IncidentType } from "@prisma/client";

type GuestWithRoom = Guest & {
  room?: Room;
};

export default function StaffDashboardClient({ initialGuests, initialMessages, rooms }: { initialGuests: GuestWithRoom[], initialMessages: DistressMessage[], rooms: Room[] }) {
  const [guests, setGuests] = useState<GuestWithRoom[]>(initialGuests);
  const [messages, setMessages] = useState(initialMessages);
  const [loadingAction, setLoadingAction] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState("");

  useEffect(() => {
    // Listen to new guests checking in
    const guestSub = supabase
      .channel('public:Guest')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Guest' }, (payload) => {
        const newGuest = payload.new as GuestWithRoom;
        // Lookup room number from the passed rooms array
        const r = rooms.find(room => room.id === newGuest.roomId);
        if (r) newGuest.room = r;
        setGuests((prev) => [...prev, newGuest]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'Guest' }, (payload) => {
        const updatedGuest = payload.new as GuestWithRoom;
        setGuests((prev) => prev.map(g => g.id === updatedGuest.id ? { ...g, ...updatedGuest } : g));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'Guest' }, (payload) => {
        const removed = payload.old as { id?: string };
        if (removed?.id) {
          setGuests((prev) => prev.filter(g => g.id !== removed.id));
          setMessages((prev) => prev.filter(m => m.guestId !== removed.id));
        }
      })
      .subscribe();

    // Listen to new distress messages
    const distressSub = supabase
      .channel('public:DistressMessage')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'DistressMessage' }, (payload) => {
        const newMsg = payload.new as DistressMessage;
        setMessages((prev) => [newMsg, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(guestSub);
      supabase.removeChannel(distressSub);
    };
  }, []);

  const stats = {
    safe: guests.filter(g => g.status === 'safe').length,
    trapped: guests.filter(g => g.status === 'trapped' || (messages.some(m => m.guestId === g.id) && g.status !== 'safe')).length,
    evacuating: guests.filter(g => g.status === 'evacuating').length,
    checked_in: guests.filter(g => g.status === 'checked_in' && !messages.some(m => m.guestId === g.id)).length,
  };

  const activeMessages = messages.filter(msg => guests.find(g => g.id === msg.guestId)?.status !== 'safe');

  return (
    <div className="min-h-screen bg-slate-50 text-zinc-900 flex flex-col font-sans overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[800px] h-[400px] bg-red-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 blur-[150px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-zinc-200 px-6 py-4 flex justify-between items-center z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500 blur-md opacity-20 animate-pulse" />
            <div className="relative bg-white border border-red-200 p-2.5 rounded-xl shadow-sm">
              <ShieldAlert className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">ResQRoute <span className="font-light text-zinc-500">| Command</span></h1>
            <p className="text-xs text-red-600 font-mono tracking-widest uppercase mt-0.5">Active Incident • Grand Harbor</p>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <Button variant="outline" className="border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 shadow-sm">End Incident</Button>
          
          <div className="flex bg-white border border-red-200 rounded-lg overflow-hidden shadow-sm">
            <select 
              value={selectedRoom} 
              onChange={e => setSelectedRoom(e.target.value)}
              className="bg-transparent text-zinc-900 text-sm px-3 py-2 outline-none border-r border-red-200 cursor-pointer"
            >
              <option className="text-black" value="">Select Room</option>
              {rooms.map(r => <option className="text-black" key={r.id} value={r.id}>{r.number}</option>)}
            </select>
            <Button 
              disabled={loadingAction || !selectedRoom}
              onClick={async () => {
                setLoadingAction(true);
                const { triggerAlarm } = await import("@/app/actions");
                await triggerAlarm(selectedRoom, IncidentType.fire);
                window.location.href = `/helpline?roomId=${selectedRoom}`;
              }}
              className="bg-red-600 hover:bg-red-700 text-white rounded-none border-0 shadow-inner h-full"
            >
              <Siren className="w-4 h-4 mr-2" />
              {loadingAction ? "..." : "Trigger Alarm"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 p-6 grid grid-cols-12 gap-6 z-10 h-[calc(100vh-80px)]">
        
        {/* Left Column: Stats & Guest Grid */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 h-full">
          
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />} value={stats.safe} label="Verified Safe" color="emerald" />
            <StatCard icon={<AlertCircle className="w-6 h-6 text-red-600" />} value={stats.trapped} label="Trapped / Need Help" color="red" />
            <StatCard icon={<Activity className="w-6 h-6 text-blue-600" />} value={stats.evacuating} label="Evacuating Live" color="blue" />
            <StatCard icon={<User className="w-6 h-6 text-slate-500" />} value={stats.checked_in} label="Unresponsive" color="slate" />
          </div>

          {/* Guest Roster / Map Section */}
          <div className="bg-white border border-zinc-200 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
              <h2 className="text-base font-semibold text-zinc-900">Live Realtime Roster ({guests.length})</h2>
              <Maximize2 className="w-4 h-4 text-zinc-400 cursor-pointer hover:text-zinc-600 transition-colors" />
            </div>
            <div className="flex-1 relative p-6 overflow-y-auto bg-slate-50/30">
               <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
                 {guests.map((guest) => (
                   <div key={guest.id} className="relative bg-white border border-zinc-200 rounded-xl p-4 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500 shadow-sm">
                     <button
                       title="Check out / remove from roster"
                       onClick={async () => {
                         if (!confirm(`Remove ${guest.name} from the roster?`)) return;
                         setGuests((prev) => prev.filter(g => g.id !== guest.id));
                         setMessages((prev) => prev.filter(m => m.guestId !== guest.id));
                         const { removeGuest } = await import('@/app/actions');
                         try {
                           await removeGuest(guest.id);
                         } catch (err) {
                           console.error('removeGuest failed', err);
                         }
                       }}
                       className="absolute top-2 right-2 p-1 rounded-full text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                     >
                       <X className="w-3.5 h-3.5" />
                     </button>
                     <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                       <User className="w-5 h-5 text-slate-500" />
                     </div>
                     <p className="text-sm font-bold text-zinc-900">{guest.name}</p>
                     <p className="text-xs text-slate-500 mb-2">Room {guest.room?.number || 'Unknown'}</p>
                     <Badge variant="outline" className={`border ${
                        guest.status === 'safe' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : guest.status === 'checked_in' 
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-red-50 text-red-700 border-red-200 font-bold'
                     }`}>
                       {guest.status === 'checked_in' ? 'Checked In' : guest.status === 'safe' ? 'Safe' : 'Unsafe / Danger'}
                     </Badge>
                     {guest.status !== 'safe' && (
                       <Button 
                         variant="outline" 
                         size="sm" 
                         className="mt-3 w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 hover:border-emerald-300 h-auto py-1 shadow-sm transition-colors"
                         onClick={async () => {
                           const { markGuestSafe } = await import('@/app/actions');
                           await markGuestSafe(guest.token);
                         }}
                       >
                         Confirm Safe
                       </Button>
                     )}
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>

        {/* Right Column: Triage Feed */}
        <div className="col-span-12 lg:col-span-4 h-full flex flex-col">
          <div className="bg-white border border-zinc-200 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between shadow-sm">
              <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-orange-500" />
                Live Triage Alerts
              </h2>
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 border border-orange-200 font-mono animate-pulse">
                {activeMessages.length} Active
              </Badge>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
              {activeMessages.length === 0 && (
                <div className="h-full flex items-center justify-center text-center text-zinc-400 text-sm">
                  Waiting for live distress signals... No casualties reported.
                </div>
              )}
              {activeMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  onClick={() => window.location.href = `/helpline?roomId=${msg.roomId}`}
                  className={`p-4 rounded-xl border animate-in slide-in-from-right fade-in bg-red-50 border-red-100 shadow-sm transition-all hover:shadow-md cursor-pointer group`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold tracking-wider bg-red-100 text-red-700 border border-red-200">
                        Room {rooms.find(r => r.id === msg.roomId)?.number || 'Unknown'}
                      </div>
                      <span className="font-medium text-sm text-zinc-800 uppercase">
                        {guests.find(g => g.id === msg.guestId)?.name || 'Unknown Guest'}
                      </span>
                    </div>
                    <Badge className="bg-red-600 hover:bg-red-700 text-white border-0 shadow-sm">
                      Sev {msg.severity}
                    </Badge>
                  </div>
                  <p className="text-zinc-900 font-bold text-sm leading-relaxed mb-2">&ldquo;{msg.summary || msg.text}&rdquo;</p>
                  {msg.summary && msg.text && msg.summary !== msg.text && (
                    <p className="text-[11px] text-zinc-500 italic mb-3 leading-relaxed">Full transcript: {msg.text}</p>
                  )}
                  <div className="flex justify-end">
                    <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">{msg.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode, value: number, label: string, color: string }) {
  const colorMap: Record<string, { bg: string, text: string, border: string, iconBg: string }> = {
    emerald: { bg: "bg-emerald-50/50", text: "text-emerald-900", border: "border-emerald-100", iconBg: "bg-emerald-100" },
    red: { bg: "bg-red-50/50", text: "text-red-900", border: "border-red-100", iconBg: "bg-red-100" },
    blue: { bg: "bg-blue-50/50", text: "text-blue-900", border: "border-blue-100", iconBg: "bg-blue-100" },
    slate: { bg: "bg-slate-50/50", text: "text-slate-900", border: "border-slate-200", iconBg: "bg-slate-100" },
  };
  
  const theme = colorMap[color];
  
  return (
    <div className={`bg-white border ${theme.border} rounded-2xl p-5 flex flex-col shadow-sm relative overflow-hidden group`}>
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${theme.bg} opacity-50 group-hover:scale-150 transition-transform duration-500`} />
      
      <div className="flex justify-between items-start mb-2 relative z-10">
        <div className={`p-2.5 rounded-xl ${theme.iconBg} shadow-sm border border-white`}>
          {icon}
        </div>
        <h3 className={`text-3xl font-black tracking-tighter ${theme.text} transition-all`}>{value}</h3>
      </div>
      <p className="text-[11px] uppercase tracking-[0.1em] text-zinc-500 font-bold mt-auto relative z-10">{label}</p>
    </div>
  );
}
