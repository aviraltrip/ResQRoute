"use client";

import React, { useState } from "react";
import { triggerDistress, markGuestSafe } from "@/app/actions";
import { ShieldCheck, ActivitySquare } from "lucide-react";

export default function GuestActionButtons({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [safeLoading, setSafeLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "safe" | "help">("idle");

  async function handlePanic() {
    setLoading(true);
    try {
      await triggerDistress(token, "Guest manually hit panic button");
      setStatus("help");
    } catch (e) {
      console.error("Failed to trigger distress", e);
    }
    setLoading(false);
  }

  async function handleSafe() {
    setSafeLoading(true);
    try {
      await markGuestSafe(token);
      setStatus("safe");
    } catch (e) {
      console.error("Failed to mark safe", e);
    }
    setSafeLoading(false);
  }

  return (
    <section className="flex gap-3">
      <button 
        type="button"
        onClick={handleSafe}
        disabled={loading || safeLoading}
        className={`flex-1 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all font-bold tracking-wide 
          ${status === "safe" 
            ? "bg-green-500 text-white shadow-none ring-4 ring-green-900/50 scale-95" 
            : "bg-gradient-to-br from-green-500 to-emerald-700 hover:from-green-400 hover:to-emerald-600 text-white shadow-lg shadow-green-900/30"
          }`}
      >
        <ShieldCheck className="w-8 h-8" />
        {safeLoading ? "UPDATING..." : status === "safe" ? "MARKED SAFE" : "I'M SAFE"}
      </button>
      
      <button 
        type="button"
        onClick={handlePanic}
        disabled={loading}
        className={`flex-1 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all font-bold tracking-wide
          ${status === "help"
            ? "bg-red-600 text-white shadow-[0_0_30px_rgba(220,38,38,0.5)] ring-4 ring-red-900/50 scale-95"
            : "bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white shadow-lg shadow-red-900/30"
          }`}
      >
        <ActivitySquare className="w-8 h-8" />
        {loading ? "SENDING..." : status === "help" ? "HELP ON THE WAY" : "NEED HELP"}
      </button>
    </section>
  );
}
