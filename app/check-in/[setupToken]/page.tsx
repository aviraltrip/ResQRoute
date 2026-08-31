import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ConfirmCheckInForm from "@/components/ConfirmCheckInForm";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirm Check-In — ResQRoute",
  description: "Confirm guest details and initialize room safety pass.",
};

export default async function ConfirmCheckInPage({
  params,
}: {
  params: Promise<{ setupToken: string }>;
}) {
  const { setupToken } = await params;

  const guest = await prisma.guest.findUnique({
    where: { setupToken },
    include: { room: true },
  });

  if (!guest) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">Invalid Link</h1>
          <p className="text-zinc-500 text-sm">
            This check-in link is invalid or has already been used. Please ask the front desk to issue a new one.
          </p>
        </div>
      </div>
    );
  }

  if (guest.status !== "pending_arrival") {
    redirect(`/g/${guest.token}`);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-100 blur-[120px] rounded-full pointer-events-none opacity-50" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-orange-100 blur-[120px] rounded-full pointer-events-none opacity-50" />

      <div className="w-full max-w-md relative z-10">
        <div className="mb-8 text-center">
          <div className="inline-block px-3 py-1 bg-white border border-zinc-200 rounded-full mb-4 shadow-sm">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">ResQRoute Platform</span>
          </div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">Welcome, {guest.name.split(" ")[0]}</h1>
          <p className="text-zinc-500 text-sm">Confirm your details to receive your digital safety pass.</p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100 bg-blue-50/40 flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg border border-blue-200">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-blue-600">Pre-Assigned by Front Desk</p>
              <p className="text-sm text-zinc-900 font-semibold">
                {guest.name} · Room {guest.room.number} (Floor {guest.room.floor})
              </p>
            </div>
          </div>

          <ConfirmCheckInForm
            setupToken={setupToken}
            defaultPhone={guest.phone}
            defaultAccessibility={guest.accessibilityFlag}
          />
        </div>
      </div>
    </div>
  );
}
