import type { Guest, DistressMessage, Room, Hotel, Incident, Edge } from "@prisma/client";

export const FALLBACK_HOTEL: Hotel = {
  id: "hotel-demo-1",
  name: "Atria Institute of Technology — Grand Harbor",
  latitude: 13.0163,
  longitude: 77.5713,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

export const FALLBACK_ROOMS: Room[] = [
  { id: "room-101", hotelId: "hotel-demo-1", number: "101", floor: 1, x: 0.15, y: 0.5, isExit: false },
  { id: "room-102", hotelId: "hotel-demo-1", number: "102", floor: 1, x: 0.30, y: 0.5, isExit: false },
  { id: "room-103", hotelId: "hotel-demo-1", number: "103", floor: 1, x: 0.50, y: 0.5, isExit: false },
  { id: "room-104", hotelId: "hotel-demo-1", number: "104", floor: 1, x: 0.70, y: 0.5, isExit: false },
  { id: "room-105", hotelId: "hotel-demo-1", number: "105", floor: 1, x: 0.85, y: 0.5, isExit: false },
  { id: "room-lobby", hotelId: "hotel-demo-1", number: "LOBBY", floor: 1, x: 0.15, y: 0.95, isExit: true },
  { id: "room-rear-exit", hotelId: "hotel-demo-1", number: "REAR-EXIT", floor: 1, x: 0.85, y: 0.05, isExit: true },

  { id: "room-201", hotelId: "hotel-demo-1", number: "201", floor: 2, x: 0.15, y: 0.5, isExit: false },
  { id: "room-202", hotelId: "hotel-demo-1", number: "202", floor: 2, x: 0.30, y: 0.5, isExit: false },
  { id: "room-203", hotelId: "hotel-demo-1", number: "203", floor: 2, x: 0.50, y: 0.5, isExit: false },
  { id: "room-204", hotelId: "hotel-demo-1", number: "204", floor: 2, x: 0.70, y: 0.5, isExit: false },
  { id: "room-205", hotelId: "hotel-demo-1", number: "205", floor: 2, x: 0.85, y: 0.5, isExit: false },

  { id: "room-301", hotelId: "hotel-demo-1", number: "301", floor: 3, x: 0.15, y: 0.5, isExit: false },
  { id: "room-302", hotelId: "hotel-demo-1", number: "302", floor: 3, x: 0.30, y: 0.5, isExit: false },
  { id: "room-303", hotelId: "hotel-demo-1", number: "303", floor: 3, x: 0.50, y: 0.5, isExit: false },
  { id: "room-304", hotelId: "hotel-demo-1", number: "304", floor: 3, x: 0.70, y: 0.5, isExit: false },
  { id: "room-305", hotelId: "hotel-demo-1", number: "305", floor: 3, x: 0.85, y: 0.5, isExit: false },

  { id: "room-401", hotelId: "hotel-demo-1", number: "401", floor: 4, x: 0.15, y: 0.5, isExit: false },
  { id: "room-402", hotelId: "hotel-demo-1", number: "402", floor: 4, x: 0.30, y: 0.5, isExit: false },
  { id: "room-403", hotelId: "hotel-demo-1", number: "403", floor: 4, x: 0.50, y: 0.5, isExit: false },
  { id: "room-404", hotelId: "hotel-demo-1", number: "404", floor: 4, x: 0.70, y: 0.5, isExit: false },
  { id: "room-405", hotelId: "hotel-demo-1", number: "405", floor: 4, x: 0.85, y: 0.5, isExit: false },
];

export type FallbackGuestWithRoom = Guest & { room: Room };

export const FALLBACK_GUESTS: FallbackGuestWithRoom[] = [
  {
    id: "guest-1",
    token: "alice-chen-token",
    setupToken: null,
    name: "Alice Chen",
    phone: "+15555550101",
    roomId: "room-203",
    accessibilityFlag: false,
    status: "evacuating",
    updatedAt: new Date(),
    room: FALLBACK_ROOMS.find((r) => r.id === "room-203")!,
  },
  {
    id: "guest-2",
    token: "bob-kumar-token",
    setupToken: null,
    name: "Bob Kumar",
    phone: "+15555550102",
    roomId: "room-305",
    accessibilityFlag: true,
    status: "trapped",
    updatedAt: new Date(),
    room: FALLBACK_ROOMS.find((r) => r.id === "room-305")!,
  },
  {
    id: "guest-3",
    token: "carla-rivera-token",
    setupToken: null,
    name: "Carla Rivera",
    phone: "+15555550103",
    roomId: "room-102",
    accessibilityFlag: false,
    status: "safe",
    updatedAt: new Date(),
    room: FALLBACK_ROOMS.find((r) => r.id === "room-102")!,
  },
  {
    id: "guest-4",
    token: "dan-okafor-token",
    setupToken: null,
    name: "Dan Okafor",
    phone: "+15555550104",
    roomId: "room-401",
    accessibilityFlag: false,
    status: "checked_in",
    updatedAt: new Date(),
    room: FALLBACK_ROOMS.find((r) => r.id === "room-401")!,
  },
  {
    id: "guest-5",
    token: "emma-sato-token",
    setupToken: null,
    name: "Emma Sato",
    phone: "+15555550105",
    roomId: "room-404",
    accessibilityFlag: false,
    status: "checked_in",
    updatedAt: new Date(),
    room: FALLBACK_ROOMS.find((r) => r.id === "room-404")!,
  },
];

export type FallbackIncidentWithRoom = Incident & { originRoom: Room };

export const FALLBACK_INCIDENT: FallbackIncidentWithRoom = {
  id: "incident-active-1",
  hotelId: "hotel-demo-1",
  type: "fire",
  originRoomId: "room-204",
  startedAt: new Date(),
  endedAt: null,
  isDrill: false,
  originRoom: FALLBACK_ROOMS.find((r) => r.id === "room-204")!,
};

export type FallbackDistressMessageWithRoom = DistressMessage & {
  room?: Room;
};

export const FALLBACK_MESSAGES: FallbackDistressMessageWithRoom[] = [
  {
    id: "msg-1",
    incidentId: "incident-active-1",
    guestId: "guest-2",
    roomId: "room-305",
    text: "Heavy smoke outside room 305 stairwell. Need mobility assistance.",
    severity: 4,
    category: "mobility",
    summary: "Heavy smoke near stairwell, wheelchair user unable to take stairs",
    createdAt: new Date(),
    room: FALLBACK_ROOMS.find((r) => r.id === "room-305"),
  },
];
