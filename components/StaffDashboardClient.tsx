"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  Siren,
  HelpCircle,
  Activity,
  User,
  ShieldAlert,
  X,
  WifiOff,
  Wifi,
  Flame,
  Search,
  Grid,
  LayoutGrid,
  List,
  Volume2,
  VolumeX,
  Compass,
  Phone,
  Clock,
  Radio,
  ExternalLink,
  Info,
  Check,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Guest, DistressMessage, Room, IncidentType } from "@prisma/client";
import PreRegisterDialog from "@/components/PreRegisterDialog";
import StatCard from "@/components/StatCard";
import { type FallbackIncidentWithRoom } from "@/lib/fallback-data";

type GuestWithRoom = Guest & {
  room?: Room;
};

type EventLogItem = {
  id: string;
  time: string;
  type: "alarm" | "distress" | "safe" | "evac" | "info";
  message: string;
};

const EMPTY_GUESTS: GuestWithRoom[] = [];
const EMPTY_MESSAGES: DistressMessage[] = [];
const EMPTY_ROOMS: Room[] = [];

// Lightweight Web Audio synthesizer for tactical alarm/ping
function playTacticalChime(type: "alert" | "ping" | "confirm") {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === "alert") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.25);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === "confirm") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(987.77, now); // B5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch {}
}

export default function StaffDashboardClient({
  initialGuests = EMPTY_GUESTS,
  initialMessages = EMPTY_MESSAGES,
  rooms = EMPTY_ROOMS,
  initialIncident,
  isFallback = false,
}: {
  initialGuests?: GuestWithRoom[];
  initialMessages?: DistressMessage[];
  rooms?: Room[];
  initialIncident?: FallbackIncidentWithRoom;
  isFallback?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [guests, setGuests] = useState<GuestWithRoom[]>(initialGuests || []);
  const [messages, setMessages] = useState<DistressMessage[]>(initialMessages || []);
  const [loadingAction, setLoadingAction] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [selectedIncidentType, setSelectedIncidentType] = useState<IncidentType>(IncidentType.fire);

  // View & Filter states
  const [viewMode, setViewMode] = useState<"floor_matrix" | "cards" | "table">("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "trapped" | "evacuating" | "safe" | "checked_in" | "mobility">("all");
  const [floorFilter, setFloorFilter] = useState<number | "all">("all");
  const [activeTab, setActiveTab] = useState<"triage" | "timeline">("triage");
  const [selectedGuestForDossier, setSelectedGuestForDossier] = useState<GuestWithRoom | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Active Incident Data
  const incident = initialIncident;
  const incidentOriginRoom = incident?.originRoom || rooms.find((r) => r.id === incident?.originRoomId);

  // Elapsed mission timer
  const [elapsedSeconds, setElapsedSeconds] = useState(14 * 60 + 22);
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatElapsed = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${hrs > 0 ? `${hrs.toString().padStart(2, "0")}:` : ""}${mins
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Event Log history
  const [eventLogs, setEventLogs] = useState<EventLogItem[]>([
    {
      id: "ev-1",
      time: "12:28:14",
      type: "distress",
      message: "Distress beacon: Bob Kumar (RM 305) - Mobility assistance required near stairwell.",
    },
    {
      id: "ev-2",
      time: "12:26:00",
      type: "evac",
      message: "Alice Chen (RM 203) activated dynamic route to North Fire Exit.",
    },
    {
      id: "ev-3",
      time: "12:25:10",
      type: "alarm",
      message: `Emergency Fire Alarm triggered in Sector 2, Room ${incidentOriginRoom?.number || "204"}.`,
    },
    {
      id: "ev-4",
      time: "12:20:00",
      type: "info",
      message: "Incident Command telemetry online. Realtime channels listening.",
    },
  ]);

  const safeRooms = useMemo(() => rooms || [], [rooms]);
  const roomsRef = useRef(safeRooms);
  useEffect(() => {
    roomsRef.current = safeRooms;
  }, [safeRooms]);

  // Supabase Realtime synchronization
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    try {
      const guestSub = supabase
        .channel("public:Guest")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "Guest" },
          (payload) => {
            const newGuest = payload.new as GuestWithRoom;
            const r = roomsRef.current.find((room) => room.id === newGuest.roomId);
            if (r) newGuest.room = r;
            setGuests((prev) => [...prev, newGuest]);
            setEventLogs((prev) => [
              {
                id: `ev-${Date.now()}`,
                time: new Date().toLocaleTimeString(),
                type: "info",
                message: `New guest registered: ${newGuest.name} (RM ${r?.number || "N/A"})`,
              },
              ...prev,
            ]);
            if (audioEnabled) playTacticalChime("ping");
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "Guest" },
          (payload) => {
            const updatedGuest = payload.new as GuestWithRoom;
            setGuests((prev) =>
              prev.map((g) => (g.id === updatedGuest.id ? { ...g, ...updatedGuest } : g))
            );
            if (updatedGuest.status === "safe") {
              setEventLogs((prev) => [
                {
                  id: `ev-${Date.now()}`,
                  time: new Date().toLocaleTimeString(),
                  type: "safe",
                  message: `Guest confirmed safe: ${updatedGuest.name}`,
                },
                ...prev,
              ]);
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "Guest" },
          (payload) => {
            const removed = payload.old as { id?: string };
            if (removed?.id) {
              setGuests((prev) => prev.filter((g) => g.id !== removed.id));
              setMessages((prev) => prev.filter((m) => m.guestId !== removed.id));
            }
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
            setEventLogs((prev) => [
              {
                id: `ev-${Date.now()}`,
                time: new Date().toLocaleTimeString(),
                type: "distress",
                message: `New distress signal: ${newMsg.summary || newMsg.text}`,
              },
              ...prev,
            ]);
            if (audioEnabled) playTacticalChime("alert");
          }
        )
        .subscribe();

      return () => {
        try {
          supabase.removeChannel(guestSub);
          supabase.removeChannel(distressSub);
        } catch {}
      };
    } catch (err) {
      console.warn("Realtime subscription failed:", err);
    }
  }, [audioEnabled]);

  const safeGuestList = Array.isArray(guests) ? guests : [];
  const safeMessageList = Array.isArray(messages) ? messages : [];

  const stats = useMemo(() => {
    const safeCount = safeGuestList.filter((g) => g.status === "safe").length;
    const trappedCount = safeGuestList.filter(
      (g) =>
        g.status === "trapped" ||
        (safeMessageList.some((m) => m.guestId === g.id) && g.status !== "safe")
    ).length;
    const evacCount = safeGuestList.filter((g) => g.status === "evacuating").length;
    const checkedInCount = safeGuestList.filter(
      (g) =>
        g.status === "checked_in" &&
        !safeMessageList.some((m) => m.guestId === g.id)
    ).length;

    const total = safeGuestList.length || 1;
    return {
      safe: safeCount,
      trapped: trappedCount,
      evacuating: evacCount,
      checked_in: checkedInCount,
      total: safeGuestList.length,
      safePct: Math.round((safeCount / total) * 100),
      trappedPct: Math.round((trappedCount / total) * 100),
      evacPct: Math.round((evacCount / total) * 100),
      checkedInPct: Math.round((checkedInCount / total) * 100),
    };
  }, [safeGuestList, safeMessageList]);

  const activeMessages = safeMessageList.filter(
    (msg) => safeGuestList.find((g) => g.id === msg.guestId)?.status !== "safe"
  );

  // Filtered guest list
  const filteredGuests = useMemo(() => {
    return safeGuestList.filter((guest) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = guest.name.toLowerCase().includes(q);
        const matchesRoom = guest.room?.number.toLowerCase().includes(q);
        if (!matchesName && !matchesRoom) return false;
      }

      // Status
      if (statusFilter === "trapped") {
        const isTrapped =
          guest.status === "trapped" ||
          safeMessageList.some((m) => m.guestId === guest.id && guest.status !== "safe");
        if (!isTrapped) return false;
      } else if (statusFilter === "evacuating") {
        if (guest.status !== "evacuating") return false;
      } else if (statusFilter === "safe") {
        if (guest.status !== "safe") return false;
      } else if (statusFilter === "checked_in") {
        if (guest.status !== "checked_in") return false;
      } else if (statusFilter === "mobility") {
        if (!guest.accessibilityFlag) return false;
      }

      // Floor
      if (floorFilter !== "all") {
        if (guest.room?.floor !== floorFilter) return false;
      }

      return true;
    });
  }, [safeGuestList, safeMessageList, searchQuery, statusFilter, floorFilter]);

  // Group rooms by floor for matrix view
  const floors = [4, 3, 2, 1];

  const handleMarkSafe = async (guest: GuestWithRoom) => {
    if (audioEnabled) playTacticalChime("confirm");
    setGuests((prev) =>
      prev.map((g) => (g.id === guest.id ? { ...g, status: "safe" } : g))
    );
    setEventLogs((prev) => [
      {
        id: `ev-${Date.now()}`,
        time: new Date().toLocaleTimeString(),
        type: "safe",
        message: `Verified safe: ${guest.name} (RM ${guest.room?.number || "N/A"})`,
      },
      ...prev,
    ]);
    try {
      const { markGuestSafe } = await import("@/app/actions");
      await markGuestSafe(guest.token);
    } catch (err) {
      console.warn("markGuestSafe handled locally:", err);
    }
  };

  const handleMarkAllSafe = async () => {
    if (!confirm("Confirm all remaining guests as cleared and safe?")) return;
    if (audioEnabled) playTacticalChime("confirm");
    setGuests((prev) => prev.map((g) => ({ ...g, status: "safe" })));
    setMessages([]);
    setEventLogs((prev) => [
      {
        id: `ev-${Date.now()}`,
        time: new Date().toLocaleTimeString(),
        type: "safe",
        message: "COMMAND OVERRIDE: All sectors verified cleared safe.",
      },
      ...prev,
    ]);
  };

  const handleTriggerAlarm = async () => {
    if (!selectedRoom) return;
    setLoadingAction(true);
    if (audioEnabled) playTacticalChime("alert");
    try {
      const { triggerAlarm } = await import("@/app/actions");
      await triggerAlarm(selectedRoom, selectedIncidentType);
    } catch (err) {
      console.warn("Alarm action completed locally:", err);
    } finally {
      setLoadingAction(false);
    }
    const targetRoom = safeRooms.find((r) => r.id === selectedRoom);
    setEventLogs((prev) => [
      {
        id: `ev-${Date.now()}`,
        time: new Date().toLocaleTimeString(),
        type: "alarm",
        message: `Emergency evacuation alarm sounded for Room ${targetRoom?.number || selectedRoom} (${selectedIncidentType.toUpperCase()})`,
      },
      ...prev,
    ]);
    router.push(`/helpline?roomId=${selectedRoom}`);
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col font-sans selection:bg-red-950 selection:text-red-200 relative overflow-x-hidden">
      {/* Background tactical mesh and subtle atmospheric lighting */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(239,68,68,0.08),rgba(255,255,255,0))] pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* TOP COMMAND HUD HEADER */}
      <header className="relative z-20 bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-800/80 px-6 py-3.5 flex flex-wrap justify-between items-center gap-4 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-1 bg-red-600 rounded-xl blur-sm opacity-40 animate-pulse" />
            <div className="relative bg-zinc-900 border border-red-500/40 p-2.5 rounded-xl shadow-inner">
              <ShieldAlert className="w-5 h-5 text-red-500" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-lg font-black tracking-wider text-white font-mono flex items-center gap-2">
                RESQROUTE <span className="text-zinc-600 font-light">/</span>{" "}
                <span className="text-red-500 tracking-widest text-sm uppercase">COMMAND CONSOLE</span>
              </span>

              {/* Realtime telemetry state */}
              {isFallback ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold bg-amber-950/40 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md">
                  <WifiOff className="w-3 h-3" /> SIMULATION DECK
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <Wifi className="w-3 h-3" /> LIVE TELEMETRY (18ms)
                </span>
              )}

              {/* Elapsed Timer */}
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold bg-zinc-900 text-zinc-300 border border-zinc-800 px-2.5 py-0.5 rounded-md shadow-sm">
                <Clock className="w-3 h-3 text-red-400" />
                {formatElapsed(elapsedSeconds)} ELAPSED
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 font-mono tracking-widest uppercase flex items-center gap-2 mt-0.5">
              <span className="text-red-400 font-bold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 animate-pulse" /> ACTIVE EMERGENCY
              </span>
              <span>•</span>
              <span className="text-zinc-300">Grand Harbor Hotel</span>
              <span>•</span>
              <span className="text-zinc-500">Origin: Room {incidentOriginRoom?.number || "204"} (Fl {incidentOriginRoom?.floor || 2})</span>
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Audio Chime Toggle */}
          <button
            type="button"
            title={audioEnabled ? "Tactical audio active" : "Tactical audio muted"}
            onClick={() => {
              const next = !audioEnabled;
              setAudioEnabled(next);
              if (next) playTacticalChime("ping");
            }}
            className={`p-2 rounded-lg border text-xs font-mono transition-all ${
              audioEnabled
                ? "bg-sky-950/40 border-sky-500/40 text-sky-400"
                : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Tactical Responder View Button */}
          <Link
            href={`/responder/${incident?.id || "incident-active-1"}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-mono font-bold bg-zinc-900 hover:bg-zinc-800 text-sky-400 border border-sky-500/30 hover:border-sky-500/60 px-3 py-2 rounded-lg transition-all shadow-sm"
          >
            <Compass className="w-3.5 h-3.5 animate-spin-slow" />
            Tactical Map
            <ExternalLink className="w-3 h-3 text-sky-500" />
          </Link>

          {/* Pre-Register Guest dialog */}
          <PreRegisterDialog rooms={safeRooms} />

          {/* End Incident Reset */}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!confirm("Are you sure you want to end this incident and stand down all alerts?")) return;
              setGuests((prev) => prev.map((g) => ({ ...g, status: "checked_in" })));
              setMessages([]);
              setEventLogs((prev) => [
                {
                  id: `ev-${Date.now()}`,
                  time: new Date().toLocaleTimeString(),
                  type: "info",
                  message: "INCIDENT STAND DOWN: Emergency state resolved. Normal status restored.",
                },
                ...prev,
              ]);
            }}
            className="border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white font-mono text-xs uppercase h-9 px-3"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1 text-zinc-400" />
            Stand Down
          </Button>

          {/* Trigger Alarm Unit */}
          <div className="flex bg-zinc-900 border border-red-500/40 rounded-lg overflow-hidden shadow-lg shadow-red-950/30">
            <select
              value={selectedIncidentType}
              onChange={(e) => setSelectedIncidentType(e.target.value as IncidentType)}
              className="bg-zinc-900/90 text-zinc-300 text-xs px-2.5 py-1.5 outline-none border-r border-zinc-800 font-mono cursor-pointer"
            >
              <option value={IncidentType.fire}>FIRE</option>
              <option value={IncidentType.smoke}>SMOKE</option>
              <option value={IncidentType.medical}>MEDICAL</option>
              <option value={IncidentType.security}>SECURITY</option>
            </select>

            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="bg-zinc-900/90 text-zinc-200 text-xs px-2.5 py-1.5 outline-none border-r border-red-500/30 font-mono cursor-pointer"
            >
              <option value="">Select Room</option>
              {safeRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  RM {r.number} (Fl {r.floor})
                </option>
              ))}
            </select>

            <Button
              type="button"
              disabled={loadingAction || !selectedRoom}
              onClick={handleTriggerAlarm}
              className="bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold tracking-wider rounded-none border-0 shadow-inner px-3 h-auto"
            >
              <Siren className="w-3.5 h-3.5 mr-1.5 animate-pulse" />
              {loadingAction ? "TRANSMITTING..." : "ALARM"}
            </Button>
          </div>
        </div>
      </header>

      {/* METRIC TILES & EVACUATION PROGRESS BAR */}
      <div className="relative z-10 px-6 pt-5 pb-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            value={stats.safe}
            label="Verified Safe"
            color="emerald"
            subtitle={`${stats.safePct}% of guests`}
            trend="SECURED"
          />
          <StatCard
            icon={<AlertCircle className="w-5 h-5 text-red-400 animate-pulse" />}
            value={stats.trapped}
            label="Trapped / Need Help"
            color="red"
            subtitle={`${stats.trappedPct}% of guests`}
            trend="PRIORITY RESCUE"
          />
          <StatCard
            icon={<Activity className="w-5 h-5 text-sky-400" />}
            value={stats.evacuating}
            label="Evacuating Live"
            color="blue"
            subtitle={`${stats.evacPct}% of guests`}
            trend="IN TRANSIT"
          />
          <StatCard
            icon={<User className="w-5 h-5 text-zinc-400" />}
            value={stats.checked_in}
            label="Unresponsive"
            color="slate"
            subtitle={`${stats.checkedInPct}% of guests`}
            trend="NO SIGNAL"
          />
        </div>

        {/* Global Evacuation Segment HUD */}
        <div className="mt-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2 shadow-md">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-zinc-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              GLOBAL EVACUATION CLEARANCE STATUS
            </span>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="text-emerald-400 font-semibold">{stats.safe} Cleared ({stats.safePct}%)</span>
              <span className="text-sky-400 font-semibold">{stats.evacuating} In Transit ({stats.evacPct}%)</span>
              <span className="text-red-400 font-semibold">{stats.trapped} In Distress ({stats.trappedPct}%)</span>
              <span className="text-zinc-500">{stats.checked_in} Unaccounted</span>
            </div>
          </div>

          <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden flex border border-zinc-800/80">
            <div
              style={{ width: `${stats.safePct}%` }}
              className="h-full bg-emerald-500 transition-all duration-500 shadow-sm"
              title={`Safe: ${stats.safePct}%`}
            />
            <div
              style={{ width: `${stats.evacPct}%` }}
              className="h-full bg-sky-500 transition-all duration-500 shadow-sm"
              title={`Evacuating: ${stats.evacPct}%`}
            />
            <div
              style={{ width: `${stats.trappedPct}%` }}
              className="h-full bg-red-600 transition-all duration-500 animate-pulse shadow-sm"
              title={`Trapped: ${stats.trappedPct}%`}
            />
            <div
              style={{ width: `${stats.checkedInPct}%` }}
              className="h-full bg-zinc-700 transition-all duration-500"
              title={`Unresponsive: ${stats.checkedInPct}%`}
            />
          </div>
        </div>
      </div>

      {/* MAIN OPERATIONS WORKSPACE */}
      <main className="flex-1 px-6 pb-6 grid grid-cols-12 gap-5 z-10 overflow-hidden">
        {/* LEFT COLUMN: ROSTER & FACILITY MAP */}
        <div className="col-span-12 xl:col-span-8 flex flex-col gap-4 h-full">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl backdrop-blur-md">
            {/* Roster Controls Header */}
            <div className="px-5 py-3.5 border-b border-zinc-800 bg-zinc-950/40 flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-sky-400" />
                  <h2 className="text-sm font-mono font-bold tracking-wider text-zinc-100 uppercase">
                    Roster Telemetry
                  </h2>
                </div>
                <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 font-mono text-[11px]">
                  {filteredGuests.length} / {safeGuestList.length} Occupants
                </Badge>
              </div>

              {/* View mode toggle */}
              <div className="flex items-center gap-2">
                <div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode("cards")}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold flex items-center gap-1.5 transition-all ${
                      viewMode === "cards"
                        ? "bg-zinc-800 text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("floor_matrix")}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold flex items-center gap-1.5 transition-all ${
                      viewMode === "floor_matrix"
                        ? "bg-zinc-800 text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <Grid className="w-3.5 h-3.5" />
                    Floor Matrix
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold flex items-center gap-1.5 transition-all ${
                      viewMode === "table"
                        ? "bg-zinc-800 text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    Dispatch Table
                  </button>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="px-5 py-2.5 border-b border-zinc-800/60 bg-zinc-950/20 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <div className="relative w-full max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by guest, room..."
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Floor filter */}
                <select
                  value={floorFilter}
                  onChange={(e) =>
                    setFloorFilter(e.target.value === "all" ? "all" : Number(e.target.value))
                  }
                  className="bg-zinc-950/80 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-300 cursor-pointer"
                >
                  <option value="all">All Floors</option>
                  <option value={1}>Floor 1</option>
                  <option value={2}>Floor 2</option>
                  <option value={3}>Floor 3</option>
                  <option value={4}>Floor 4</option>
                </select>
              </div>

              {/* Status Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "all", label: "All" },
                  { id: "trapped", label: "Trapped" },
                  { id: "evacuating", label: "Evacuating" },
                  { id: "safe", label: "Safe" },
                  { id: "checked_in", label: "Unresponsive" },
                  { id: "mobility", label: "♿ Mobility" },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setStatusFilter(chip.id as typeof statusFilter)}
                    className={`px-2 py-1 rounded-md text-[11px] transition-all ${
                      statusFilter === chip.id
                        ? "bg-red-500/20 text-red-300 border border-red-500/40"
                        : "bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Roster Viewport */}
            <div className="flex-1 p-5 overflow-y-auto bg-zinc-950/20">
              {filteredGuests.length === 0 && (
                <div className="h-48 flex flex-col items-center justify-center text-center text-zinc-500 font-mono text-xs">
                  <Search className="w-6 h-6 mb-2 text-zinc-600" />
                  No guests match the selected filter criteria.
                </div>
              )}

              {/* VIEW 1: CARDS */}
              {viewMode === "cards" && (
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3.5">
                  {filteredGuests.map((guest) => {
                    const hasDistress = safeMessageList.some(
                      (m) => m.guestId === guest.id && guest.status !== "safe"
                    );
                    const isTrapped = guest.status === "trapped" || hasDistress;
                    const isSafe = guest.status === "safe";
                    const isEvacuating = guest.status === "evacuating";

                    let statusTheme = {
                      border: "border-zinc-800",
                      badgeBg: "bg-zinc-800 text-zinc-300",
                      label: "Checked In",
                      accent: "bg-zinc-600",
                    };
                    if (isTrapped) {
                      statusTheme = {
                        border: "border-red-500/40 shadow-red-950/20",
                        badgeBg: "bg-red-950/60 text-red-300 border border-red-500/40 animate-pulse",
                        label: "IMMEDIATE DANGER",
                        accent: "bg-red-500",
                      };
                    } else if (isEvacuating) {
                      statusTheme = {
                        border: "border-sky-500/40",
                        badgeBg: "bg-sky-950/60 text-sky-300 border border-sky-500/40",
                        label: "EVACUATING LIVE",
                        accent: "bg-sky-500",
                      };
                    } else if (isSafe) {
                      statusTheme = {
                        border: "border-emerald-500/40",
                        badgeBg: "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40",
                        label: "CLEARED SAFE",
                        accent: "bg-emerald-500",
                      };
                    }

                    return (
                      <div
                        key={guest.id}
                        className={`relative bg-zinc-900/90 border ${statusTheme.border} rounded-xl p-4 flex flex-col justify-between shadow-lg transition-all hover:border-zinc-700 hover:shadow-xl group`}
                      >
                        {/* Status bar line */}
                        <div className={`absolute top-0 left-0 right-0 h-[2px] ${statusTheme.accent}`} />

                        <div>
                          <div className="flex items-start justify-between mb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                                RM {guest.room?.number || "Unknown"}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-500">
                                Floor {guest.room?.floor || "1"}
                              </span>
                            </div>

                            <button
                              type="button"
                              title="Check out / remove from roster"
                              onClick={async () => {
                                if (!confirm(`Remove ${guest.name} from the active roster?`)) return;
                                setGuests((prev) => prev.filter((g) => g.id !== guest.id));
                                setMessages((prev) => prev.filter((m) => m.guestId !== guest.id));
                                try {
                                  const { removeGuest } = await import("@/app/actions");
                                  await removeGuest(guest.id);
                                } catch (err) {
                                  console.warn("removeGuest fallback handled:", err);
                                }
                              }}
                              className="text-zinc-600 hover:text-red-400 p-1 rounded hover:bg-zinc-800 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-sm font-bold text-white tracking-tight">
                              {guest.name}
                            </h3>
                            {guest.accessibilityFlag && (
                              <span
                                title="Mobility assistance flag declared"
                                className="inline-flex items-center text-[10px] font-mono font-bold bg-amber-950/50 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded"
                              >
                                ♿ MOBILITY
                              </span>
                            )}
                          </div>

                          {/* Contact */}
                          {guest.phone && (
                            <p className="text-[11px] font-mono text-zinc-500 mb-3 flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-zinc-600" />
                              <a href={`tel:${guest.phone}`} className="hover:text-zinc-300 transition-colors">
                                {guest.phone}
                              </a>
                            </p>
                          )}

                          {/* Status Pill */}
                          <div className="mb-3">
                            <span className={`inline-block font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${statusTheme.badgeBg}`}>
                              {statusTheme.label}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedGuestForDossier(guest)}
                            className="flex-1 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 font-mono text-[11px] py-1.5 rounded-lg border border-zinc-700/60 flex items-center justify-center gap-1 transition-all"
                          >
                            <Info className="w-3 h-3" /> Dossier
                          </button>

                          {!isSafe && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleMarkSafe(guest)}
                              className="flex-1 bg-emerald-600/90 hover:bg-emerald-500 text-white font-mono text-[11px] font-bold py-1.5 h-auto rounded-lg shadow-sm flex items-center justify-center gap-1 transition-all"
                            >
                              <Check className="w-3 h-3" /> Mark Safe
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* VIEW 2: FACILITY FLOOR MATRIX */}
              {viewMode === "floor_matrix" && (
                <div className="space-y-4">
                  {floors.map((fl) => {
                    const floorRooms = safeRooms.filter((r) => r.floor === fl);
                    const isHazardFloor = fl === (incidentOriginRoom?.floor || 2);

                    return (
                      <div
                        key={fl}
                        className={`bg-zinc-900/90 border ${
                          isHazardFloor ? "border-red-500/40" : "border-zinc-800"
                        } rounded-xl p-4 shadow-lg`}
                      >
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-zinc-200 uppercase tracking-wider">
                              FLOOR {fl.toString().padStart(2, "0")}
                            </span>
                            {isHazardFloor && (
                              <span className="text-[10px] font-mono font-bold bg-red-950 text-red-300 border border-red-500/50 px-2 py-0.5 rounded flex items-center gap-1 animate-pulse">
                                <Flame className="w-3 h-3 text-red-400" /> HAZARD ZONE
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-zinc-500">
                            {floorRooms.length} Sectors
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2">
                          {floorRooms.map((room) => {
                            const occupant = safeGuestList.find((g) => g.roomId === room.id);
                            const isOrigin = room.id === incidentOriginRoom?.id;
                            const hasDistress = occupant && safeMessageList.some((m) => m.guestId === occupant.id && occupant.status !== "safe");

                            let cellBorder = "border-zinc-800 bg-zinc-950/60";
                            let cellText = "text-zinc-400";
                            let statusIcon = null;

                            if (isOrigin) {
                              cellBorder = "border-red-500 bg-red-950/60 text-red-300 animate-pulse";
                              statusIcon = <Flame className="w-3 h-3 text-red-400" />;
                            } else if (hasDistress || occupant?.status === "trapped") {
                              cellBorder = "border-red-500/60 bg-red-950/40 text-red-200";
                              statusIcon = <AlertTriangle className="w-3 h-3 text-red-400" />;
                            } else if (occupant?.status === "evacuating") {
                              cellBorder = "border-sky-500/60 bg-sky-950/40 text-sky-200";
                              statusIcon = <Activity className="w-3 h-3 text-sky-400" />;
                            } else if (occupant?.status === "safe") {
                              cellBorder = "border-emerald-500/60 bg-emerald-950/30 text-emerald-300";
                              statusIcon = <Check className="w-3 h-3 text-emerald-400" />;
                            } else if (room.isExit) {
                              cellBorder = "border-emerald-700/60 bg-emerald-950/20 text-emerald-400";
                              statusIcon = <span className="text-[9px] font-mono font-bold">EXIT</span>;
                            }

                            return (
                              <button
                                type="button"
                                key={room.id}
                                onClick={() => {
                                  if (occupant) setSelectedGuestForDossier(occupant);
                                }}
                                className={`p-2.5 rounded-lg border ${cellBorder} flex flex-col items-center justify-center text-center transition-all hover:scale-105 cursor-pointer relative group`}
                              >
                                <div className="flex items-center gap-1 font-mono font-bold text-xs">
                                  {statusIcon}
                                  <span>{room.number}</span>
                                </div>
                                <span className="text-[10px] font-mono text-zinc-400 truncate max-w-full mt-1">
                                  {occupant ? occupant.name : room.isExit ? "Clear Exit" : "Vacant"}
                                </span>
                                {occupant?.accessibilityFlag && (
                                  <span className="absolute top-1 right-1 text-[9px] text-amber-400 font-mono">
                                    ♿
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* VIEW 3: DISPATCH TABLE */}
              {viewMode === "table" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-[10px]">
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Room & Floor</th>
                        <th className="py-2.5 px-3">Occupant</th>
                        <th className="py-2.5 px-3">Flags</th>
                        <th className="py-2.5 px-3">Phone</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {filteredGuests.map((guest) => {
                        const isSafe = guest.status === "safe";
                        const isTrapped = guest.status === "trapped";
                        const isEvac = guest.status === "evacuating";

                        return (
                          <tr
                            key={guest.id}
                            className="hover:bg-zinc-900/60 transition-colors"
                          >
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isSafe
                                    ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30"
                                    : isTrapped
                                    ? "bg-red-950 text-red-300 border border-red-500/40 animate-pulse"
                                    : isEvac
                                    ? "bg-sky-950 text-sky-300 border border-sky-500/30"
                                    : "bg-zinc-800 text-zinc-400"
                                }`}
                              >
                                {guest.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-zinc-200 font-bold">
                              RM {guest.room?.number || "N/A"}{" "}
                              <span className="text-zinc-500 font-normal">
                                (Fl {guest.room?.floor || "1"})
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-white font-semibold">
                              {guest.name}
                            </td>
                            <td className="py-2.5 px-3">
                              {guest.accessibilityFlag ? (
                                <span className="bg-amber-950 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded text-[10px]">
                                  ♿ Mobility Aid
                                </span>
                              ) : (
                                <span className="text-zinc-600">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-zinc-400">
                              {guest.phone || "—"}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedGuestForDossier(guest)}
                                  className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded"
                                >
                                  Dossier
                                </button>
                                {!isSafe && (
                                  <button
                                    type="button"
                                    onClick={() => handleMarkSafe(guest)}
                                    className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded font-bold"
                                  >
                                    Safe
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick Bulk Actions Bar */}
            <div className="px-5 py-2.5 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-500">
                Active Sector: Grand Harbor Hotel // Floors 1-4
              </span>
              <button
                type="button"
                onClick={handleMarkAllSafe}
                className="text-emerald-400 hover:text-emerald-300 font-bold text-[11px] uppercase flex items-center gap-1 transition-colors"
              >
                <Check className="w-3.5 h-3.5" /> Mark All Remaining Safe
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE TRIAGE & MISSION LOG */}
        <div className="col-span-12 xl:col-span-4 h-full flex flex-col">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl backdrop-blur-md">
            {/* Header with Tabs */}
            <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between">
              <div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setActiveTab("triage")}
                  className={`px-3 py-1 rounded-md text-xs font-mono font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === "triage"
                      ? "bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Triage Feed ({activeMessages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("timeline")}
                  className={`px-3 py-1 rounded-md text-xs font-mono font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === "timeline"
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Event Timeline
                </button>
              </div>

              {activeTab === "triage" && activeMessages.length > 0 && (
                <Badge className="bg-red-950 text-red-400 border border-red-500/50 font-mono text-[10px] animate-pulse">
                  {activeMessages.length} CRITICAL
                </Badge>
              )}
            </div>

            {/* Content view */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-950/20 font-mono">
              {activeTab === "triage" ? (
                <>
                  {activeMessages.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-zinc-500 text-xs">
                      <div className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center mb-3">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500/60" />
                      </div>
                      <p className="font-bold text-zinc-400">NO DISTRESS SIGNALS ACTIVE</p>
                      <p className="text-[11px] text-zinc-600 mt-1">
                        All guest channels secure. Listening for live panic transmissions...
                      </p>
                    </div>
                  ) : (
                    activeMessages.map((msg) => {
                      const guest = safeGuestList.find((g) => g.id === msg.guestId);
                      const room = safeRooms.find((r) => r.id === msg.roomId);

                      return (
                        <div
                          key={msg.id}
                          className="bg-zinc-900 border border-red-500/50 rounded-xl p-4 shadow-xl shadow-red-950/20 relative group transition-all hover:border-red-400"
                        >
                          {/* Severity and Room Header */}
                          <div className="flex items-start justify-between mb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="bg-red-950 text-red-300 border border-red-500/40 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                RM {room?.number || "Unknown"} (Fl {room?.floor || "1"})
                              </span>
                              <span className="text-xs font-bold text-white uppercase">
                                {guest?.name || "Unknown Guest"}
                              </span>
                            </div>
                            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                              SEV {msg.severity ?? 4}
                            </span>
                          </div>

                          {/* Simulated Audio Waveform */}
                          <div className="flex items-center gap-1 mb-2.5 opacity-60">
                            {[40, 75, 30, 90, 60, 45, 80, 25, 65, 85, 35, 70, 50].map((h, i) => (
                              <span
                                key={i}
                                style={{ height: `${h * 0.16}px` }}
                                className="w-1 bg-red-400 rounded-full animate-pulse"
                              />
                            ))}
                            <span className="text-[9px] text-zinc-500 ml-2">LIVE AUDIO TRANSCRIBED</span>
                          </div>

                          {/* Distress Summary */}
                          <p className="text-zinc-100 font-sans font-semibold text-xs leading-relaxed mb-2 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800">
                            &ldquo;{msg.summary || msg.text}&rdquo;
                          </p>

                          {msg.summary && msg.text && msg.summary !== msg.text && (
                            <p className="text-[10px] text-zinc-500 mb-3">
                              Full raw text: {msg.text}
                            </p>
                          )}

                          {/* Action footer */}
                          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                            <span className="text-[9px] uppercase tracking-widest text-amber-400 font-bold bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-500/30">
                              {msg.category || "MOBILITY"}
                            </span>

                            <div className="flex items-center gap-2">
                              <Link
                                href={`/helpline?roomId=${msg.roomId}`}
                                className="text-[10px] bg-red-600 hover:bg-red-500 text-white font-bold px-2.5 py-1 rounded shadow-sm"
                              >
                                Dispatch
                              </Link>
                              {guest && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkSafe(guest)}
                                  className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded font-bold"
                                >
                                  Safe
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              ) : (
                <div className="space-y-2.5">
                  {eventLogs.map((log) => {
                    let dotColor = "bg-zinc-500";
                    if (log.type === "alarm") dotColor = "bg-red-500 animate-ping";
                    if (log.type === "distress") dotColor = "bg-amber-500 animate-pulse";
                    if (log.type === "safe") dotColor = "bg-emerald-400";
                    if (log.type === "evac") dotColor = "bg-sky-400";

                    return (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex items-start gap-2.5 text-xs font-mono"
                      >
                        <span className={`w-2 h-2 rounded-full ${dotColor} mt-1.5 shrink-0`} />
                        <div className="flex-1">
                          <div className="flex justify-between text-[10px] text-zinc-500 mb-0.5">
                            <span className="uppercase font-bold tracking-wider text-zinc-400">
                              {log.type}
                            </span>
                            <span>{log.time}</span>
                          </div>
                          <p className="text-zinc-300 text-[11px] leading-relaxed">
                            {log.message}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* GUEST DOSSIER MODAL */}
      {selectedGuestForDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden font-mono text-xs">
            <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
                <h3 className="font-bold text-sm text-white tracking-wider uppercase">
                  Occupant Dossier Telemetry
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGuestForDossier(null)}
                className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                <div>
                  <h4 className="text-base font-bold text-white font-sans">
                    {selectedGuestForDossier.name}
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Room {selectedGuestForDossier.room?.number || "Unknown"} · Floor {selectedGuestForDossier.room?.floor || "1"}
                  </p>
                </div>
                <Badge
                  className={`text-xs uppercase font-bold ${
                    selectedGuestForDossier.status === "safe"
                      ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                      : selectedGuestForDossier.status === "trapped"
                      ? "bg-red-950 text-red-300 border-red-500/50 animate-pulse"
                      : "bg-sky-950 text-sky-300 border-sky-500/40"
                  }`}
                >
                  {selectedGuestForDossier.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl">
                  <span className="text-zinc-500 block mb-1">CONTACT PHONE</span>
                  <span className="text-zinc-200 font-bold">{selectedGuestForDossier.phone || "Not recorded"}</span>
                </div>
                <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl">
                  <span className="text-zinc-500 block mb-1">ACCESSIBILITY</span>
                  <span className={selectedGuestForDossier.accessibilityFlag ? "text-amber-400 font-bold" : "text-zinc-400"}>
                    {selectedGuestForDossier.accessibilityFlag ? "♿ Requires Mobility Aid" : "Standard Evacuation"}
                  </span>
                </div>
              </div>

              {/* Status Override Buttons */}
              <div className="pt-2">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-2">
                  Emergency Status Override
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      handleMarkSafe(selectedGuestForDossier);
                      setSelectedGuestForDossier(null);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold"
                  >
                    Set Safe
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setGuests((prev) =>
                        prev.map((g) =>
                          g.id === selectedGuestForDossier.id ? { ...g, status: "evacuating" } : g
                        )
                      );
                      setSelectedGuestForDossier(null);
                    }}
                    className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono font-bold"
                  >
                    Set Evacuating
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setGuests((prev) =>
                        prev.map((g) =>
                          g.id === selectedGuestForDossier.id ? { ...g, status: "trapped" } : g
                        )
                      );
                      setSelectedGuestForDossier(null);
                    }}
                    className="bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold"
                  >
                    Set Trapped
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
