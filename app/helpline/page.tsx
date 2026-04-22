import type { ReactNode } from "react";
import Link from "next/link";
import { Phone, ShieldAlert, ArrowLeft, MapPin, Flame, Cross, Shield, Navigation } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  findHelplines,
  helplineLabel,
  kindForCategory,
  kindsForIncident,
  type Helpline,
  type HelplineKind,
} from "@/lib/overpass";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import HelplineMapClient from "@/components/HelplineMapClient";

const KIND_ICON: Record<HelplineKind, ReactNode> = {
  fire_station: <Flame className="w-5 h-5 text-red-500" />,
  hospital: <Cross className="w-5 h-5 text-emerald-500" />,
  police: <Shield className="w-5 h-5 text-blue-500" />,
};

const KIND_BORDER: Record<HelplineKind, string> = {
  fire_station: "border-red-200/60 bg-gradient-to-br from-white to-red-50/50 hover:border-red-300",
  hospital: "border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/50 hover:border-emerald-300",
  police: "border-blue-200/60 bg-gradient-to-br from-white to-blue-50/50 hover:border-blue-300",
};

const CATEGORY_LABEL: Record<string, string> = {
  medical: "Medical",
  mobility: "Mobility",
  fire_exposure: "Fire / Smoke",
  structural: "Structural",
  panic: "Panic",
};

export default async function HelplinePage(props: { searchParams: Promise<{ roomId?: string }> }) {
  const searchParams = await props.searchParams;
  const roomId = searchParams?.roomId;

  const hotel = await prisma.hotel.findFirst();
  const incident = await prisma.incident.findFirst({ orderBy: { startedAt: "desc" } });

  const latestMessage = incident
    ? await prisma.distressMessage.findFirst({
        where: {
          incidentId: incident.id,
          category: { not: null },
          ...(roomId ? { roomId } : {})
        },
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      })
    : null;

  let primaryKind: HelplineKind;
  let derivedFrom: string;
  if (latestMessage?.category) {
    primaryKind = kindForCategory(latestMessage.category);
    derivedFrom = `AI category: ${CATEGORY_LABEL[latestMessage.category] ?? latestMessage.category}`;
  } else if (incident) {
    primaryKind = kindsForIncident(incident.type)[0];
    derivedFrom = `Incident type: ${incident.type}`;
  } else {
    primaryKind = "fire_station";
    derivedFrom = "No active incident";
  }

  const helplines = hotel
    ? await findHelplines(hotel.latitude, hotel.longitude, [primaryKind])
    : [];

  return (
    <div className="min-h-screen bg-[#F6F8FD] text-slate-900 font-sans p-6 md:p-8 relative overflow-hidden selection:bg-indigo-200 selection:text-indigo-900">
      
      {/* ─── DYNAMIC HACKATHON BACKGROUND ─── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-blue-100/40 mix-blend-multiply filter blur-[100px] animate-pulse" style={{ animationDuration: '15s' }} />
        <div className="absolute top-[10%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-purple-100/40 mix-blend-multiply filter blur-[120px] animate-pulse" style={{ animationDuration: '20s', animationDelay: '5s' }} />
        <div className="absolute -bottom-[20%] left-[20%] w-[80vw] h-[80vw] rounded-full bg-red-100/30 mix-blend-multiply filter blur-[100px] animate-pulse" style={{ animationDuration: '18s', animationDelay: '2s' }} />
        
        {/* Subtle dot pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.15]" 
          style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '32px 32px' }} 
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto h-[calc(100vh-64px)] flex flex-col">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-6">
          <Link
            href="/staff"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-md border border-slate-200/60 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white transition-all shadow-sm font-bold text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Command Center
          </Link>
          <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/60 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute" />
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Emergency Protocol Active</span>
          </div>
        </div>

        {/* Title Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 bg-white/40 backdrop-blur-2xl border border-white/80 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-tr from-red-500 to-rose-400 blur-lg opacity-40 rounded-xl animate-pulse" />
              <div className="relative bg-white p-3.5 rounded-2xl border border-red-100 shadow-md">
                <ShieldAlert className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">
                Nearest {helplineLabel(primaryKind)}{helplineLabel(primaryKind).endsWith("s") ? "" : "s"}
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-slate-500 font-bold text-sm">
                  {hotel ? `${hotel.name}` : ""}
                </p>
                <span className="text-slate-300">•</span>
                <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-widest font-black border border-red-100">
                  {derivedFrom}
                </span>
              </div>
            </div>
          </div>

          {latestMessage?.summary && (
            <div className="max-w-md bg-red-50/50 border border-red-100 p-4 rounded-2xl relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-400 to-red-600" />
              <p className="text-slate-700 italic text-sm font-semibold pl-2">
                &ldquo;{latestMessage.summary}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 min-h-0 pb-6">
          
          {/* Map Section */}
          <div className="lg:col-span-3 h-full min-h-[400px]">
            {hotel ? (
              <HelplineMapClient
                hotelLat={hotel.latitude}
                hotelLng={hotel.longitude}
                hotelName={hotel.name}
                helplines={helplines}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-white/40 border border-dashed border-slate-300 rounded-3xl text-slate-500 font-bold">
                No hotel configured.
              </div>
            )}
          </div>

          {/* List Section */}
          <div className="lg:col-span-2 flex flex-col gap-4 h-full min-h-[400px]">
            <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-3xl flex-1 flex flex-col overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              
              <div className="px-6 py-4 border-b border-slate-100/50 flex items-center justify-between bg-white/40">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                  Ranked {helplineLabel(primaryKind)}s
                </h2>
                <div className="bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-500 font-black">
                  {helplines.length} FOUND
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {helplines.length === 0 && (
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center shadow-sm">
                    <p className="text-sm font-bold text-red-600 mb-2">No nearby {helplineLabel(primaryKind).toLowerCase()}s found via Overpass API.</p>
                    <p className="text-xs text-red-400 font-medium">Please fall back to the national emergency number.</p>
                  </div>
                )}

                {helplines.map((h: Helpline, idx: number) => (
                  <div
                    key={h.id}
                    className={`relative rounded-2xl p-5 border ${KIND_BORDER[h.kind]} shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group`}
                  >
                    <div className="absolute top-4 right-4 bg-white px-2 py-1 rounded-md border border-slate-100 text-[10px] font-black text-slate-400 shadow-sm">
                      #{idx + 1}
                    </div>
                    
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                          {KIND_ICON[h.kind]}
                        </div>
                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">
                          {helplineLabel(h.kind)}
                        </span>
                      </div>
                    </div>
                    
                    <h3 className="text-slate-900 font-black text-lg mb-4 pr-8">{h.name}</h3>
                    
                    <div className="flex items-center justify-between mt-auto">
                      {h.phone ? (
                        <a
                          href={`tel:${h.phone}`}
                          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl shadow-sm shadow-red-500/20 font-bold text-sm transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                          {h.phone}
                        </a>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">No Direct Line</span>
                      )}
                      
                      <span className="text-[12px] font-black text-slate-600 bg-white/80 px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {(h.distanceMeters / 1000).toFixed(2)} km
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sticky Footer for National Line */}
              <div className="border-t border-slate-100/50 bg-red-50/80 p-5 mt-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-black tracking-widest text-red-500 mb-0.5">
                      National Emergency (India)
                    </p>
                    <p className="text-xs font-bold text-red-400">Always available 24/7</p>
                  </div>
                  <a
                    href="tel:112"
                    className="flex items-center gap-2 text-2xl font-black text-red-600 hover:text-red-500 bg-white px-5 py-2 rounded-xl shadow-sm border border-red-200 transition-transform hover:scale-105"
                  >
                    112 <Navigation className="w-5 h-5 rotate-90" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
