import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CheckInForm from "@/components/CheckInForm";

export const dynamic = "force-dynamic";

export default async function CheckInPage() {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get("resq_guest_token")?.value;
  if (existingToken) {
    const existing = await prisma.guest.findUnique({ where: { token: existingToken } });
    if (existing) redirect(`/g/${existing.token}`);
  }

  const rooms = await prisma.room.findMany({
    orderBy: { number: 'asc' }
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-100 blur-[120px] rounded-full pointer-events-none opacity-50" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-orange-100 blur-[120px] rounded-full pointer-events-none opacity-50" />

      <div className="w-full max-w-md relative z-10">
        <div className="mb-10 text-center">
          <div className="inline-block px-3 py-1 bg-white border border-zinc-200 rounded-full mb-4 shadow-sm">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">ResQRoute Platform</span>
          </div>
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight mb-2">Guest Portal</h1>
          <p className="text-zinc-500 text-sm">Secure digital access point for real-time safety</p>
        </div>
        <CheckInForm rooms={rooms} />
      </div>
    </div>
  );
}
