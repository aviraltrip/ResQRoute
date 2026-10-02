import React from "react";
import type { Metadata } from "next";
import StaffDashboardClient from "@/components/StaffDashboardClient";
import { prisma, safeDbQuery } from "@/lib/prisma";
import {
  FALLBACK_GUESTS,
  FALLBACK_MESSAGES,
  FALLBACK_ROOMS,
} from "@/lib/fallback-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Staff Command Center — ResQRoute",
  description: "Real-time emergency monitoring, room hazard tracking, and live guest triage.",
};

export default async function StaffDashboard() {
  let isFallback = false;

  const [rooms, guests, messages] = await Promise.all([
    safeDbQuery(
      async () => {
        const res = await prisma.room.findMany({
          orderBy: { number: "asc" },
        });
        return res.length > 0 ? res : FALLBACK_ROOMS;
      },
      FALLBACK_ROOMS,
      4000
    ),
    safeDbQuery(
      async () => {
        const res = await prisma.guest.findMany({
          include: { room: true },
          orderBy: { updatedAt: "desc" },
        });
        return res.length > 0 ? res : FALLBACK_GUESTS;
      },
      FALLBACK_GUESTS,
      4000
    ),
    safeDbQuery(
      async () => {
        return await prisma.distressMessage.findMany({
          orderBy: { createdAt: "desc" },
          take: 50,
        });
      },
      FALLBACK_MESSAGES,
      4000
    ),
  ]);

  if (
    rooms === FALLBACK_ROOMS ||
    guests === FALLBACK_GUESTS ||
    messages === FALLBACK_MESSAGES
  ) {
    isFallback = true;
  }

  return (
    <StaffDashboardClient
      initialGuests={guests || []}
      initialMessages={messages || []}
      rooms={rooms || []}
      isFallback={isFallback}
    />
  );
}
