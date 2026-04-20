import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Siren, Navigation, Smartphone, Activity, ShieldAlert, ArrowRight } from "lucide-react";

import CheckInForm from "@/components/CheckInForm";

export const dynamic = "force-dynamic";

export default async function DemoPortal() {
  // Fetch available rooms
  const rooms = await prisma.room.findMany({
    orderBy: { number: 'asc' }
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col font-sans relative overflow-hidden">
      
      {/* Background Glow Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/30 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-red-600/20 blur-[150px] rounded-full pointer-events-none" />

      {/* Navbar / Header */}
      <header className="relative z-10 p-6 flex flex-col items-center justify-center pt-24 pb-12 text-center">
        <div className="inline-flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 border border-slate-700/50 rounded-2xl mb-6 shadow-2xl shadow-blue-900/20 backdrop-blur-xl">
          <ShieldAlert className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500" />
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white via-slate-200 to-slate-500">
          ResQRoute
        </h1>
        <p className="mt-4 text-slate-400 text-lg sm:text-xlg max-w-2xl text-center px-4 font-medium">
          Real-time hotel emergency coordination. Experience the synchronization across all devices instantly in this simulation portal.
        </p>
      </header>

      {/* Main Simulation Routes */}
      <main className="relative z-10 flex-1 px-4 pb-20 w-full max-w-6xl mx-auto flex flex-col items-center">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-12">
          
          {/* Staff Dashboard Link */}
          <Link href="/staff" className="group relative p-[1px] rounded-3xl overflow-hidden focus:outline-none focus:ring-4 focus:ring-blue-500/50">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 group-hover:from-blue-600 group-hover:via-indigo-600 group-hover:to-purple-600 transition-colors duration-500" />
            <div className="relative h-full bg-slate-900/90 backdrop-blur-2xl rounded-3xl p-8 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all duration-300">
                  <Activity className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Staff Command Center</h2>
                <p className="text-slate-400 leading-relaxed">Desktop dashboard. Trigger emergencies, monitor live guest evacuations, and read the real-time AI-triaged distress feed.</p>
              </div>
              <div className="mt-8 flex items-center text-blue-400 font-semibold group-hover:translate-x-2 transition-transform duration-300">
                Launch Dashboard <ArrowRight className="ml-2 w-5 h-5" />
              </div>
            </div>
          </Link>

          {/* Responder View Link */}
          <Link href="/responder/INC123" className="group relative p-[1px] rounded-3xl overflow-hidden focus:outline-none focus:ring-4 focus:ring-orange-500/50">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 group-hover:from-orange-600 group-hover:via-red-600 group-hover:to-pink-600 transition-colors duration-500" />
            <div className="relative h-full bg-slate-900/90 backdrop-blur-2xl rounded-3xl p-8 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-400 mb-6 group-hover:scale-110 group-hover:bg-orange-500/20 transition-all duration-300">
                  <Siren className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Responder Tactical Map</h2>
                <p className="text-slate-400 leading-relaxed">Tablet interface. Gives first responders a blueprint of the origin point and tracks the priority mobility-impaired guests.</p>
              </div>
              <div className="mt-8 flex items-center text-orange-400 font-semibold group-hover:translate-x-2 transition-transform duration-300">
                Launch Tablet View <ArrowRight className="ml-2 w-5 h-5" />
              </div>
            </div>
          </Link>

        </div>

        {/* Guest Devices List -> Replaced with CheckIn */}
        <div className="w-full mt-10">
          <CheckInForm rooms={rooms} />
        </div>

      </main>
    </div>
  );
}
