"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ShieldAlert, RotateCcw, Home, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-100 blur-[120px] rounded-full pointer-events-none opacity-50" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-100 blur-[120px] rounded-full pointer-events-none opacity-50" />

      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl shadow-xl p-8 relative z-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-7 h-7 text-red-600" />
        </div>

        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Service Recovery</h1>
        <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
          ResQRoute encountered an unexpected connection error. The system is designed for continuous emergency availability.
        </p>

        <div className="flex flex-col gap-3">
          <Button
            type="button"
            onClick={() => reset()}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold h-11 rounded-xl shadow-sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Retry Connection
          </Button>

          <Link href="/helpline" className="w-full">
            <Button
              type="button"
              variant="outline"
              className="w-full border-zinc-200 text-red-700 bg-red-50/50 hover:bg-red-50 font-medium h-11 rounded-xl"
            >
              <LifeBuoy className="w-4 h-4 mr-2" />
              Emergency Helplines (112)
            </Button>
          </Link>

          <Link href="/" className="w-full">
            <Button
              type="button"
              variant="ghost"
              className="w-full text-zinc-600 hover:bg-zinc-100 font-medium h-11 rounded-xl"
            >
              <Home className="w-4 h-4 mr-2" />
              Home Portal
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
