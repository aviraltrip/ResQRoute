import type { ReactNode } from "react";
import Link from "next/link";
import { Phone, ShieldAlert, ArrowLeft, MapPin, Flame, Cross, Shield } from "lucide-react";
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
  fire_station: <Flame className="w-5 h-5 text-red-400" />,
  hospital: <Cross className="w-5 h-5 text-emerald-400" />,
  police: <Shield className="w-5 h-5 text-blue-400" />,
};

const KIND_BORDER: Record<HelplineKind, string> = {
  fire_station: "border-red-900/50 bg-red-950/20",
  hospital: "border-emerald-900/50 bg-emerald-950/20",
  police: "border-blue-900/50 bg-blue-950/20",
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
    <div className="min-h-screen bg-[#050b14] text-slate-200 font-sans p-6 md:p-10 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[800px] h-[400px] bg-red-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-900/5 blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto">
        <Link
          href="/staff"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Command Center
        </Link>

        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/50">
            <ShieldAlert className="w-8 h-8 text-red-500 animate-pulse" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Nearest {helplineLabel(primaryKind)}{helplineLabel(primaryKind).endsWith("s") ? "" : "s"}
            </h1>
            <p className="text-red-400 font-medium">
              {hotel ? `${hotel.name} ` : ""}
              <span className="text-slate-400">·</span>{" "}
              <span className="uppercase tracking-wider text-xs font-mono">{derivedFrom}</span>
            </p>
            {latestMessage?.summary && (
              <p className="text-slate-300 italic text-sm mt-2 max-w-2xl">
                &ldquo;{latestMessage.summary}&rdquo;
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 h-[520px]">
            {hotel ? (
              <HelplineMapClient
                hotelLat={hotel.latitude}
                hotelLng={hotel.longitude}
                hotelName={hotel.name}
                helplines={helplines}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-black/40 border border-white/10 rounded-2xl text-slate-500">
                No hotel configured.
              </div>
            )}
          </div>

          <div className="lg:col-span-2 flex flex-col gap-3 max-h-[520px] overflow-y-auto pr-1">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white uppercase tracking-widest">
                Ranked {helplineLabel(primaryKind)}s
              </h2>
              <span className="text-xs text-slate-500 font-mono">{helplines.length} found</span>
            </div>

            {helplines.length === 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 text-sm text-slate-400">
                No nearby {helplineLabel(primaryKind).toLowerCase()}s returned. Default to <strong className="text-red-400">112</strong>.
              </div>
            )}

            {helplines.map((h: Helpline) => (
              <div
                key={h.id}
                className={`rounded-xl p-4 border ${KIND_BORDER[h.kind]} backdrop-blur-md hover:bg-black/40 transition-colors`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {KIND_ICON[h.kind]}
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-300">
                      {helplineLabel(h.kind)}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {(h.distanceMeters / 1000).toFixed(2)} km
                  </span>
                </div>
                <h3 className="text-white font-semibold text-sm mb-2 leading-tight">{h.name}</h3>
                {h.phone ? (
                  <a
                    href={`tel:${h.phone}`}
                    className="inline-flex items-center gap-2 text-red-300 hover:text-red-200 font-mono text-sm font-bold"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {h.phone}
                  </a>
                ) : (
                  <span className="text-xs text-slate-500 italic">No phone listed — use 112</span>
                )}
              </div>
            ))}

            <div className="mt-2 bg-red-950/30 border border-red-900/50 rounded-xl p-4 sticky bottom-0">
              <p className="text-[10px] uppercase font-bold tracking-widest text-red-400 mb-1">
                Always Available (India)
              </p>
              <a
                href="tel:112"
                className="text-2xl font-bold text-red-300 font-mono tracking-wider hover:text-red-200"
              >
                112
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
