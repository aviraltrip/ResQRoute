import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Layout: 4 floors, 5 guest rooms per floor (numbered x01..x05 along a corridor).
// Each floor has a corridor with room-to-room hallway edges. Two stairwells
// (front at x01, rear at x05) span all 4 floors with higher-weight stair edges.
// Floor 1 has two exit nodes: LOBBY (front) and REAR-EXIT (rear), each
// connected by an `isExit` edge so Dijkstra can terminate there.

const FLOOR_COUNT = 4;
const ROOMS_PER_FLOOR = 5;
const ROOM_X = [0.15, 0.3, 0.5, 0.7, 0.85];
const ROOM_Y = 0.5;
const STAIR_WEIGHT = 3;

async function main() {
  // Clean slate for idempotent reseeds
  await prisma.distressMessage.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.edge.deleteMany();
  await prisma.room.deleteMany();
  await prisma.hotel.deleteMany();

  const hotel = await prisma.hotel.create({
    data: { name: "Grand Harbor Hotel" },
  });

  // Create guest rooms
  const roomByNumber = new Map<string, string>(); // number -> id
  for (let floor = 1; floor <= FLOOR_COUNT; floor++) {
    for (let i = 0; i < ROOMS_PER_FLOOR; i++) {
      const number = `${floor}0${i + 1}`;
      const room = await prisma.room.create({
        data: {
          hotelId: hotel.id,
          number,
          floor,
          x: ROOM_X[i],
          y: ROOM_Y,
        },
      });
      roomByNumber.set(number, room.id);
    }
  }

  // Create exit nodes on floor 1
  const lobby = await prisma.room.create({
    data: {
      hotelId: hotel.id,
      number: "LOBBY",
      floor: 1,
      x: 0.15,
      y: 0.95,
      isExit: true,
    },
  });
  const rearExit = await prisma.room.create({
    data: {
      hotelId: hotel.id,
      number: "REAR-EXIT",
      floor: 1,
      x: 0.85,
      y: 0.05,
      isExit: true,
    },
  });
  roomByNumber.set("LOBBY", lobby.id);
  roomByNumber.set("REAR-EXIT", rearExit.id);

  // Helper: create an undirected edge as two directed rows so queries work from either side
  async function edge(
    aNum: string,
    bNum: string,
    opts: { isExit?: boolean; weight?: number } = {},
  ) {
    const a = roomByNumber.get(aNum)!;
    const b = roomByNumber.get(bNum)!;
    const weight = opts.weight ?? 1;
    await prisma.edge.create({
      data: { fromRoomId: a, toRoomId: b, isExit: !!opts.isExit, weight },
    });
    await prisma.edge.create({
      data: { fromRoomId: b, toRoomId: a, isExit: !!opts.isExit, weight },
    });
  }

  // Hallway edges on each floor: x01 - x02 - x03 - x04 - x05
  for (let floor = 1; floor <= FLOOR_COUNT; floor++) {
    for (let i = 1; i < ROOMS_PER_FLOOR; i++) {
      await edge(`${floor}0${i}`, `${floor}0${i + 1}`);
    }
  }

  // Stair edges: front stairwell (x01) and rear stairwell (x05) connect floors
  for (let floor = 1; floor < FLOOR_COUNT; floor++) {
    await edge(`${floor}01`, `${floor + 1}01`, { weight: STAIR_WEIGHT });
    await edge(`${floor}05`, `${floor + 1}05`, { weight: STAIR_WEIGHT });
  }

  // Exit edges: floor-1 stairwell bases lead to exit nodes
  await edge("101", "LOBBY", { isExit: true });
  await edge("105", "REAR-EXIT", { isExit: true });

  // Guests (5, one wheelchair). Placeholder phones — swap for Twilio-verified numbers later.
  const guests = [
    { name: "Alice Chen", phone: "+15555550101", roomNumber: "203", accessibilityFlag: false },
    { name: "Bob Kumar", phone: "+15555550102", roomNumber: "305", accessibilityFlag: true },
    { name: "Carla Rivera", phone: "+15555550103", roomNumber: "102", accessibilityFlag: false },
    { name: "Dan Okafor", phone: "+15555550104", roomNumber: "401", accessibilityFlag: false },
    { name: "Emma Sato", phone: "+15555550105", roomNumber: "404", accessibilityFlag: false },
  ];

  for (const g of guests) {
    await prisma.guest.create({
      data: {
        name: g.name,
        phone: g.phone,
        roomId: roomByNumber.get(g.roomNumber)!,
        accessibilityFlag: g.accessibilityFlag,
      },
    });
  }

  const counts = {
    hotels: await prisma.hotel.count(),
    rooms: await prisma.room.count(),
    edges: await prisma.edge.count(),
    guests: await prisma.guest.count(),
  };
  console.log("Seed complete:", counts);
  console.log("Guest tokens (for /g/[token] demo URLs):");
  const seeded = await prisma.guest.findMany({
    select: { name: true, token: true, room: { select: { number: true } } },
  });
  for (const s of seeded) {
    console.log(`  ${s.name.padEnd(14)} room ${s.room.number.padEnd(5)} /g/${s.token}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
