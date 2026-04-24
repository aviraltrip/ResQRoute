"use client";

import React, { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Helpline } from "@/lib/overpass";

type Props = {
  hotelLat: number;
  hotelLng: number;
  hotelName: string;
  helplines: Helpline[];
};

const KIND_COLOR: Record<Helpline["kind"], string> = {
  fire_station: "#ef4444",
  hospital: "#10b981",
  police: "#3b82f6",
};

function pinSvg(color: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.27 21.73 0 14 0z" fill="${color}" stroke="white" stroke-width="2"/>
    <circle cx="14" cy="14" r="5" fill="white"/>
  </svg>`;
}

export default function HelplineMap({ hotelLat, hotelLng, hotelName, helplines }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    const el = containerRef.current;
    if (!el) return;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el) return;

      const map = L.map(el, { zoomControl: true, attributionControl: true }).setView(
        [hotelLat, hotelLng],
        14,
      );
      mapRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      const hotelIcon = L.divIcon({
        html: `<div style="background:#fbbf24;border:3px solid white;border-radius:50%;width:22px;height:22px;box-shadow:0 0 0 3px rgba(251,191,36,0.4);"></div>`,
        className: "",
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      L.marker([hotelLat, hotelLng], { icon: hotelIcon })
        .addTo(map)
        .bindPopup(`<strong>${hotelName}</strong><br/><span style="color:#666">Incident origin</span>`);

      const bounds = L.latLngBounds([[hotelLat, hotelLng]]);

      for (const h of helplines) {
        const icon = L.divIcon({
          html: pinSvg(KIND_COLOR[h.kind]),
          className: "",
          iconSize: [28, 36],
          iconAnchor: [14, 36],
          popupAnchor: [0, -32],
        });
        const km = (h.distanceMeters / 1000).toFixed(2);
        const phoneHtml = h.phone
          ? `<a href="tel:${h.phone}" style="color:#dc2626;font-weight:700">${h.phone}</a>`
          : `<span style="color:#999">No phone listed</span>`;
        L.marker([h.lat, h.lng], { icon })
          .addTo(map)
          .bindPopup(
            `<strong>${h.name}</strong><br/><span style="color:#666;text-transform:uppercase;font-size:10px;letter-spacing:1px">${h.kind.replace("_", " ")}</span> &middot; ${km} km<br/>${phoneHtml}`,
          );
        bounds.extend([h.lat, h.lng]);
      }

      if (helplines.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    })();

    return () => {
      cancelled = true;
      const m = mapRef.current as { remove?: () => void } | null;
      m?.remove?.();
      mapRef.current = null;
    };
  }, [hotelLat, hotelLng, hotelName, helplines]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[420px] rounded-2xl overflow-hidden border border-zinc-200 shadow-sm"
      style={{ background: "#f8fafc" }}
    />
  );
}
