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
    <div className="w-full max-w-md mx-auto bg-[#111118]/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent pointer-events-none" />

      <div className="p-6 border-b border-white/5 bg-white/[0.02]">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <DoorOpen className="w-5 h-5 text-blue-400" /> Self Check-In Kiosk
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Please enter your details to receive your digital safety pass.
        </p>
      </div>

      <form action={handleSubmit} className="p-6 space-y-5 relative z-10">

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <User className="w-3 h-3" /> Full Name
          </label>
          <input
            type="text"
            name="name"
            required
            placeholder="Jane Doe"
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Phone className="w-3 h-3" /> Phone Number
          </label>
          <input
            type="tel"
            name="phone"
            required
            placeholder="+1 (555) 000-0000"
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <DoorOpen className="w-3 h-3" /> Room Selection
          </label>
          <select
            name="roomId"
            required
            defaultValue=""
            className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
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

        <div className="flex items-center gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl cursor-pointer hover:bg-orange-500/20 transition-colors">
          <input
            type="checkbox"
            name="accessibility"
            id="accessibility"
            className="w-5 h-5 rounded border-orange-500 bg-transparent focus:ring-orange-500 accent-orange-500 cursor-pointer"
          />
          <label htmlFor="accessibility" className="text-sm font-medium text-orange-200 cursor-pointer select-none">
            I require mobility/evacuation assistance
          </label>
        </div>

        <Button
          disabled={loading}
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-14 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] text-lg mt-2"
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