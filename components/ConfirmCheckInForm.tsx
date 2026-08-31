"use client";

import React, { useState } from "react";
import { confirmGuestCheckIn } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Phone, CheckCircle2 } from "lucide-react";

export default function ConfirmCheckInForm({
  setupToken,
  defaultPhone,
  defaultAccessibility,
}: {
  setupToken: string;
  defaultPhone: string;
  defaultAccessibility: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    await confirmGuestCheckIn(setupToken, formData);
  }

  return (
    <form action={handleSubmit} className="p-8 pt-6 space-y-6">
      <div>
        <label
          htmlFor="confirm-phone"
          className="block text-[11px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2.5 flex items-center gap-2"
        >
          <Phone className="w-3.5 h-3.5" /> CONFIRM PHONE
        </label>
        <input
          id="confirm-phone"
          type="tel"
          name="phone"
          required
          defaultValue={defaultPhone}
          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3.5 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
        />
        <p className="text-[11px] text-zinc-500 mt-2">We'll only contact this number during a verified emergency.</p>
      </div>

      <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-100 rounded-xl cursor-pointer hover:bg-orange-100/50 transition-colors">
        <input
          type="checkbox"
          name="accessibility"
          id="accessibility"
          defaultChecked={defaultAccessibility}
          className="w-5 h-5 rounded border-orange-200 text-orange-500 focus:ring-orange-500 cursor-pointer bg-white"
        />
        <label htmlFor="accessibility" className="text-[14.5px] text-orange-900 cursor-pointer select-none font-medium">
          I require mobility / evacuation assistance
        </label>
      </div>

      <Button
        disabled={loading}
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-[52px] rounded-xl shadow-md text-[16px] mt-4 transition-all"
      >
        {loading ? "Activating pass..." : (
          <>
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Confirm &amp; Activate
          </>
        )}
      </Button>
    </form>
  );
}
