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
          Instant.<span className="text-red-600 italic pr-1">Help</span> When It<br/>Matters Most
        </h1>
        
        {/* Subtitle */}
        <p className="text-zinc-500 px-6 text-center text-sm md:text-lg max-w-2xl mb-12">
          From live triage to room-by-room evacuation, ResQRoute delivers the real-time clarity that saves lives in the first critical minutes.
        </p>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full max-w-lg mx-auto mb-16"> 
          <Link href="/staff" className="w-full sm:w-auto">
            <LiquidButton className="text-white border-red-700 bg-red-600 hover:bg-red-700 rounded-full w-full sm:w-auto shadow-lg shadow-red-600/20" size={'xl'}>
              <Heart className="w-4 h-4 fill-white mr-1" /> Trigger Distress Alarm
            </LiquidButton>
          </Link>
          <Link href="/responder/INC123" className="w-full sm:w-auto">
            <LiquidButton className="text-zinc-700 border border-zinc-200 bg-white hover:bg-zinc-50 rounded-full w-full sm:w-auto shadow-sm" variant="outline" size={'xl'}>
              <Play className="w-4 h-4 mr-1 fill-zinc-700" /> Watch Live Demo
            </LiquidButton>
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