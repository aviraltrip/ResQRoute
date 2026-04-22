"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { IncidentType } from "@prisma/client";

export async function checkInGuest(formData: FormData) {
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const roomId = formData.get("roomId") as string;
  const accessibility = formData.get("accessibility") === "on";

  if (!name || !phone || !roomId) {
    throw new Error("Missing required fields");
  }

  const guest = await prisma.guest.create({
    data: {
      name,
      phone,
      roomId,
      accessibilityFlag: accessibility,
      status: "checked_in",
    },
  });

  // Redirect client to their dashboard
  redirect(`/g/${guest.token}`);
}

export async function triggerDistress(guestToken: string, text: string) {
  const guest = await prisma.guest.findUnique({
    where: { token: guestToken },
    include: { room: true },
  });

  if (!guest) throw new Error("Guest not found");

  // Get active incident (assuming there's an active one, or create drill)
  let incident = await prisma.incident.findFirst({
    orderBy: { startedAt: 'desc' }
  });

  if (!incident) {
    // Fallback if staff hasn't triggered one yet, create generic incident
    incident = await prisma.incident.create({
      data: {
        hotelId: guest.room.hotelId,
        type: "security",
        originRoomId: guest.roomId,
        isDrill: false
      }
    });
  }

  // Insert distress message
  const message = await prisma.distressMessage.create({
    data: {
      incidentId: incident.id,
      guestId: guest.id,
      roomId: guest.roomId,
      text,
      severity: 5, // Default panic severity
      category: "panic",
    }
  });

  revalidatePath("/staff");
  return message;
}

export async function triggerAlarm(originRoomId: string, type: IncidentType) {
  const room = await prisma.room.findUnique({ where: { id: originRoomId } });
  if (!room) throw new Error("Invalid room");

  const incident = await prisma.incident.create({
    data: {
      hotelId: room.hotelId,
      type,
      originRoomId: room.id,
      isDrill: false
    }
  });

  revalidatePath("/staff");
  return incident;
}

export async function markGuestSafe(guestToken: string) {
  const guest = await prisma.guest.update({
    where: { token: guestToken },
    data: { status: "safe" }
  });
  revalidatePath("/staff");
  return guest;
}
