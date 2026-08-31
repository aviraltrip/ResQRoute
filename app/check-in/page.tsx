import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { QrCode, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Guest Portal & Check-In — ResQRoute",
  description: "Secure digital guest pass and emergency access point.",
};

export default async function CheckInPage() {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get("resq_guest_token")?.value;
  if (existingToken) {
    const existing = await prisma.guest.findUnique({ where: { token: existingToken } });
    if (existing) redirect(`/g/${existing.token}`);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
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

        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 mb-4">
            <QrCode className="w-7 h-7 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Scan your check-in pass</h2>
          <p className="text-zinc-500 text-sm leading-relaxed mb-5">
            Room assignments are issued by the front desk. Please scan the QR code
            on your key card, or open the personal link they sent to your phone.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left flex gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[13px] text-amber-900 leading-relaxed">
              For your safety, only hotel staff can allocate rooms. This prevents
              double-bookings and lets us reach the right guest in an emergency.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
