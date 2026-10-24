"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserPlus, Copy, CheckCircle2, RotateCcw } from "lucide-react";
import { preRegisterGuest } from "@/app/actions";

type Room = { id: string; number: string; floor: number };

type Issued = {
  url: string;
  guestName: string;
  roomNumber: string;
};

export default function PreRegisterDialog({ rooms }: { rooms: Room[] }) {
  const [state, setState] = useState<{
    open: boolean;
    loading: boolean;
    error: string | null;
    issued: Issued | null;
    copied: boolean;
  }>({
    open: false,
    loading: false,
    error: null,
    issued: null,
    copied: false,
  });

  const { open, loading, error, issued, copied } = state;

  const guestRooms = rooms.filter(
    (r) => !r.number.includes("EXIT") && !r.number.includes("LOBBY"),
  );

  function reset() {
    setState((prev) => ({
      ...prev,
      issued: null,
      error: null,
      copied: false,
    }));
  }

  async function handleSubmit(formData: FormData) {
    setState((prev) => ({ ...prev, error: null, loading: true }));
    try {
      const res = await preRegisterGuest(formData);
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      setState((prev) => ({
        ...prev,
        loading: false,
        issued: {
          url: `${origin}/check-in/${res.setupToken}`,
          guestName: res.guestName,
          roomNumber: res.roomNumber,
        },
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to pre-register",
      }));
    }
  }

  async function copyLink() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.url);
      setState((prev) => ({ ...prev, copied: true }));
      setTimeout(() => setState((prev) => ({ ...prev, copied: false })), 1800);
    } catch {}
  }

  const qrSrc = issued
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(issued.url)}`
    : "";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setState((prev) => ({ ...prev, open: o }));
        if (!o) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="border-zinc-700/80 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white shadow-sm font-mono text-xs tracking-wider uppercase h-9 px-3 flex items-center gap-1.5 transition-all"
          />
        }
      >
        <UserPlus className="w-3.5 h-3.5 text-sky-400" />
        Pre-register Guest
      </DialogTrigger>

      <DialogContent className="max-w-md p-0 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100">
        <div className="px-6 pt-6 pb-4 border-b border-zinc-800/80 bg-zinc-900/40">
          <DialogTitle className="text-lg font-bold font-mono tracking-tight text-zinc-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            {issued ? "Check-In Pass Generated" : "Pre-register Emergency Guest"}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400 mt-1 font-mono">
            {issued
              ? "Scan the QR code or transmit the unique check-in link to the guest."
              : "Pre-allocate room credentials and issue an automated check-in token."}
          </DialogDescription>
        </div>

        {!issued ? (
          <form action={handleSubmit} className="p-6 space-y-4">
            <div>
              <label
                htmlFor="prereg-name"
                className="block text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mb-1.5"
              >
                Guest Full Name
              </label>
              <input
                id="prereg-name"
                type="text"
                name="name"
                required
                placeholder="e.g. Elena Rostova"
                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 font-sans transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="prereg-phone"
                className="block text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mb-1.5"
              >
                Mobile Phone (Emergency SMS)
              </label>
              <input
                id="prereg-phone"
                type="tel"
                name="phone"
                required
                placeholder="+1 555 019 2831"
                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 font-mono transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="prereg-room"
                className="block text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mb-1.5"
              >
                Assign Room Number
              </label>
              <select
                id="prereg-room"
                name="roomId"
                required
                defaultValue=""
                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 font-mono transition-all cursor-pointer"
              >
                <option value="" disabled className="bg-zinc-900 text-zinc-500">
                  Select available room
                </option>
                {guestRooms.map((r) => (
                  <option key={r.id} value={r.id} className="bg-zinc-900 text-zinc-100">
                    Room {r.number} (Floor {r.floor})
                  </option>
                ))}
              </select>
            </div>

            <label
              htmlFor="prereg-accessibility"
              className="flex items-center gap-3 p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl cursor-pointer transition-colors hover:bg-amber-950/30"
            >
              <input
                id="prereg-accessibility"
                type="checkbox"
                name="accessibility"
                className="w-4 h-4 rounded border-amber-500/50 text-amber-500 focus:ring-amber-500 cursor-pointer bg-zinc-900"
              />
              <span className="text-xs text-amber-300 font-mono">
                Guest requires mobility / wheelchair evacuation support
              </span>
            </label>

            {error && (
              <p className="text-xs text-red-400 font-mono bg-red-950/30 border border-red-500/30 p-2.5 rounded-lg">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-mono font-semibold text-xs tracking-wider uppercase h-10 rounded-xl shadow-lg shadow-sky-950/50 mt-2"
            >
              {loading ? "Generating Credentials..." : "Generate Check-in Pass"}
            </Button>
          </form>
        ) : (
          <div className="p-6 space-y-4">
            <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-3 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-mono font-bold text-emerald-300">
                  {issued.guestName} · Room {issued.roomNumber}
                </p>
                <p className="text-[11px] text-emerald-400/80 font-mono">
                  Pending arrival — one-time token valid for live intake.
                </p>
              </div>
            </div>

            <div className="flex justify-center bg-white p-3.5 rounded-xl border border-zinc-800">
              {qrSrc && (
                <Image
                  src={qrSrc}
                  alt="Check-in QR code"
                  width={200}
                  height={200}
                  unoptimized
                  className="rounded-lg"
                />
              )}
            </div>

            <div>
              <label
                htmlFor="prereg-share-url"
                className="block text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mb-1.5"
              >
                Shareable Intake Link
              </label>
              <div className="flex gap-2">
                <input
                  id="prereg-share-url"
                  readOnly
                  value={issued.url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <Button
                  type="button"
                  onClick={copyLink}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 h-auto"
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono text-xs uppercase"
                onClick={reset}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                New Pass
              </Button>
              <Button
                type="button"
                className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs uppercase"
                onClick={() => setState((prev) => ({ ...prev, open: false }))}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

