import { prisma } from "./prisma";

export type RouteStep = {
  roomId: string;
  roomNumber: string;
  isExit: boolean;
  x: number;
  y: number;
  floor: number;
};

export async function computeEvacuationRoute(
  startRoomId: string,
  avoidRoomIds: string[] = []
): Promise<RouteStep[]> {
  const [rooms, edges] = await Promise.all([
    prisma.room.findMany(),
    prisma.edge.findMany({
      where: { blocked: false }
    })
  ]);

  const graph: Record<string, { to: string; weight: number }[]> = {};
  
  rooms.forEach(r => { graph[r.id] = []; });
  
  const roomsById = new Map(rooms.map(r => [r.id, r]));
  const avoidSet = new Set(avoidRoomIds);

  edges.forEach(e => {
    if (avoidSet.has(e.toRoomId)) return;
    
    const fromRoom = roomsById.get(e.fromRoomId);
    const toRoom = roomsById.get(e.toRoomId);

    if (!fromRoom || !toRoom) return;

    const euclideanDistance = Math.sqrt(
      Math.pow(toRoom.x - fromRoom.x, 2) + Math.pow(toRoom.y - fromRoom.y, 2)
    );

    const floorDiff = Math.abs(toRoom.floor - fromRoom.floor);
    const dynamicWeight = euclideanDistance + (floorDiff * 3);

    if (!graph[e.fromRoomId]) graph[e.fromRoomId] = [];
    graph[e.fromRoomId].push({ to: e.toRoomId, weight: dynamicWeight });
  });

  if (!avoidSet.has(startRoomId)) {
    avoidRoomIds.forEach(hazard => {
      if(graph[hazard]) delete graph[hazard];
    });
  }

  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const unvisited = new Set<string>();

  rooms.forEach(r => {
    dist[r.id] = Infinity;
    prev[r.id] = null;
    if (graph[r.id]) unvisited.add(r.id);
  });

  dist[startRoomId] = 0;

  while (unvisited.size > 0) {
    let current: string | null = null;
    let minDist = Infinity;
    for (const nodeId of unvisited) {
      if (dist[nodeId] < minDist) {
        minDist = dist[nodeId];
        current = nodeId;
      }
    }

    if (current === null || dist[current] === Infinity) {
      break;
    }

    unvisited.delete(current);

    const neighbors = graph[current] || [];
    for (const neighbor of neighbors) {
      if (unvisited.has(neighbor.to)) {
        const alt = dist[current] + neighbor.weight;
        if (alt < dist[neighbor.to]) {
          dist[neighbor.to] = alt;
          prev[neighbor.to] = current;
        }
      }
    }
  }

  const exitRooms = rooms.filter(r => r.isExit);
  let bestExit: string | null = null;
  let exitDist = Infinity;

  for (const exit of exitRooms) {
    if (dist[exit.id] < exitDist) {
      exitDist = dist[exit.id];
      bestExit = exit.id;
    }
  }

  if (!bestExit) return [];

  const path: RouteStep[] = [];
  let step: string | null = bestExit;
  
  while (step) {
    const room = roomsById.get(step);
    if (!room) break;
    path.unshift({ 
      roomId: room.id, 
      roomNumber: room.number, 
      isExit: room.isExit,
      x: room.x,
      y: room.y,
      floor: room.floor
    });
    step = prev[step];
  }

  return path;
}
