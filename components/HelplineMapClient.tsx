"use client";

import dynamic from "next/dynamic";
import type { Helpline } from "@/lib/overpass";

const HelplineMap = dynamic(() => import("./HelplineMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[420px] rounded-2xl border border-zinc-200 bg-white flex items-center justify-center text-zinc-500 text-sm shadow-sm">
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
