import React from "react";
import type { Metadata } from "next";
import StaffDashboardClient from "@/components/StaffDashboardClient";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Staff Command Center — ResQRoute",
  description: "Real-time emergency monitoring, room hazard tracking, and live guest triage.",
};

export default async function StaffDashboard() {
  // Fetch initial active state for Staff concurrently
  const [guests, messages, rooms] = await Promise.all([
    prisma.guest.findMany({
      include: { room: true },
      orderBy: { updatedAt: 'desc' }
    }),
    prisma.distressMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    }),
    prisma.room.findMany({
      orderBy: { number: 'asc' }
    })
  ]);

  return (
    <StaffDashboardClient initialGuests={guests} initialMessages={messages} rooms={rooms} />
  );
}

