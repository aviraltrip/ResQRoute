"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  Siren,
  HelpCircle,
  Activity,
  User,
  ShieldAlert,
  Radio,
  Clock,
  Zap,
  MoreHorizontal,
  Navigation,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Guest, DistressMessage, Room, IncidentType } from "@prisma/client";

type GuestWithRoom = Guest & {
  room?: Room;
};

export default function StaffDashboardClient({
  initialGuests,
  initialMessages,
  rooms,
}: {
  initialGuests: GuestWithRoom[];
  initialMessages: DistressMessage[];
  rooms: Room[];
}) {
  const [guests, setGuests] = useState<GuestWithRoom[]>(initialGuests);
  const [messages, setMessages] = useState(initialMessages);
  const [loadingAction, setLoadingAction] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const guestSub = supabase
      .channel("public:Guest")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Guest" },
        (payload) => {
          const newGuest = payload.new as GuestWithRoom;
          const r = rooms.find((room) => room.id === newGuest.roomId);
          if (r) newGuest.room = r;
          setGuests((prev) => [...prev, newGuest]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "Guest" },
        (payload) => {
          const updatedGuest = payload.new as GuestWithRoom;
          setGuests((prev) =>
            prev.map((g) =>
              g.id === updatedGuest.id ? { ...g, ...updatedGuest } : g
            )
          );
        }
      )
      .subscribe();

    const distressSub = supabase
      .channel("public:DistressMessage")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "DistressMessage" },
        (payload) => {
          const newMsg = payload.new as DistressMessage;
          setMessages((prev) => [newMsg, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(guestSub);
      supabase.removeChannel(distressSub);
    };
  }, []);

  const stats = {
    safe: guests.filter((g) => g.status === "safe").length,
    trapped: guests.filter(
      (g) =>
        g.status === "trapped" ||
        (messages.some((m) => m.guestId === g.id) && g.status !== "safe")
    ).length,
    evacuating: guests.filter((g) => g.status === "evacuating").length,
    checked_in: guests.filter(
      (g) =>
        g.status === "checked_in" && !messages.some((m) => m.guestId === g.id)
    ).length,
  };

  const activeMessages = messages.filter(
    (msg) => guests.find((g) => g.id === msg.guestId)?.status !== "safe"
  );

  return (
    <div className="min-h-screen bg-[#F6F8FD] text-slate-900 flex flex-col font-sans overflow-hidden relative selection:bg-indigo-200 selection:text-indigo-900">
      
      {/* ─── DYNAMIC HACKATHON BACKGROUND ─── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-blue-100/40 mix-blend-multiply filter blur-[100px] animate-pulse" style={{ animationDuration: '15s' }} />
        <div className="absolute top-[10%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-purple-100/40 mix-blend-multiply filter blur-[120px] animate-pulse" style={{ animationDuration: '20s', animationDelay: '5s' }} />
        <div className="absolute -bottom-[20%] left-[20%] w-[80vw] h-[80vw] rounded-full bg-cyan-100/30 mix-blend-multiply filter blur-[100px] animate-pulse" style={{ animationDuration: '18s', animationDelay: '2s' }} />
        
        {/* Subtle dot pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.15]" 
          style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '32px 32px' }} 
        />
      </div>

      {/* ─── Top Navbar (Glassmorphic) ─── */}
      <header className="relative z-20 mx-5 mt-5 mb-2 rounded-2xl bg-white/40 backdrop-blur-3xl border border-white/60 px-6 py-3 flex justify-between items-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        {/* Left: branding */}
        <div className="flex items-center gap-5">
          <div className="relative group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-tr from-red-500 to-orange-400 blur-lg opacity-40 group-hover:opacity-70 transition-opacity duration-500 rounded-xl" />
            <div className="relative bg-gradient-to-tr from-white to-red-50 p-3 rounded-xl border border-white shadow-md flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-red-500" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 leading-none">
              ResQRoute
            </h1>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="flex items-center gap-1.5 bg-red-100/50 text-red-700 px-2 py-0.5 rounded-md border border-red-200/50 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-[10px] font-black tracking-widest uppercase">Command Center</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                Grand Harbor Hotel
              </span>
            </div>
          </div>
        </div>

        {/* Center: live clock & system status */}
        <div className="hidden md:flex items-center gap-4 bg-white/50 backdrop-blur-md border border-white/80 rounded-2xl px-5 py-2.5 shadow-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="font-mono text-base font-bold text-slate-700 tabular-nums min-w-[85px] text-center tracking-tight">
              {isMounted ? currentTime.toLocaleTimeString("en-IN", { hour12: false }) : "--:--:--"}
            </span>
          </div>
          <div className="w-px h-5 bg-slate-200" />
          <div className="flex items-center gap-2 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-600 font-mono tracking-wider">SYSTEM ONLINE</span>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex gap-4 items-center">
          <Button
            variant="outline"
            className="rounded-xl border-slate-200/60 bg-white/50 backdrop-blur-md text-slate-600 hover:bg-white hover:text-slate-900 hover:border-slate-300 shadow-sm transition-all font-bold h-11 px-5"
          >
            Resolve Incident
          </Button>

          <div className="flex bg-white/80 backdrop-blur-xl border border-white/80 rounded-xl overflow-hidden shadow-md focus-within:ring-4 focus-within:ring-red-500/20 focus-within:border-red-400 transition-all h-11">
            <div className="flex items-center pl-3 border-r border-slate-100 bg-white/50">
              <Navigation className="w-4 h-4 text-slate-400" />
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="bg-transparent text-slate-800 font-bold text-sm pl-2 pr-4 py-2 outline-none cursor-pointer hover:text-slate-900 transition-colors"
              >
                <option className="text-slate-900" value="">Select Room</option>
                {rooms.map((r) => (
                  <option className="text-slate-900" key={r.id} value={r.id}>
                    Rm {r.number}
                  </option>
                ))}
              </select>
            </div>
            <Button
              disabled={loadingAction || !selectedRoom}
              onClick={async () => {
                setLoadingAction(true);
                const { triggerAlarm } = await import("@/app/actions");
                await triggerAlarm(selectedRoom, IncidentType.fire);
                window.location.href = `/helpline?roomId=${selectedRoom}`;
              }}
              className="bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white rounded-none border-0 shadow-inner h-full px-5 gap-2 font-black tracking-wide transition-all disabled:opacity-50 disabled:grayscale"
            >
              <Siren className="w-4 h-4" />
              {loadingAction ? "DEPLOYING..." : "ACTIVATE ALARM"}
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Main Content (Bento Grid) ─── */}
      <main className="relative z-10 flex-1 p-5 grid grid-cols-12 gap-5 h-[calc(100vh-100px)]">
        
        {/* ── Left Column (Stats & Guests) ── */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-5 h-full min-h-0">
          
          {/* Bento Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-shrink-0">
            <BentoStatCard
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              value={stats.safe}
              label="Evacuated / Safe"
              gradient="from-emerald-400/20 to-emerald-50/0"
              borderColor="border-emerald-200/50"
              textColor="text-emerald-950"
            />
            <BentoStatCard
              icon={<AlertCircle className="w-5 h-5 text-red-500" />}
              value={stats.trapped}
              label="Requires Rescue"
              gradient="from-red-500/20 to-red-50/0"
              borderColor="border-red-300/60"
              textColor="text-red-950"
              pulse
            />
            <BentoStatCard
              icon={<Activity className="w-5 h-5 text-blue-500" />}
              value={stats.evacuating}
              label="Currently Evacuating"
              gradient="from-blue-400/20 to-blue-50/0"
              borderColor="border-blue-200/50"
              textColor="text-blue-950"
            />
            <BentoStatCard
              icon={<User className="w-5 h-5 text-amber-500" />}
              value={stats.checked_in}
              label="Status Unknown"
              gradient="from-amber-400/20 to-amber-50/0"
              borderColor="border-amber-200/50"
              textColor="text-amber-950"
            />
          </div>

          {/* Guest Roster Bento */}
          <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-3xl flex-1 flex flex-col overflow-hidden min-h-0 shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative">
            
            <div className="px-6 py-4 border-b border-slate-100/50 flex justify-between items-center flex-shrink-0 bg-white/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-sm">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800 tracking-tight">
                    Live Occupancy Roster
                  </h2>
                  <p className="text-xs font-semibold text-slate-400">
                    Real-time guest tracking • {guests.length} total
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-blue-50/50 border border-blue-100/50 px-3 py-1.5 rounded-xl shadow-sm backdrop-blur-sm">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </div>
                <span className="text-[10px] font-black text-blue-600 font-mono tracking-wider">SYNCING LIVE</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 min-h-0 scrollbar-thin">
              {guests.length === 0 ? (
                <div className="h-full flex items-center justify-center flex-col gap-4 text-slate-400 font-mono bg-white/40 rounded-2xl border-2 border-dashed border-slate-200/50">
                  <User className="w-12 h-12 text-slate-300" />
                  <p className="font-bold text-sm tracking-widest uppercase">No occupancy data</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {guests.map((guest) => (
                    <PremiumGuestCard
                      key={guest.id}
                      guest={guest}
                      onMarkSafe={async () => {
                        const { markGuestSafe } = await import("@/app/actions");
                        await markGuestSafe(guest.token);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Column (Triage Alerts Bento) ── */}
        <div className="col-span-12 lg:col-span-4 h-full flex flex-col min-h-0">
          <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-3xl flex-1 flex flex-col overflow-hidden min-h-0 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
            
            <div className="px-6 py-4 border-b border-slate-100/50 flex items-center justify-between flex-shrink-0 bg-white/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shadow-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-orange-400/20 animate-pulse" />
                  <HelpCircle className="w-5 h-5 text-orange-600 relative z-10" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800 tracking-tight">
                    Active Triage
                  </h2>
                  <p className="text-xs font-semibold text-slate-400">
                    Incoming distress signals
                  </p>
                </div>
              </div>
              <div className={`px-3 py-1.5 rounded-xl border shadow-sm backdrop-blur-sm transition-colors ${
                activeMessages.length > 0
                  ? "bg-red-500 text-white border-red-600 shadow-red-500/20"
                  : "bg-slate-100/50 text-slate-400 border-slate-200"
              }`}>
                <span className="text-[12px] font-black font-mono tracking-wider">
                  {activeMessages.length} ALERTS
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
              {activeMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 text-center bg-white/40 rounded-2xl border border-dashed border-slate-200/50 p-6">
                  <div className="w-16 h-16 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-inner">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <p className="text-slate-500 font-bold text-sm tracking-wide">
                    Zero active casualties.<br/>All clear in the sector.
                  </p>
                </div>
              ) : (
                activeMessages.map((msg) => (
                  <PremiumAlertCard 
                    key={msg.id} 
                    msg={msg} 
                    rooms={rooms} 
                    guests={guests} 
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ─── Premium Components ─── */

function BentoStatCard({ icon, value, label, gradient, borderColor, textColor, pulse }: any) {
  return (
    <div className={`relative overflow-hidden bg-white/70 backdrop-blur-xl border ${borderColor} rounded-3xl p-6 flex flex-col gap-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] group hover:-translate-y-1 hover:shadow-[0_15px_40px_rgb(0,0,0,0.08)] transition-all duration-300`}>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${gradient} rounded-bl-full opacity-50 group-hover:scale-110 transition-transform duration-500`} />
      
      <div className="flex items-center justify-between relative z-10">
        <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
          {icon}
        </div>
        {pulse && value > 0 && (
          <span className="flex h-4 w-4 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 shadow-lg shadow-red-500/50" />
          </span>
        )}
      </div>

      <div className="relative z-10 mt-auto pt-2">
        <p className={`text-5xl font-black tabular-nums tracking-tighter ${textColor} leading-none`}>
          {value}
        </p>
        <p className="text-[12px] font-black uppercase tracking-[0.1em] mt-3 text-slate-500">
          {label}
        </p>
      </div>
    </div>
  );
}

function PremiumGuestCard({ guest, onMarkSafe }: any) {
  const isSafe = guest.status === "safe";
  const isCheckedIn = guest.status === "checked_in";
  const isDanger = !isSafe && !isCheckedIn;

  return (
    <div className={`relative rounded-3xl p-5 border flex flex-col items-center text-center transition-all duration-300 group overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1
      ${isSafe 
        ? "bg-gradient-to-b from-white to-emerald-50/30 border-emerald-100" 
        : isDanger 
        ? "bg-gradient-to-b from-white to-red-50/50 border-red-200 ring-4 ring-red-500/10" 
        : "bg-white/80 border-slate-100"}
    `}>
      {/* Decorative blurred background orb */}
      {isDanger && <div className="absolute top-0 inset-x-0 h-24 bg-red-400/10 blur-xl rounded-t-3xl" />}
      {isSafe && <div className="absolute top-0 inset-x-0 h-24 bg-emerald-400/10 blur-xl rounded-t-3xl opacity-0 group-hover:opacity-100 transition-opacity" />}

      {/* Avatar Container */}
      <div className="relative z-10 mb-4">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-inner backdrop-blur-sm
          ${isSafe ? "bg-emerald-50 border-emerald-200" : isDanger ? "bg-red-50 border-red-300" : "bg-slate-50 border-slate-200"}
        `}>
          <User className={`w-7 h-7 ${isSafe ? "text-emerald-500" : isDanger ? "text-red-600" : "text-slate-400"}`} />
        </div>
        
        {/* Status Indicator overlapping avatar */}
        <div className={`absolute -bottom-2 -right-2 p-1.5 rounded-full border-2 border-white shadow-sm
          ${isSafe ? "bg-emerald-500" : isDanger ? "bg-red-500 animate-pulse" : "bg-slate-300"}
        `}>
          {isSafe ? <CheckCircle2 className="w-3 h-3 text-white" /> : isDanger ? <AlertCircle className="w-3 h-3 text-white" /> : <MoreHorizontal className="w-3 h-3 text-white" />}
        </div>
      </div>

      <h3 className="relative z-10 text-[16px] font-black text-slate-900 leading-tight mb-1 truncate w-full px-2">
        {guest.name}
      </h3>
      <p className="relative z-10 text-[13px] font-bold text-slate-400 mb-4 font-mono bg-slate-100/50 px-3 py-1 rounded-lg">
        RM {guest.room?.number || "—"}
      </p>

      {/* Action Area */}
      {!isSafe ? (
        <button
          onClick={(e) => { e.stopPropagation(); onMarkSafe(); }}
          className={`relative z-10 w-full text-[13px] font-black py-3 rounded-xl shadow-sm transition-all duration-300 uppercase tracking-wide
            ${isDanger 
              ? "bg-red-500 hover:bg-emerald-500 text-white hover:shadow-emerald-500/30" 
              : "bg-slate-100 hover:bg-slate-200 text-slate-600"}
          `}
        >
          {isDanger ? "Force Safe" : "Mark Safe"}
        </button>
      ) : (
        <div className="relative z-10 w-full py-3 rounded-xl bg-emerald-50/50 border border-emerald-100 text-emerald-600 text-[13px] font-black uppercase tracking-wide">
          Verified
        </div>
      )}
    </div>
  );
}

function PremiumAlertCard({ msg, rooms, guests }: any) {
  return (
    <div
      onClick={() => (window.location.href = `/helpline?roomId=${msg.roomId}`)}
      className="group relative bg-white/80 backdrop-blur-sm border border-red-100 rounded-3xl p-5 shadow-sm hover:shadow-[0_10px_40px_rgba(239,68,68,0.15)] hover:border-red-300 cursor-pointer transition-all duration-300 hover:-translate-y-1 overflow-hidden"
    >
      {/* Intense red accent line */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-red-400 to-red-600" />
      
      <div className="flex items-start justify-between mb-3 pl-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg shadow-sm">
              RM {rooms.find((r: Room) => r.id === msg.roomId)?.number || "???"}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
              {msg.category || "GENERAL"}
            </span>
          </div>
          <span className="font-black text-base text-slate-900 mt-1">
            {guests.find((g: Guest) => g.id === msg.guestId)?.name || "Unknown Identity"}
          </span>
        </div>
        
        {/* Severity Badge */}
        <div className="flex flex-col items-center justify-center bg-red-600 text-white w-12 h-12 rounded-2xl shadow-lg shadow-red-500/30 rotate-3 group-hover:rotate-0 transition-transform">
          <span className="text-[10px] font-bold opacity-80 uppercase leading-none mt-1">SEV</span>
          <span className="text-xl font-black leading-none">{msg.severity || 1}</span>
        </div>
      </div>

      <div className="pl-2 relative">
        <div className="absolute -left-1 top-2 bottom-2 w-[3px] bg-slate-100 rounded-full" />
        <p className="text-slate-700 text-[14px] font-bold leading-snug line-clamp-3 pl-3">
          "{msg.summary || msg.text}"
        </p>
      </div>

      <div className="mt-4 pl-2 flex justify-end">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-red-500 uppercase tracking-wider group-hover:text-red-600 bg-red-50 px-3 py-1.5 rounded-xl transition-colors">
          Open Comms <Navigation className="w-3 h-3 rotate-90" />
        </span>
      </div>
    </div>
  );
}
