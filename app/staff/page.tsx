import React from "react";
import StaffDashboardClient from "@/components/StaffDashboardClient";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StaffDashboard() {
  // Fetch initial active state for Staff
  const guests = await prisma.guest.findMany({
    orderBy: { updatedAt: 'desc' }
  });
  
  const messages = await prisma.distressMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50 // Limit to recent
  });

  const rooms = await prisma.room.findMany({
    orderBy: { number: 'asc' }
  });

  return (
    <StaffDashboardClient initialGuests={guests} initialMessages={messages} rooms={rooms} />
  );
}
