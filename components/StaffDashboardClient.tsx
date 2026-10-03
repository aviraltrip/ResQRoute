"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  Siren,
  HelpCircle,
  Activity,
  User,
  Maximize2,
  ShieldAlert,
  X,
  WifiOff,
  Wifi,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Guest, DistressMessage, Room, IncidentType } from "@prisma/client";
import PreRegisterDialog from "@/components/PreRegisterDialog";
import StatCard from "@/components/StatCard";

type GuestWithRoom = Guest & {
  room?: Room;
};

const EMPTY_GUESTS: GuestWithRoom[] = [];
const EMPTY_MESSAGES: DistressMessage[] = [];
const EMPTY_ROOMS: Room[] = [];

export default function StaffDashboardClient({
  initialGuests = EMPTY_GUESTS,
  initialMessages = EMPTY_MESSAGES,
  rooms = EMPTY_ROOMS,
  isFallback = false,
}: {
  initialGuests?: GuestWithRoom[];
  initialMessages?: DistressMessage[];
  rooms?: Room[];
  isFallback?: boolean;
}) {
  const router = useRouter();
  const [guests, setGuests] = useState<GuestWithRoom[]>(initialGuests || []);
  const [messages, setMessages] = useState<DistressMessage[]>(initialMessages || []);
  const [loadingAction, setLoadingAction] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState("");
  const safeRooms = useMemo(() => rooms || [], [rooms]);
  const roomsRef = useRef(safeRooms);
  useEffect(() => {
    roomsRef.current = safeRooms;
  }, [safeRooms]);

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
  }, []);

  const safeGuestList = Array.isArray(guests) ? guests : [];
  const safeMessageList = Array.isArray(messages) ? messages : [];

  const stats = {
    safe: safeGuestList.filter((g) => g.status === "safe").length,
    trapped: safeGuestList.filter(
      (g) =>
        g.status === "trapped" ||
        (safeMessageList.some((m) => m.guestId === g.id) && g.status !== "safe")
    ).length,
    evacuating: safeGuestList.filter((g) => g.status === "evacuating").length,
    checked_in: safeGuestList.filter(
      (g) =>
        g.status === "checked_in" &&
        !safeMessageList.some((m) => m.guestId === g.id)
    ).length,
  };

  const activeMessages = safeMessageList.filter(
    (msg) => safeGuestList.find((g) => g.id === msg.guestId)?.status !== "safe"
  );

  return (
    <div className="min-h-screen bg-slate-50 text-zinc-900 flex flex-col font-sans overflow-hidden">
      <div className="absolute top-0 right-0 w-[800px] h-[400px] bg-red-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 blur-[150px] pointer-events-none" />

      <header className="bg-white/80 backdrop-blur-xl border-b border-zinc-200 px-6 py-4 flex justify-between items-center z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500 blur-md opacity-20 animate-pulse" />
            <div className="relative bg-white border border-red-200 p-2.5 rounded-xl shadow-sm">
              <ShieldAlert className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">
                ResQRoute <span className="font-light text-zinc-500">| Command</span>
              </h1>
              {isFallback ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md">
                  <WifiOff className="w-3 h-3" /> Standalone Simulation
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                  <Wifi className="w-3 h-3" /> Live DB Connected
                </span>
              )}
            </div>
            <p className="text-xs text-red-600 font-mono tracking-widest uppercase mt-0.5">
              Active Incident • Grand Harbor
            </p>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <PreRegisterDialog rooms={safeRooms} />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setGuests((prev) => prev.map((g) => ({ ...g, status: "checked_in" })));
              setMessages([]);
            }}
            className="border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 shadow-sm"
          >
            End Incident
          </Button>

          <div className="flex bg-white border border-red-200 rounded-lg overflow-hidden shadow-sm">
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="bg-transparent text-zinc-900 text-sm px-3 py-2 outline-none border-r border-red-200 cursor-pointer"
            >
              <option className="text-black" value="">
                Select Room
              </option>
              {safeRooms.map((r) => (
                <option className="text-black" key={r.id} value={r.id}>
                  {r.number}
                </option>
              ))}
            </select>
            <Button
              type="button"
              disabled={loadingAction || !selectedRoom}
              onClick={async () => {
                setLoadingAction(true);
                try {
                  const { triggerAlarm } = await import("@/app/actions");
                  await triggerAlarm(selectedRoom, IncidentType.fire);
                } catch (err) {
                  console.warn("Alarm action completed locally:", err);
                }
                router.push(`/helpline?roomId=${selectedRoom}`);
              }}
              className="bg-red-600 hover:bg-red-700 text-white rounded-none border-0 shadow-inner h-full"
            >
              <Siren className="w-4 h-4 mr-2" />
              {loadingAction ? "..." : "Trigger Alarm"}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 grid grid-cols-12 gap-6 z-10 h-[calc(100vh-80px)]">
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 h-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
              value={stats.safe}
              label="Verified Safe"
              color="emerald"
            />
            <StatCard
              icon={<AlertCircle className="w-6 h-6 text-red-600" />}
              value={stats.trapped}
              label="Trapped / Need Help"
              color="red"
            />
            <StatCard
              icon={<Activity className="w-6 h-6 text-blue-600" />}
              value={stats.evacuating}
              label="Evacuating Live"
              color="blue"
            />
            <StatCard
              icon={<User className="w-6 h-6 text-slate-500" />}
              value={stats.checked_in}
              label="Unresponsive"
              color="slate"
            />
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
              <h2 className="text-base font-semibold text-zinc-900">
                Live Realtime Roster ({safeGuestList.length})
              </h2>
              <Maximize2 className="w-4 h-4 text-zinc-400 cursor-pointer hover:text-zinc-600 transition-colors" />
            </div>
            <div className="flex-1 relative p-6 overflow-y-auto bg-slate-50/30">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {safeGuestList.map((guest) => (
                  <div
                    key={guest.id}
                    className="relative bg-white border border-zinc-200 rounded-xl p-4 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500 shadow-sm"
                  >
                    <button
                      type="button"
                      title="Check out / remove from roster"
                      onClick={async () => {
                        if (!confirm(`Remove ${guest.name} from the roster?`)) return;
                        setGuests((prev) => prev.filter((g) => g.id !== guest.id));
                        setMessages((prev) => prev.filter((m) => m.guestId !== guest.id));
                        try {
                          const { removeGuest } = await import("@/app/actions");
                          await removeGuest(guest.id);
                        } catch (err) {
                          console.warn("removeGuest fallback handled:", err);
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
                    <p className="text-xs text-slate-500 mb-2">
                      Room {guest.room?.number || "Unknown"}
                    </p>
                    <Badge
                      variant="outline"
                      className={`border ${
                        guest.status === "safe"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : guest.status === "checked_in"
                          ? "bg-slate-100 text-slate-600 border-slate-200"
                          : guest.status === "pending_arrival"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-red-50 text-red-700 border-red-200 font-bold"
                      }`}
                    >
                      {guest.status === "checked_in"
                        ? "Checked In"
                        : guest.status === "safe"
                        ? "Safe"
                        : guest.status === "pending_arrival"
                        ? "Pending Arrival"
                        : "Unsafe / Danger"}
                    </Badge>
                    {guest.status !== "safe" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 hover:border-emerald-300 h-auto py-1 shadow-sm transition-colors"
                        onClick={async () => {
                          setGuests((prev) =>
                            prev.map((g) =>
                              g.id === guest.id ? { ...g, status: "safe" } : g
                            )
                          );
                          try {
                            const { markGuestSafe } = await import("@/app/actions");
                            await markGuestSafe(guest.token);
                          } catch (err) {
                            console.warn("markGuestSafe fallback handled:", err);
                          }
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

        <div className="col-span-12 lg:col-span-4 h-full flex flex-col">
          <div className="bg-white border border-zinc-200 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between shadow-sm">
              <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-orange-500" />
                Live Triage Alerts
              </h2>
              <Badge
                variant="secondary"
                className="bg-orange-100 text-orange-700 border border-orange-200 font-mono animate-pulse"
              >
                {activeMessages.length} Active
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
              {activeMessages.length === 0 && (
                <div className="h-full flex items-center justify-center text-center text-zinc-400 text-sm p-4">
                  Waiting for live distress signals... No casualties reported.
                </div>
              )}
              {activeMessages.map((msg) => (
                <button
                  type="button"
                  key={msg.id}
                  onClick={() =>
                    router.push(`/helpline?roomId=${msg.roomId}`)
                  }
                  className="w-full text-left p-4 rounded-xl border animate-in slide-in-from-right fade-in bg-red-50 border-red-100 shadow-sm transition-all hover:shadow-md cursor-pointer group focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold tracking-wider bg-red-100 text-red-700 border border-red-200">
                        Room{" "}
                        {safeRooms.find((r) => r.id === msg.roomId)?.number ||
                          "Unknown"}
                      </div>
                      <span className="font-medium text-sm text-zinc-800 uppercase">
                        {safeGuestList.find((g) => g.id === msg.guestId)?.name ||
                          "Unknown Guest"}
                      </span>
                    </div>
                    <Badge className="bg-red-600 hover:bg-red-700 text-white border-0 shadow-sm">
                      Sev {msg.severity ?? 3}
                    </Badge>
                  </div>
                  <p className="text-zinc-900 font-bold text-sm leading-relaxed mb-2">
                    &ldquo;{msg.summary || msg.text}&rdquo;
                  </p>
                  {msg.summary && msg.text && msg.summary !== msg.text && (
                    <p className="text-[11px] text-zinc-500 italic mb-3 leading-relaxed">
                      Full transcript: {msg.text}
                    </p>
                  )}
                  <div className="flex justify-end">
                    <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                      {msg.category || "General"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
