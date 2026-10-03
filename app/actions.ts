"use server";

import { prisma, safeDbQuery } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { after } from "next/server";
import { IncidentType } from "@prisma/client";
import { triageDistress } from "@/lib/openrouter";
import {
  FALLBACK_GUESTS,
  FALLBACK_ROOMS,
  FALLBACK_INCIDENT,
} from "@/lib/fallback-data";

const GUEST_COOKIE = "resq_guest_token";
const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function logDeferredWarn(message: string, err: unknown) {
  try {
    after(() => {
      console.warn(message, err);
    });
  } catch {
    console.warn(message, err);
  }
}

export async function checkInGuest(formData: FormData) {
  const name = (formData.get("name") as string | null)?.trim();
  const phone = (formData.get("phone") as string | null)?.trim();
  const roomId = (formData.get("roomId") as string | null)?.trim();
  const accessibility = formData.get("accessibility") === "on";

  if (!name || !phone || !roomId) {
    throw new Error("Missing required fields");
  }

  let guestToken = `g-token-${Date.now()}`;

  try {
    let guest = await prisma.guest.findFirst({
      where: { name, roomId },
    });

    if (guest) {
      guest = await prisma.guest.update({
        where: { id: guest.id },
        data: { phone, accessibilityFlag: accessibility },
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
    guestToken = guest.token;
  } catch (err) {
    logDeferredWarn("DB check-in failed, using fallback guest session:", err);
  }

  const cookieStore = await cookies();
  cookieStore.set(GUEST_COOKIE, guestToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_COOKIE_MAX_AGE,
  });

  redirect(`/g/${guestToken}`);
}

export async function signOutGuest() {
  const cookieStore = await cookies();
  cookieStore.delete(GUEST_COOKIE);
  redirect("/check-in");
}

export async function preRegisterGuest(formData: FormData) {
  const name = (formData.get("name") as string | null)?.trim();
  const phone = (formData.get("phone") as string | null)?.trim();
  const roomId = (formData.get("roomId") as string | null)?.trim();
  const accessibility = formData.get("accessibility") === "on";

  if (!name || name.length < 2 || !phone || phone.length < 5 || !roomId) {
    throw new Error("Missing or invalid required registration fields");
  }

  const { randomBytes } = await import("crypto");
  const setupToken = randomBytes(16).toString("hex");

  try {
    const guest = await prisma.guest.create({
      data: {
        name,
        phone,
        roomId,
        accessibilityFlag: accessibility,
        status: "pending_arrival",
        setupToken,
      },
      include: { room: true },
    });

    try {
      revalidatePath("/staff");
    } catch {}

    return {
      setupToken: guest.setupToken!,
      guestName: guest.name,
      roomNumber: guest.room.number,
    };
  } catch (err) {
    logDeferredWarn("preRegisterGuest database offline, using fallback token:", err);
    const room = FALLBACK_ROOMS.find((r) => r.id === roomId);
    try {
      revalidatePath("/staff");
    } catch {}
    return {
      setupToken,
      guestName: name,
      roomNumber: room?.number || "101",
    };
  }
}

export async function confirmGuestCheckIn(setupToken: string, formData: FormData) {
  const cleanSetupToken = setupToken?.trim();
  if (!cleanSetupToken || cleanSetupToken.length < 8) throw new Error("Invalid or expired setup token");

  const phone = (formData.get("phone") as string | null)?.trim();
  const accessibility = formData.get("accessibility") === "on";
  if (!phone || phone.length < 5) throw new Error("A valid phone number is required");

  let guestToken = `confirmed-${cleanSetupToken.slice(0, 8)}`;

  try {
    const [guest, cookieStore] = await Promise.all([
      prisma.guest.findUnique({ where: { setupToken: cleanSetupToken } }),
      cookies(),
    ]);

    if (guest) {
      const updated = await prisma.guest.update({
        where: { id: guest.id },
        data: {
          phone,
          accessibilityFlag: accessibility,
          status: "checked_in",
          setupToken: null,
        },
      });
      guestToken = updated.token;
    }

    cookieStore.set(GUEST_COOKIE, guestToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: GUEST_COOKIE_MAX_AGE,
    });
  } catch (err) {
    logDeferredWarn("confirmGuestCheckIn fallback:", err);
    const cookieStore = await cookies();
    cookieStore.set(GUEST_COOKIE, guestToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: GUEST_COOKIE_MAX_AGE,
    });
  }

  redirect(`/g/${guestToken}`);
}

export async function triggerDistress(guestToken: string, text: string) {
  const cleanToken = guestToken?.trim();
  const cleanText = text?.trim();
  if (!cleanToken || cleanToken.length < 4 || !cleanText) {
    throw new Error("Invalid or unauthenticated distress signal request");
  }

  try {
    const guest = await prisma.guest.findUnique({
      where: { token: cleanToken },
      include: { room: true },
    });

    if (!guest) {
      return {
        id: `mock-msg-${Date.now()}`,
        text: cleanText,
        severity: 5,
        category: "panic",
      };
    }

    let incident = await prisma.incident.findFirst({
      orderBy: { startedAt: "desc" },
    });

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

    const [message] = await Promise.all([
      prisma.distressMessage.create({
        data: {
          incidentId: incident.id,
          guestId: guest.id,
          roomId: guest.roomId,
          text: cleanText,
          severity: 5,
          category: "panic",
        },
      }),
      prisma.guest.update({
        where: { id: guest.id },
        data: { status: "trapped" },
      }),
    ]);

    try {
      revalidatePath("/staff");
    } catch {}
    return message;
  } catch (err) {
    logDeferredWarn("triggerDistress fallback:", err);
    return {
      id: `mock-msg-${Date.now()}`,
      text: cleanText,
      severity: 5,
      category: "panic",
    };
  }
}

export async function triggerAlarm(originRoomId: string, type: IncidentType) {
  const cleanRoomId = originRoomId?.trim();
  const validTypes = Object.values(IncidentType);
  if (!cleanRoomId || !type || !validTypes.includes(type)) {
    throw new Error("Invalid incident parameters or unverified origin room");
  }

  let incident: { id: string; hotelId: string; type: IncidentType; originRoomId: string; startedAt: Date; endedAt: Date | null; isDrill: boolean } = FALLBACK_INCIDENT;

  try {
    const [room, existingIncident] = await Promise.all([
      prisma.room.findUnique({ where: { id: cleanRoomId } }),
      prisma.incident.findFirst({ orderBy: { startedAt: "desc" } }),
    ]);

    if (room) {
      if (existingIncident) {
        incident = await prisma.incident.update({
          where: { id: existingIncident.id },
          data: {
            originRoomId: room.id,
            type,
          },
        });
      } else {
        incident = await prisma.incident.create({
          data: {
            hotelId: room.hotelId,
            type,
            originRoomId: room.id,
            isDrill: false,
          },
        });
      }
    }
  } catch (err) {
    logDeferredWarn("triggerAlarm DB call failed, using local alarm:", err);
  }

  after(async () => {
    try {
      if (
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_PHONE_NUMBER
      ) {
        const latestMessage = await safeDbQuery(
          () =>
            prisma.distressMessage.findFirst({
              where: { roomId: cleanRoomId },
              orderBy: { createdAt: "desc" },
              include: {
                guest: true,
                room: { include: { hotel: true } },
              },
            }),
          null
        );

        if (latestMessage) {
          const hotelName = latestMessage.room.hotel.name;
          const roomNumber = latestMessage.room.number;
          const floor = latestMessage.room.floor;
          const guestName = latestMessage.guest.name;
          const severity = latestMessage.severity ?? "?";
          const category = latestMessage.category ?? "unknown";
          const description = latestMessage.summary || latestMessage.text;

          const smsBody =
            `[RESQROUTE DISPATCH]\n` +
            `Hotel: ${hotelName}\n` +
            `Guest: ${guestName}\n` +
            `Room: ${roomNumber} (Floor ${floor})\n` +
            `Severity: ${severity}/5  |  Category: ${category}\n` +
            `Problem: ${description}`;

          const twilio = (await import("twilio")).default;
          const client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
          );

          const escapeXml = (s: string) =>
            s
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&apos;");
          const spokenLine = `Emergency dispatch from ${hotelName}. Guest ${guestName} in room ${roomNumber}, floor ${floor}, reports: ${description}. Severity ${severity} of 5. Category ${String(category).replace(/_/g, " ")}.`;
          const twiml =
            `<Response>` +
            `<Say voice="alice">${escapeXml(spokenLine)}</Say>` +
            `<Pause length="1"/>` +
            `<Say voice="alice">${escapeXml("Repeat. " + spokenLine)}</Say>` +
            `</Response>`;

          await Promise.all([
            client.messages.create({
              body: smsBody.slice(0, 1500),
              from: process.env.TWILIO_PHONE_NUMBER,
              to: "+91 6363640564",
            }),
            client.calls.create({
              twiml,
              from: process.env.TWILIO_PHONE_NUMBER,
              to: "+91 6363640564",
            }),
          ]);
        }
      }
    } catch (err) {
      console.error("Twilio dispatch failed:", err);
    }
  });

  try {
    revalidatePath("/staff");
  } catch {}
  return incident;
}

export async function markGuestSafe(guestToken: string) {
  const cleanToken = guestToken?.trim();
  if (!cleanToken || cleanToken.length < 4) {
    throw new Error("Invalid or unauthenticated guest safety confirmation");
  }

  try {
    const guest = await prisma.guest.update({
      where: { token: cleanToken },
      data: { status: "safe" },
    });
    try {
      revalidatePath("/staff");
    } catch {}
    return guest;
  } catch (err) {
    logDeferredWarn("markGuestSafe DB fallback:", err);
    try {
      revalidatePath("/staff");
    } catch {}
    return { token: cleanToken, status: "safe" };
  }
}

export async function removeGuest(guestId: string) {
  const cleanId = guestId?.trim();
  if (!cleanId) throw new Error("Guest ID is required");

  try {
    await prisma.distressMessage.deleteMany({ where: { guestId: cleanId } });
    await prisma.guest.delete({ where: { id: cleanId } });
  } catch (err) {
    logDeferredWarn("removeGuest DB fallback:", err);
  }

  try {
    revalidatePath("/staff");
  } catch {}
  return { ok: true };
}

export async function submitVoiceDistress(guestToken: string, formData: FormData) {
  const cleanToken = guestToken?.trim();
  const file = formData.get("audio") as File | null;
  if (!cleanToken || cleanToken.length < 4 || !file) {
    throw new Error("Invalid voice distress submission payload");
  }

  const [guest, audioBuffer] = await Promise.all([
    safeDbQuery(
      () =>
        prisma.guest.findUnique({
          where: { token: cleanToken },
          include: { room: true },
        }),
      FALLBACK_GUESTS.find((g) => g.token === cleanToken) || FALLBACK_GUESTS[0]
    ),
    file.arrayBuffer().then((b) => Buffer.from(b)),
  ]);

  if (!guest) throw new Error("Guest not found");

  const assemblyKey = process.env.ASSEMBLYAI_API_KEY;
  if (!assemblyKey) throw new Error("ASSEMBLYAI_API_KEY missing");

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
  if (!upload_url)
    throw new Error(`AssemblyAI upload returned no url: ${JSON.stringify(uploadJson)}`);

  const createRes = await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers: {
      authorization: assemblyKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      audio_url: upload_url,
      speech_models: ["universal"],
      language_detection: true,
    }),
  });
  if (!createRes.ok) {
    const body = await createRes.text();
    throw new Error(`AssemblyAI transcript request failed: ${createRes.status} ${body}`);
  }
  const createJson = (await createRes.json()) as { id?: string; error?: string };
  if (!createJson.id)
    throw new Error(`AssemblyAI transcript missing id: ${JSON.stringify(createJson)}`);
  const transcriptId = createJson.id;

  let transcript = "";
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, i === 0 ? 800 : 1200));
    const pollRes = await fetch(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
      {
        headers: { authorization: assemblyKey },
      }
    );
    const data = (await pollRes.json()) as {
      status: string;
      text?: string;
      error?: string;
    };
    if (data.status === "completed") {
      transcript = data.text || "";
      break;
    }
    if (data.status === "error") throw new Error(`AssemblyAI error: ${data.error}`);
  }
  if (!transcript) throw new Error("Transcription timed out");

  const triage = await triageDistress(transcript);

  try {
    let incident = await prisma.incident.findFirst({
      orderBy: { startedAt: "desc" },
    });

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

    await Promise.all([
      prisma.distressMessage.create({
        data: {
          incidentId: incident.id,
          guestId: guest.id,
          roomId: guest.roomId,
          text: transcript,
          summary: triage.summary,
          severity: triage.severity,
          category: triage.category,
        },
      }),
      prisma.guest.update({
        where: { id: guest.id },
        data: { status: "trapped" },
      }),
    ]);
  } catch (err) {
    logDeferredWarn("Voice distress DB record fallback:", err);
  }

  try {
    revalidatePath("/staff");
  } catch {}
  return {
    transcript,
    summary: triage.summary,
    severity: triage.severity,
    category: triage.category,
  };
}

export async function submitTextDistress(guestToken: string, text: string) {
  const cleanToken = guestToken?.trim();
  const trimmed = text?.trim();
  if (!cleanToken || cleanToken.length < 4 || !trimmed) {
    throw new Error("Invalid distress signal payload or unauthenticated token");
  }

  const guest = await safeDbQuery(
    () =>
      prisma.guest.findUnique({
        where: { token: cleanToken },
        include: { room: true },
      }),
    FALLBACK_GUESTS.find((g) => g.token === cleanToken) || FALLBACK_GUESTS[0]
  );
  if (!guest) throw new Error("Guest not found");

  const triage = await triageDistress(trimmed);

  try {
    let incident = await prisma.incident.findFirst({
      orderBy: { startedAt: "desc" },
    });

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

    await Promise.all([
      prisma.distressMessage.create({
        data: {
          incidentId: incident.id,
          guestId: guest.id,
          roomId: guest.roomId,
          text: trimmed,
          summary: triage.summary,
          severity: triage.severity,
          category: triage.category,
        },
      }),
      prisma.guest.update({
        where: { id: guest.id },
        data: { status: "trapped" },
      }),
    ]);
  } catch (err) {
    logDeferredWarn("Text distress DB record fallback:", err);
  }

  try {
    revalidatePath("/staff");
  } catch {}
  return {
    transcript: trimmed,
    summary: triage.summary,
    severity: triage.severity,
    category: triage.category,
  };
}
