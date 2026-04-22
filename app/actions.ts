"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { IncidentType } from "@prisma/client";
import { triageDistress } from "@/lib/openrouter";

export async function checkInGuest(formData: FormData) {
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const roomId = formData.get("roomId") as string;
  const accessibility = formData.get("accessibility") === "on";

  if (!name || !phone || !roomId) {
    throw new Error("Missing required fields");
  }

  let guest = await prisma.guest.findFirst({
    where: { name, roomId }
  });

  if (guest) {
    guest = await prisma.guest.update({
      where: { id: guest.id },
      data: { phone, accessibilityFlag: accessibility }
    });
  } else {
    guest = await prisma.guest.create({
      data: {
        name,
        phone,
        roomId,
        accessibilityFlag: accessibility,
        status: "checked_in",
      },
    });
  }

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

  await prisma.guest.update({
    where: { id: guest.id },
    data: { status: "trapped" }
  });

  revalidatePath("/staff");
  return message;
}

export async function triggerAlarm(originRoomId: string, type: IncidentType) {
  const room = await prisma.room.findUnique({ where: { id: originRoomId } });
  if (!room) throw new Error("Invalid room");

  const existingIncident = await prisma.incident.findFirst({ orderBy: { startedAt: "desc" } });

  let incident;
  if (existingIncident) {
    incident = await prisma.incident.update({
      where: { id: existingIncident.id },
      data: {
        originRoomId: room.id,
        type,
      }
    });
  } else {
    incident = await prisma.incident.create({
      data: {
        hotelId: room.hotelId,
        type,
        originRoomId: room.id,
        isDrill: false
      }
    });
  }

  // Auto-Dispatch SMS Notification
  const latestMessage = await prisma.distressMessage.findFirst({
    where: { roomId: room.id },
    orderBy: { createdAt: "desc" }
  });

  if (latestMessage && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    let smsBody = `[RESQROUTE DISPATCH] Room ${room.number}: ${latestMessage.summary || latestMessage.text}`;

    try {
      const twilio = (await import('twilio')).default;
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: smsBody.slice(0, 1500),
        from: process.env.TWILIO_PHONE_NUMBER,
        to: '+91 6363640564'
      });
      console.log("Sent Dispatch SMS to +91 6363640564");
    } catch (err) {
      console.error("Twilio SMS failed:", err);
    }
  }

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

export async function submitVoiceDistress(guestToken: string, formData: FormData) {
  const file = formData.get("audio") as File | null;
  if (!file) throw new Error("No audio provided");

  const guest = await prisma.guest.findUnique({
    where: { token: guestToken },
    include: { room: true },
  });
  if (!guest) throw new Error("Guest not found");

  const assemblyKey = process.env.ASSEMBLYAI_API_KEY;
  if (!assemblyKey) throw new Error("ASSEMBLYAI_API_KEY missing");

  const audioBuffer = Buffer.from(await file.arrayBuffer());

  const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
    method: "POST",
    headers: {
      authorization: assemblyKey,
      "content-type": "application/octet-stream",
    },
    body: audioBuffer,
  });
  if (!uploadRes.ok) {
    const body = await uploadRes.text();
    throw new Error(`AssemblyAI upload failed: ${uploadRes.status} ${body}`);
  }
  const uploadJson = (await uploadRes.json()) as { upload_url?: string };
  const upload_url = uploadJson.upload_url;
  if (!upload_url) throw new Error(`AssemblyAI upload returned no url: ${JSON.stringify(uploadJson)}`);

  const createRes = await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers: {
      authorization: assemblyKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      audio_url: upload_url,
      speech_models: ["universal"],
      language_code: "en",
    }),
  });
  if (!createRes.ok) {
    const body = await createRes.text();
    throw new Error(`AssemblyAI transcript request failed: ${createRes.status} ${body}`);
  }
  const createJson = (await createRes.json()) as { id?: string; error?: string };
  if (!createJson.id) throw new Error(`AssemblyAI transcript missing id: ${JSON.stringify(createJson)}`);
  const transcriptId = createJson.id;

  let transcript = "";
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: { authorization: assemblyKey },
    });
    const data = (await pollRes.json()) as { status: string; text?: string; error?: string };
    if (data.status === "completed") {
      transcript = data.text || "";
      break;
    }
    if (data.status === "error") throw new Error(`AssemblyAI error: ${data.error}`);
  }
  if (!transcript) throw new Error("Transcription timed out");

  const triage = await triageDistress(transcript);

  let incident = await prisma.incident.findFirst({ orderBy: { startedAt: "desc" } });
  if (!incident) {
    incident = await prisma.incident.create({
      data: {
        hotelId: guest.room.hotelId,
        type: "security",
        originRoomId: guest.roomId,
        isDrill: false,
      },
    });
  }

  await prisma.distressMessage.create({
    data: {
      incidentId: incident.id,
      guestId: guest.id,
      roomId: guest.roomId,
      text: transcript,
      summary: triage.summary,
      severity: triage.severity,
      category: triage.category,
    },
  });

  await prisma.guest.update({
    where: { id: guest.id },
    data: { status: "trapped" }
  });

  revalidatePath("/staff");
  return { transcript, summary: triage.summary, severity: triage.severity, category: triage.category };
}

export async function submitTextDistress(guestToken: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Message is empty");

  const guest = await prisma.guest.findUnique({
    where: { token: guestToken },
    include: { room: true },
  });
  if (!guest) throw new Error("Guest not found");

  const triage = await triageDistress(trimmed);

  let incident = await prisma.incident.findFirst({ orderBy: { startedAt: "desc" } });
  if (!incident) {
    incident = await prisma.incident.create({
      data: {
        hotelId: guest.room.hotelId,
        type: "security",
        originRoomId: guest.roomId,
        isDrill: false,
      },
    });
  }

  await prisma.distressMessage.create({
    data: {
      incidentId: incident.id,
      guestId: guest.id,
      roomId: guest.roomId,
      text: trimmed,
      summary: triage.summary,
      severity: triage.severity,
      category: triage.category,
    },
  });

  await prisma.guest.update({
    where: { id: guest.id },
    data: { status: "trapped" }
  });

  revalidatePath("/staff");
  return { transcript: trimmed, summary: triage.summary, severity: triage.severity, category: triage.category };
}
