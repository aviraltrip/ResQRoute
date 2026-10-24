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
            className="border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 shadow-2xs font-medium text-xs h-9 px-3.5 flex items-center gap-2 rounded-lg transition-all"
          />
        }
      >
        <UserPlus className="w-3.5 h-3.5 text-blue-600" />
        Pre-register Guest
      </DialogTrigger>

      <DialogContent className="max-w-md p-0 bg-white border border-zinc-200/90 rounded-2xl shadow-xl overflow-hidden text-zinc-900">
        <div className="px-6 pt-6 pb-4 border-b border-zinc-100 bg-zinc-50/50">
          <DialogTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            {issued ? "Pass Generated" : "Pre-register Guest"}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 mt-1">
            {issued
              ? "Share the QR code or link with the guest to complete self-service intake."
              : "Pre-allocate a guest room and generate a one-time setup pass."}
          </DialogDescription>
        </div>

        {!issued ? (
          <form action={handleSubmit} className="p-6 space-y-4">
            <div>
              <label
                htmlFor="prereg-name"
                className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5"
              >
                Guest Full Name
              </label>
              <input
                id="prereg-name"
                type="text"
                name="name"
                required
                placeholder="e.g. Jane Doe"
                className="w-full bg-zinc-50/80 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="prereg-phone"
                className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5"
              >
                Mobile Phone
              </label>
              <input
                id="prereg-phone"
                type="tel"
                name="phone"
                required
                placeholder="+1 555 019 2831"
                className="w-full bg-zinc-50/80 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="prereg-room"
                className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5"
              >
                Assign Room Number
              </label>
              <select
                id="prereg-room"
                name="roomId"
                required
                defaultValue=""
                className="w-full bg-zinc-50/80 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="" disabled>
                  Select available room
                </option>
                {guestRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.number} (Floor {r.floor})
                  </option>
                ))}
              </select>
            </div>

            <label
              htmlFor="prereg-accessibility"
              className="flex items-center gap-3 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl cursor-pointer hover:bg-amber-50 transition-colors"
            >
              <input
                id="prereg-accessibility"
                type="checkbox"
                name="accessibility"
                className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <span className="text-xs text-amber-900 font-medium">
                Guest requires mobility / wheelchair evacuation support
              </span>
            </label>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-lg font-medium">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs tracking-wide h-10 rounded-xl shadow-xs mt-2"
            >
              {loading ? "Generating Credentials..." : "Generate Check-in Pass"}
            </Button>
          </form>
        ) : (
          <div className="p-6 space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-900">
                  {issued.guestName} · Room {issued.roomNumber}
                </p>
                <p className="text-[11px] text-emerald-700">
                  Pending arrival — token is active for initial check-in.
                </p>
              </div>
            </div>

            <div className="flex justify-center bg-zinc-50 border border-zinc-200 rounded-xl p-4">
              {qrSrc && (
                <Image
                  src={qrSrc}
                  alt="Check-in QR code"
                  width={200}
                  height={200}
                  unoptimized
                  className="rounded-lg bg-white"
                />
              )}
            </div>

            <div>
              <label
                htmlFor="prereg-share-url"
                className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5"
              >
                Shareable Check-in Link
              </label>
              <div className="flex gap-2">
                <input
                  id="prereg-share-url"
                  readOnly
                  value={issued.url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  type="button"
                  onClick={copyLink}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white px-3 h-auto"
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
                className="flex-1 border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs"
                onClick={reset}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Issue Another
              </Button>
              <Button
                type="button"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                onClick={() => setState((prev) => ({ ...prev, open: false }))}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
