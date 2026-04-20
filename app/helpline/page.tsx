import React from "react";
import Link from "next/link";
import { Phone, ShieldAlert, ArrowLeft, Building, Users } from "lucide-react";

export default function HelplinePage() {
  return (
    <div className="min-h-screen bg-[#050b14] text-slate-200 flex flex-col font-sans p-6 md:p-12 items-center justify-center relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[800px] h-[400px] bg-red-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-900/5 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-3xl z-10">
        
        <Link href="/staff" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Command Center
        </Link>
        
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/50">
            <ShieldAlert className="w-8 h-8 text-red-500 animate-pulse" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Emergency Helplines</h1>
            <p className="text-red-400 font-medium">Alarm successfully triggered. Incident logged.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-slate-900/50 border border-red-900/50 hover:bg-black/40 transition-colors rounded-2xl p-6 shadow-xl backdrop-blur-md relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-6">
              <div className="bg-red-950/50 p-3 rounded-lg border border-red-900">
                <Phone className="w-6 h-6 text-red-500" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-red-500 bg-red-500/10 px-2 py-1 rounded">Primary</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Local Emergency (911)</h2>
            <p className="text-sm text-slate-400 mb-6">Immediate fire, medical, or police dispatch for the Grand Harbor zone.</p>
            <p className="text-3xl font-bold text-red-400 font-mono tracking-wider">911</p>
          </div>

          <div className="bg-slate-900/50 border border-blue-900/40 hover:bg-black/40 transition-colors rounded-2xl p-6 shadow-xl backdrop-blur-md relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-6">
              <div className="bg-blue-950/50 p-3 rounded-lg border border-blue-900">
                <Building className="w-6 h-6 text-blue-500" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-blue-500 bg-blue-500/10 px-2 py-1 rounded">Internal</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Hotel Security Substation</h2>
            <p className="text-sm text-slate-400 mb-6">Connect directly to the Grand Harbor basement security operational desk.</p>
            <p className="text-3xl font-bold text-blue-400 font-mono tracking-wider">Dial 00</p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 hover:bg-black/40 transition-colors rounded-2xl p-6 shadow-xl backdrop-blur-md md:col-span-2 flex flex-col md:flex-row items-center gap-6 group">
             <div className="bg-orange-500/10 p-4 rounded-xl border border-orange-500/20 shrink-0">
                <Users className="w-8 h-8 text-orange-500" />
             </div>
             <div>
               <h2 className="text-xl font-bold text-white mb-1">Incident Co-ordinator</h2>
               <p className="text-sm text-slate-400 mb-2">Reach the designated safety officer for mass evacuation protocols.</p>
               <p className="text-xl font-bold text-orange-400 font-mono tracking-wider">+1 (800) 555-0199</p>
             </div>
          </div>

        </div>

      </div>
    </div>
  );
}
