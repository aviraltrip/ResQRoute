import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FLOOR_COUNT = 4;
const ROOMS_PER_FLOOR = 5;
const ROOM_X = [0.15, 0.3, 0.5, 0.7, 0.85];
const ROOM_Y = 0.5;
const STAIR_WEIGHT = 3;

async function main() {
  await prisma.distressMessage.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.edge.deleteMany();
  await prisma.room.deleteMany();
  await prisma.hotel.deleteMany();

  const hotel = await prisma.hotel.create({
    data: {
      name: "Atria Institute of Technology",
      latitude: 13.0163,
      longitude: 77.5713,
    },
  });

  const roomByNumber = new Map<string, string>();
  const roomPromises: Promise<{ id: string; number: string }>[] = [];

  for (let floor = 1; floor <= FLOOR_COUNT; floor++) {
    for (let i = 0; i < ROOMS_PER_FLOOR; i++) {
      const number = `${floor}0${i + 1}`;
      roomPromises.push(
        prisma.room.create({
          data: {
            hotelId: hotel.id,
            number,
            floor,
            x: ROOM_X[i],
            y: ROOM_Y,
          },
        })
      );
    }
  }

  roomPromises.push(
    prisma.room.create({
      data: {
        hotelId: hotel.id,
        number: "LOBBY",
        floor: 1,
        x: 0.15,
        y: 0.95,
        isExit: true,
      },
    }),
    prisma.room.create({
      data: {
        hotelId: hotel.id,
        number: "REAR-EXIT",
        floor: 1,
        x: 0.85,
        y: 0.05,
        isExit: true,
      },
    })
  );

  const createdRooms = await Promise.all(roomPromises);
  for (const room of createdRooms) {
    roomByNumber.set(room.number, room.id);
  }

  const edgePromises: Promise<unknown>[] = [];
  function addEdge(
    aNum: string,
    bNum: string,
    opts: { isExit?: boolean; weight?: number } = {}
  ) {
    const a = roomByNumber.get(aNum)!;
    const b = roomByNumber.get(bNum)!;
    const weight = opts.weight ?? 1;
    edgePromises.push(
      prisma.edge.create({
        data: { fromRoomId: a, toRoomId: b, isExit: !!opts.isExit, weight },
      }),
      prisma.edge.create({
        data: { fromRoomId: b, toRoomId: a, isExit: !!opts.isExit, weight },
      })
    );
  }

  for (let floor = 1; floor <= FLOOR_COUNT; floor++) {
    for (let i = 1; i < ROOMS_PER_FLOOR; i++) {
      addEdge(`${floor}0${i}`, `${floor}0${i + 1}`);
    }
  }

  for (let floor = 1; floor < FLOOR_COUNT; floor++) {
    addEdge(`${floor}01`, `${floor + 1}01`, { weight: STAIR_WEIGHT });
    addEdge(`${floor}05`, `${floor + 1}05`, { weight: STAIR_WEIGHT });
  }

  addEdge("101", "LOBBY", { isExit: true });
  addEdge("105", "REAR-EXIT", { isExit: true });

  await Promise.all(edgePromises);

  const guests = [
    { name: "Alice Chen", phone: "+15555550101", roomNumber: "203", accessibilityFlag: false },
    { name: "Bob Kumar", phone: "+15555550102", roomNumber: "305", accessibilityFlag: true },
    { name: "Carla Rivera", phone: "+15555550103", roomNumber: "102", accessibilityFlag: false },
    { name: "Dan Okafor", phone: "+15555550104", roomNumber: "401", accessibilityFlag: false },
    { name: "Emma Sato", phone: "+15555550105", roomNumber: "404", accessibilityFlag: false },
  ];

  await Promise.all(
    guests.map((g) =>
      prisma.guest.create({
        data: {
          name: g.name,
          phone: g.phone,
          roomId: roomByNumber.get(g.roomNumber)!,
          accessibilityFlag: g.accessibilityFlag,
        },
      })
    )
  );

  const [hotels, rooms, edges, guestCount] = await Promise.all([
    prisma.hotel.count(),
    prisma.room.count(),
    prisma.edge.count(),
    prisma.guest.count(),
  ]);

  const counts = {
    hotels,
    rooms,
    edges,
    guests: guestCount,
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
