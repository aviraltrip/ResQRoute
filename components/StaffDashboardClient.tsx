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
  Check,
  Radio,
  ExternalLink,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Guest, DistressMessage, Room, IncidentType } from "@prisma/client";
import PreRegisterDialog from "@/components/PreRegisterDialog";
import StatCard from "@/components/StatCard";
import { type FallbackIncidentWithRoom } from "@/lib/fallback-data";

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
    <div className="min-h-screen bg-slate-50/70 text-zinc-900 flex flex-col font-sans antialiased overflow-hidden">
      <header className="bg-white/95 backdrop-blur-md border-b border-zinc-200/80 px-6 py-3.5 flex justify-between items-center z-20 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center">
            <div className="bg-red-50 border border-red-200/90 p-2.5 rounded-xl shadow-2xs">
              <ShieldAlert className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold tracking-tight text-zinc-900 font-sans flex items-center gap-1.5">
                ResQRoute <span className="font-light text-zinc-400">|</span> <span className="text-zinc-600 font-medium">Command</span>
              </h1>
              {!isFallback && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <Wifi className="w-3 h-3 text-emerald-600" /> Live DB Connected
                </span>
              )}
            </div>
            <p className="text-[11px] text-red-600 font-semibold font-mono tracking-widest uppercase mt-0.5">
              Active Incident • Grand Harbor
            </p>
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <PreRegisterDialog rooms={safeRooms} />

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!confirm("Reset all guest statuses and clear active incident alerts?")) return;
              setGuests((prev) => prev.map((g) => ({ ...g, status: "checked_in" })));
              setMessages([]);
            }}
            className="border-zinc-200/90 bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 text-xs font-medium h-9 px-3.5 shadow-2xs transition-all"
          >
            End Incident
          </Button>

          <div className="flex bg-white border border-red-200 rounded-lg overflow-hidden shadow-2xs h-9">
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="bg-transparent text-zinc-800 text-xs font-medium px-3 outline-none border-r border-red-200 cursor-pointer hover:bg-zinc-50/50 transition-colors"
            >
              <option value="">Select Room</option>
              {safeRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.number}
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
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-none border-0 shadow-inner px-3.5 h-full transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Siren className="w-3.5 h-3.5" />
              {loadingAction ? "Sounding..." : "Trigger Alarm"}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 grid grid-cols-12 gap-6 z-10 h-[calc(100vh-69px)] overflow-hidden">
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 h-full overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
            <StatCard
              icon={<CheckCircle2 className="w-5 h-5" />}
              value={stats.safe}
              label="Verified Safe"
              color="emerald"
            />
            <StatCard
              icon={<AlertCircle className="w-5 h-5" />}
              value={stats.trapped}
              label="Trapped / Need Help"
              color="red"
            />
            <StatCard
              icon={<Activity className="w-5 h-5" />}
              value={stats.evacuating}
              label="Evacuating Live"
              color="blue"
            />
            <StatCard
              icon={<User className="w-5 h-5" />}
              value={stats.checked_in}
              label="Unresponsive"
              color="slate"
            />
          </div>

          <div className="bg-white border border-zinc-200/90 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xs">
            <div className="px-6 py-3.5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/60">
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm font-bold text-zinc-900 tracking-tight">
                  Live Realtime Roster
                </h2>
                <span className="bg-zinc-200/80 text-zinc-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {safeGuestList.length}
                </span>
              </div>
              <Maximize2 className="w-4 h-4 text-zinc-400 hover:text-zinc-600 cursor-pointer transition-colors" />
            </div>

            <div className="flex-1 relative p-6 overflow-y-auto bg-slate-50/30">
              {safeGuestList.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-400 text-xs font-medium">
                  No registered guests in current roster.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {safeGuestList.map((guest) => {
                    const hasDistress = safeMessageList.some(
                      (m) => m.guestId === guest.id && guest.status !== "safe"
                    );
                    const isTrapped = guest.status === "trapped" || hasDistress;
                    const isSafe = guest.status === "safe";
                    const isEvacuating = guest.status === "evacuating";

                    let statusBadgeClass = "bg-zinc-100 text-zinc-700 border-zinc-200";
                    let statusLabel = "Checked In";
                    let avatarBg = "bg-zinc-100 text-zinc-600 border-zinc-200/80";

                    if (isSafe) {
                      statusBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold";
                      statusLabel = "Safe";
                      avatarBg = "bg-emerald-50 text-emerald-600 border-emerald-200/80";
                    } else if (isTrapped) {
                      statusBadgeClass = "bg-red-50 text-red-700 border-red-200 font-bold animate-pulse";
                      statusLabel = "Unsafe / Danger";
                      avatarBg = "bg-red-50 text-red-600 border-red-200/80";
                    } else if (isEvacuating) {
                      statusBadgeClass = "bg-blue-50 text-blue-700 border-blue-200 font-semibold";
                      statusLabel = "Evacuating";
                      avatarBg = "bg-blue-50 text-blue-600 border-blue-200/80";
                    } else if (guest.status === "pending_arrival") {
                      statusBadgeClass = "bg-amber-50 text-amber-700 border-amber-200 font-semibold";
                      statusLabel = "Pending Arrival";
                      avatarBg = "bg-amber-50 text-amber-600 border-amber-200/80";
                    }

                    return (
                      <div
                        key={guest.id}
                        className="relative bg-white border border-zinc-200/90 rounded-xl p-4 flex flex-col items-center justify-between text-center shadow-2xs hover:shadow-md hover:border-zinc-300 transition-all duration-200 group"
                      >
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
                          className="absolute top-2.5 right-2.5 p-1 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>

                        <div className="w-full flex flex-col items-center">
                          <div className={`w-11 h-11 rounded-full border ${avatarBg} flex items-center justify-center mb-2.5 transition-transform group-hover:scale-105 shadow-2xs`}>
                            <User className="w-5 h-5" />
                          </div>

                          <p className="text-sm font-bold text-zinc-900 tracking-tight leading-snug">
                            {guest.name}
                          </p>
                          <p className="text-xs text-zinc-500 font-medium mt-0.5 mb-2">
                            Room {guest.room?.number || "Unknown"}
                          </p>

                          {guest.accessibilityFlag && (
                            <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/90 px-1.5 py-0.5 rounded-md mb-2">
                              ♿ Mobility Aid
                            </span>
                          )}

                          <Badge
                            variant="outline"
                            className={`border text-[11px] px-2.5 py-0.5 ${statusBadgeClass}`}
                          >
                            {statusLabel}
                          </Badge>
                        </div>

                        <div className="w-full mt-3.5">
                          {!isSafe ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border-emerald-200/90 hover:border-emerald-600 text-xs font-semibold h-8 rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
                              <Check className="w-3.5 h-3.5" />
                              Confirm Safe
                            </Button>
                          ) : (
                            <div className="w-full h-8 px-2 bg-emerald-50/50 border border-emerald-100 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Cleared Secure
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 h-full flex flex-col overflow-hidden">
          <div className="bg-white border border-zinc-200/90 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xs">
            <div className="px-5 py-3.5 border-b border-zinc-100 bg-zinc-50/60 flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-orange-500" />
                Live Triage Alerts
              </h2>
              <Badge
                variant="secondary"
                className="bg-orange-50 text-orange-700 border border-orange-200/80 font-bold text-[11px]"
              >
                {activeMessages.length} Active
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
              {activeMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 text-xs font-medium p-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mb-2" />
                  Waiting for live distress signals... No casualties reported.
                </div>
              ) : (
                activeMessages.map((msg) => {
                  const guest = safeGuestList.find((g) => g.id === msg.guestId);
                  const room = safeRooms.find((r) => r.id === msg.roomId);

                  return (
                    <div
                      key={msg.id}
                      className="w-full text-left p-4 rounded-xl border border-zinc-200/90 border-l-4 border-l-red-500 bg-white shadow-2xs hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="px-2 py-0.5 rounded text-[11px] uppercase font-mono font-bold tracking-wider bg-zinc-100 text-zinc-800 border border-zinc-200">
                            Room {room?.number || "Unknown"}
                          </div>
                          <span className="font-bold text-xs text-zinc-900 uppercase tracking-wide">
                            {guest?.name || "Unknown Guest"}
                          </span>
                        </div>
                        <Badge className="bg-red-600 text-white font-bold text-[10px] px-2 py-0.5 rounded shadow-2xs border-0">
                          Sev {msg.severity ?? 4}
                        </Badge>
                      </div>

                      <p className="text-zinc-900 font-bold text-sm leading-snug my-2.5">
                        &ldquo;{msg.summary || msg.text}&rdquo;
                      </p>

                      {msg.summary && msg.text && msg.summary !== msg.text && (
                        <p className="text-xs text-zinc-500 leading-relaxed mb-3">
                          <span className="font-semibold text-zinc-600">Full transcript:</span> {msg.text}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100">
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                          {msg.category || "General"}
                        </span>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => router.push(`/helpline?roomId=${msg.roomId}`)}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold h-7 px-3 rounded-lg shadow-2xs cursor-pointer"
                          >
                            Dispatch
                          </Button>
                          {guest && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
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
                              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold h-7 px-2.5 rounded-lg shadow-2xs cursor-pointer"
                            >
                              Mark Safe
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
