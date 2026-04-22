"use client";

import React, { useState } from "react";
import { checkInGuest } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { DoorOpen, Phone, User, CheckCircle2 } from "lucide-react";

type Room = {
  id: string;
  number: string;
  floor: number;
};

export default function CheckInForm({ rooms }: { rooms: Room[] }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    await checkInGuest(formData);
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl overflow-hidden shadow-sm relative border border-zinc-200">

      <div className="p-8 pb-6 border-b border-zinc-100">
        <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-3 tracking-tight">
          <DoorOpen className="w-6 h-6 text-blue-600" /> Self Check-In Kiosk
        </h2>
        <p className="text-zinc-500 mt-2 text-[15px]">
          Please enter your details to receive your digital safety pass.
        </p>
      </div>

      <form action={handleSubmit} className="p-8 pt-6 space-y-6 relative z-10">

        <div>
          <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2.5 flex items-center gap-2">
            <User className="w-3.5 h-3.5" /> FULL NAME
          </label>
          <input
            type="text"
            name="name"
            required
            placeholder="Jane Doe"
            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3.5 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2.5 flex items-center gap-2">
            <Phone className="w-3.5 h-3.5" /> PHONE NUMBER
          </label>
          <input
            type="tel"
            name="phone"
            required
            placeholder="+1 (555) 000-0000"
            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3.5 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2.5 flex items-center gap-2">
            <DoorOpen className="w-3.5 h-3.5" /> ROOM SELECTION
          </label>
          <select
            name="roomId"
            required
            defaultValue=""
            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3.5 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer shadow-sm"
          >
            <option value="" disabled>
              Select an available room
            </option>
            {rooms
              .filter(r => !r.number.includes("EXIT") && !r.number.includes("LOBBY"))
              .map((room) => (
                <option key={room.id} value={room.id}>
                  Room {room.number} (Floor {room.floor})
                </option>
              ))}
          </select>
        </div>

        <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-100 rounded-xl cursor-pointer hover:bg-orange-100/50 transition-colors">
          <input
            type="checkbox"
            name="accessibility"
            id="accessibility"
            className="w-5 h-5 rounded border-orange-200 text-orange-500 focus:ring-orange-500 cursor-pointer bg-white"
          />
          <label htmlFor="accessibility" className="text-[14.5px] text-orange-900 cursor-pointer select-none font-medium">
            I require mobility/evacuation assistance
          </label>
        </div>

        <Button
          disabled={loading}
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-[52px] rounded-xl shadow-md text-[16px] mt-4 transition-all"
        >
          {loading
            ? "Registering pass..."
            : (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Complete Check-In
              </>
            )}
        </Button>
      </form>
    </div>
  );
}