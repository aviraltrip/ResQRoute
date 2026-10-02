"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ShieldAlert, RotateCcw, Home, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StaffError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Staff Dashboard caught error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-100 blur-[120px] rounded-full pointer-events-none opacity-50" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-amber-100 blur-[120px] rounded-full pointer-events-none opacity-50" />

      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl shadow-lg p-8 relative z-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-7 h-7 text-red-600" />
        </div>

        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Staff Portal Recovery</h1>
        <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
          The command center encountered a transient data connection issue. You can reload the session or continue with cached emergency services.
        </p>

        {error?.message && (
          <div className="bg-red-50/70 border border-red-200/80 rounded-xl p-3 mb-6 text-left flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="overflow-hidden">
              <p className="text-[11px] font-mono text-red-800 break-words">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-[10px] font-mono text-red-500 mt-1">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button
            type="button"
            onClick={() => reset()}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold h-11 rounded-xl shadow-sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reload Command Center
          </Button>

          <Link href="/" className="w-full">
            <Button
              type="button"
              variant="outline"
              className="w-full border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-medium h-11 rounded-xl"
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
