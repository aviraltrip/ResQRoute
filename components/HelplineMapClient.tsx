"use client";

import dynamic from "next/dynamic";
import type { Helpline } from "@/lib/overpass";

const HelplineMap = dynamic(() => import("./HelplineMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[420px] rounded-2xl border border-slate-200/60 bg-white/50 backdrop-blur-md flex items-center justify-center text-slate-500 font-semibold text-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      Initializing Map...
    </div>
  ),
});

export default function HelplineMapClient(props: {
  hotelLat: number;
  hotelLng: number;
  hotelName: string;
  helplines: Helpline[];
}) {
  return <HelplineMap {...props} />;
}
