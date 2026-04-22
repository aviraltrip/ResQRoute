import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ShieldAlert, Play, Heart } from "lucide-react";
import CheckInForm from "@/components/CheckInForm";
import { WebGLShader } from "@/components/ui/web-gl-shader";
import { LiquidButton } from "@/components/ui/liquid-glass-button";

export const dynamic = "force-dynamic";

export default async function DemoPortal() {
  // Fetch available rooms
  const rooms = await prisma.room.findMany({
    orderBy: { number: 'asc' }
  });

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center bg-white overflow-x-hidden font-sans">
      <WebGLShader />

      {/* Navbar / Header */}
      <header className="w-full flex items-center justify-between p-6 max-w-6xl mx-auto z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center p-2 rounded-xl border border-red-100 shadow-sm bg-white">
            <ShieldAlert className="w-5 h-5 text-red-600" />
          </div>
          <span className="text-xl font-bold text-zinc-900 tracking-tight">ResQRoute</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-24 w-full max-w-4xl mx-auto">

        {/* Badge */}
        <div className="mb-8 flex items-center justify-center gap-2 px-4 py-1.5 rounded-full border border-zinc-200 bg-white shadow-sm">
          <span className="relative flex h-2 w-2 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500"></span>
          </span>
          <p className="text-xs text-zinc-500 font-medium">Next Generation Emergency Platform</p>
        </div>

        {/* Title */}
        <h1 className="mb-6 text-zinc-900 text-center text-5xl sm:text-7xl font-extrabold tracking-tighter md:text-[clamp(3rem,8vw,6rem)] leading-tight">
          Instant.<span className="text-red-600 italic pr-1">Help</span> When It<br />Matters Most
        </h1>

        {/* Subtitle */}
        <p className="text-zinc-500 px-6 text-center text-sm md:text-lg max-w-2xl mb-12">
          From live triage to room-by-room evacuation, ResQRoute delivers the real-time clarity that saves lives in the first critical minutes.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl mx-auto mb-16">
          {/* Staff Dashboard Link */}
          <Link href="/staff" className="group relative p-[1px] rounded-[24px] overflow-hidden focus:outline-none focus:ring-4 focus:ring-blue-500/50">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 group-hover:from-blue-600 group-hover:via-indigo-600 group-hover:to-purple-600 transition-colors duration-500" />
            <div className="relative h-full bg-white backdrop-blur-2xl rounded-[24px] p-8 flex flex-col justify-between border border-zinc-100 shadow-sm">
              <div>
                <div className="w-14 h-14 bg-blue-50 rounded-[16px] flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <Heart className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 mb-2">Staff Command Center</h2>
                <p className="text-zinc-500 leading-relaxed">Desktop dashboard. Trigger emergencies, monitor live guest evacuations, and read the real-time AI-triaged distress feed.</p>
              </div>
              <div className="mt-8 flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform duration-300">
                Launch Dashboard <Play className="ml-2 w-4 h-4 fill-blue-600" />
              </div>
            </div>
          </Link>

          {/* Responder View Link */}
          <Link href="/responder/INC123" className="group relative p-[1px] rounded-[24px] overflow-hidden focus:outline-none focus:ring-4 focus:ring-orange-500/50">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 group-hover:from-orange-600 group-hover:via-red-600 group-hover:to-pink-600 transition-colors duration-500" />
            <div className="relative h-full bg-white backdrop-blur-2xl rounded-[24px] p-8 flex flex-col justify-between border border-zinc-100 shadow-sm">
              <div>
                <div className="w-14 h-14 bg-orange-50 rounded-[16px] flex items-center justify-center text-orange-600 mb-6 group-hover:scale-110 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 mb-2">Responder Tactical Map</h2>
                <p className="text-zinc-500 leading-relaxed">Tablet interface. Gives first responders a blueprint of the origin point and tracks the priority mobility-impaired guests.</p>
              </div>
              <div className="mt-8 flex items-center text-orange-600 font-semibold group-hover:translate-x-2 transition-transform duration-300">
                Launch Tablet View <Play className="ml-2 w-4 h-4 fill-orange-600" />
              </div>
            </div>
          </Link>
        </div>

        {/* Check-in section */}
        <div className="w-full max-w-2xl mt-8 pt-12 border-t border-zinc-100 flex flex-col items-center">
          <p className="text-sm font-medium text-zinc-400 mb-6 uppercase tracking-widest">Simulate Guest Devices</p>
          <div className="w-full bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
            <CheckInForm rooms={rooms} />
          </div>
        </div>

      </main>
    </div>
  )
}