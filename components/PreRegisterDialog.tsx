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
    } catch {
      /* clipboard blocked, ignore */
    }
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
            className="border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 shadow-sm"
          />
        }
      >
        <UserPlus className="w-4 h-4 mr-2" />
        Pre-register Guest
      </DialogTrigger>

      <DialogContent className="max-w-md p-0 bg-white border border-zinc-200 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-zinc-100">
          <DialogTitle className="text-lg font-bold text-zinc-900">
            {issued ? "Pass Generated" : "Pre-register Guest"}
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-500 mt-1">
            {issued
              ? "Show the QR or share the link with the guest."
              : "Allocate a room and issue a one-time check-in link."}
          </DialogDescription>
        </div>

        {!issued ? (
          <form action={handleSubmit} className="p-6 space-y-5">
            <div>
              <label
                htmlFor="prereg-name"
                className="block text-[11px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2"
              >
                Guest Name
              </label>
              <input
                id="prereg-name"
                type="text"
                name="name"
                required
                placeholder="Jane Doe"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="prereg-phone"
                className="block text-[11px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2"
              >
                Phone
              </label>
              <input
                id="prereg-phone"
                type="tel"
                name="phone"
                required
                placeholder="+91 90000 00000"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="prereg-room"
                className="block text-[11px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2"
              >
                Allocate Room
              </label>
              <select
                id="prereg-room"
                name="roomId"
                required
                defaultValue=""
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer"
              >
                <option value="" disabled>
                  Select a room
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
              className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl cursor-pointer"
            >
              <input
                id="prereg-accessibility"
                type="checkbox"
                name="accessibility"
                className="w-5 h-5 rounded border-orange-200 text-orange-500 focus:ring-orange-500 cursor-pointer bg-white"
              />
              <span className="text-[13.5px] text-orange-900 font-medium">
                Guest requires mobility / evacuation assistance
              </span>
            </label>

            {error && (
              <p className="text-sm text-red-600 font-medium">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11 rounded-xl shadow-md"
            >
              {loading ? "Generating..." : "Generate Check-in Pass"}
            </Button>
          </form>
        ) : (
          <div className="p-6 space-y-5">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-[13px] font-semibold text-emerald-900">
                  {issued.guestName} · Room {issued.roomNumber}
                </p>
                <p className="text-[11px] text-emerald-700">
                  Pending arrival — pass expires after first use.
                </p>
              </div>
            </div>

            <div className="flex justify-center bg-zinc-50 border border-zinc-200 rounded-xl p-4">
              {qrSrc && (
                <Image
                  src={qrSrc}
                  alt="Check-in QR code"
                  width={240}
                  height={240}
                  unoptimized
                  className="rounded-lg bg-white"
                />
              )}
            </div>

            <div>
              <label
                htmlFor="prereg-share-url"
                className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2"
              >
                Or share this link
              </label>
              <div className="flex gap-2">
                <input
                  id="prereg-share-url"
                  readOnly
                  value={issued.url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-[12px] text-zinc-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  type="button"
                  onClick={copyLink}
                  className="bg-zinc-900 hover:bg-zinc-700 text-white px-3"
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-zinc-200 text-zinc-700"
                onClick={reset}
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                Issue Another
              </Button>
              <Button
                type="button"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
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

