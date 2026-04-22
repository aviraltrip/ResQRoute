"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Siren, HelpCircle, Activity, User, Maximize2, ShieldAlert } from "lucide-react";
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
    trapped: guests.filter(g => g.status === 'trapped').length + messages.length, // approximation for demo
    evacuating: guests.filter(g => g.status === 'evacuating').length,
    checked_in: guests.filter(g => g.status === 'checked_in').length,
  };

  return (
    <div className="min-h-screen bg-[#0a0a0e] text-slate-100 flex flex-col font-sans overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[800px] h-[400px] bg-red-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-900/5 blur-[150px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="bg-[#0a0a0e]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500 blur-md opacity-50 animate-pulse" />
            <div className="relative bg-[#0a0a0e] border border-red-500/30 p-2.5 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-red-500" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">ResQRoute <span className="font-light text-slate-400">| Command</span></h1>
            <p className="text-xs text-red-400 font-mono tracking-widest uppercase mt-0.5 mt-1">Active Incident • Grand Harbor</p>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <Button variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">End Incident</Button>
          
          <div className="flex bg-red-950/20 border border-red-500/30 rounded-lg overflow-hidden">
            <select 
              value={selectedRoom} 
              onChange={e => setSelectedRoom(e.target.value)}
              className="bg-transparent text-white text-sm px-3 py-2 outline-none border-r border-red-500/30 cursor-pointer"
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
                window.location.href = "/helpline";
              }}
              className="bg-red-600 hover:bg-red-500 text-white rounded-none border-0 shadow-[0_0_20px_rgba(220,38,38,0.4)] h-full"
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
            <StatCard icon={<CheckCircle2 className="w-6 h-6 text-emerald-400" />} value={stats.safe} label="Verified Safe" color="emerald" />
            <StatCard icon={<AlertCircle className="w-6 h-6 text-red-400" />} value={stats.trapped} label="Trapped / Need Help" color="red" />
            <StatCard icon={<Activity className="w-6 h-6 text-blue-400" />} value={stats.evacuating} label="Evacuating Live" color="blue" />
            <StatCard icon={<User className="w-6 h-6 text-slate-400" />} value={stats.checked_in} label="Unresponsive" color="slate" />
          </div>

          {/* Guest Roster / Map Section */}
          <div className="bg-[#111118]/80 backdrop-blur-xl border border-white/5 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h2 className="text-base font-semibold text-white">Live Realtime Roster ({guests.length})</h2>
              <Maximize2 className="w-4 h-4 text-slate-500 cursor-pointer hover:text-white transition-colors" />
            </div>
            <div className="flex-1 relative p-6 overflow-y-auto">
               <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
                 {guests.map((guest) => (
                   <div key={guest.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500 shadow-lg">
                     <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center mb-2">
                       <User className="w-5 h-5 text-slate-400" />
                     </div>
                     <p className="text-sm font-bold text-white">{guest.name}</p>
                     <p className="text-xs text-slate-400 mb-2">Room {guest.room?.number || 'Unknown'}</p>
                     <Badge variant="outline" className={`border-0 ${
                        guest.status === 'safe' 
                          ? 'bg-green-500/20 text-green-400' 
                          : guest.status === 'checked_in' 
                            ? 'bg-slate-500/20 text-slate-300'
                            : 'bg-red-500/20 text-red-500 font-bold'
                     }`}>
                       {guest.status === 'checked_in' ? 'Checked In' : guest.status === 'safe' ? 'Safe' : 'Unsafe / Danger'}
                     </Badge>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>

        {/* Right Column: Triage Feed */}
        <div className="col-span-12 lg:col-span-4 h-full flex flex-col">
          <div className="bg-[#111118]/80 backdrop-blur-xl border border-white/5 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shadow-sm">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-orange-400" />
                Live Triage Alerts
              </h2>
              <Badge variant="secondary" className="bg-orange-500/10 text-orange-400 border border-orange-500/20 font-mono animate-pulse">
                {messages.length} Active
              </Badge>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 && (
                <div className="h-full flex items-center justify-center text-center text-slate-500 text-sm">
                  Waiting for live distress signals... No casualties reported.
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`p-4 rounded-xl border animate-in slide-in-from-right fade-in bg-red-950/20 border-red-900/30 shadow-[0_0_15px_rgba(153,27,27,0.1)] transition-colors cursor-pointer group`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold tracking-wider bg-red-500/20 text-red-400">
                        {msg.guestId.substring(0,6)}
                      </div>
                      <span className="font-medium text-sm text-slate-200 uppercase">Emergency Protocol</span>
                    </div>
                    <Badge className="bg-red-500 hover:bg-red-400 text-white border-0 animate-pulse">
                      Sev {msg.severity}
                    </Badge>
                  </div>
                  <p className="text-slate-200 font-bold text-sm leading-relaxed mb-2">&ldquo;{msg.summary || msg.text}&rdquo;</p>
                  {msg.summary && msg.text && msg.summary !== msg.text && (
                    <p className="text-[11px] text-slate-500 italic mb-3 leading-relaxed">Full transcript: {msg.text}</p>
                  )}
                  <div className="flex justify-end">
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">{msg.category}</span>
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
  const bgGradients: Record<string, string> = {
    emerald: "from-emerald-500/10 to-transparent border-emerald-500/20",
    red: "from-red-500/10 to-transparent border-red-500/20",
    blue: "from-blue-500/10 to-transparent border-blue-500/20",
    slate: "from-slate-500/10 to-transparent border-slate-500/20",
  };
  
  return (
    <div className={`bg-gradient-to-br ${bgGradients[color]} bg-[#111118]/80 backdrop-blur-xl border rounded-2xl p-5 flex flex-col shadow-lg`}>
      <div className="flex justify-between items-start mb-2">
        <div className={`p-2 rounded-xl bg-${color}-500/10`}>
          {icon}
        </div>
        <h3 className="text-3xl font-bold tracking-tighter text-white transition-all">{value}</h3>
      </div>
      <p className="text-xs uppercase tracking-widest text-slate-400 font-medium mt-auto">{label}</p>
    </div>
  );
}
