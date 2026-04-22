"use client";

import dynamic from "next/dynamic";
import type { Helpline } from "@/lib/overpass";

const HelplineMap = dynamic(() => import("./HelplineMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[420px] rounded-2xl border border-white/10 bg-[#0a0a0e] flex items-center justify-center text-slate-500 text-sm">
      Loading map…
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
