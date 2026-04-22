import React from "react";
import { ShieldAlert, Heart, UserSquare2 } from "lucide-react";
import { WebGLShader } from "@/components/ui/web-gl-shader";
import { AnimatedCard } from "@/components/ui/animated-card";

export const dynamic = "force-dynamic";

export default async function DemoPortal() {
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
          <p className="text-xs text-zinc-500 font-medium tracking-wide">Next Generation Emergency Platform</p>
        </div>

        {/* Title */}
        <h1 className="mb-6 text-zinc-900 text-center text-5xl sm:text-7xl font-extrabold tracking-tighter md:text-[clamp(3rem,8vw,6rem)] leading-tight">
          Instant.<span className="text-red-600 italic pr-1">Help</span> When It<br />Matters Most
        </h1>

        {/* Subtitle */}
        <p className="text-zinc-500 px-6 text-center text-sm md:text-lg max-w-2xl mb-16">
          From live triage to room-by-room evacuation, ResQRoute delivers the real-time clarity that saves lives in the first critical minutes.
        </p>

        {/* Animated Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto">
          
          <AnimatedCard 
            title="Staff Command Center"
            description="Desktop dashboard. Trigger emergencies, monitor live guest evacuations, and read the real-time AI-triaged distress feed."
            icon={<Heart className="w-7 h-7" />}
            href="/staff"
            badgeText="Operator"
            delay={0.1}
          />

          <AnimatedCard 
            title="Self Check-In Kiosk"
            description="Guest registration interface. Allows guests to securely enter details and declare mobility requirements before receiving a digital pass."
            icon={<UserSquare2 className="w-7 h-7" />}
            href="/check-in"
            badgeText="Guest"
            delay={0.3}
          />

        </div>

      </main>
    </div>
  )
}