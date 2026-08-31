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
  // Fetch everything needed concurrently
  const [rooms, edges] = await Promise.all([
    prisma.room.findMany(),
    prisma.edge.findMany({
      where: { blocked: false }
    })
  ]);

  const graph: Record<string, { to: string; weight: number }[]> = {};
  
  // Initialize graph nodes
  rooms.forEach(r => { graph[r.id] = []; });
  
  const roomsById = new Map(rooms.map(r => [r.id, r]));
  const avoidSet = new Set(avoidRoomIds);

  // Populate edges
  edges.forEach(e => {
    // avoid edges pointing into hazards
    if (avoidSet.has(e.toRoomId)) return;
    
    const fromRoom = roomsById.get(e.fromRoomId);
    const toRoom = roomsById.get(e.toRoomId);

    if (!fromRoom || !toRoom) return;

    // Calculate dynamic weight using Euclidean distance formula
    const euclideanDistance = Math.sqrt(
      Math.pow(toRoom.x - fromRoom.x, 2) + Math.pow(toRoom.y - fromRoom.y, 2)
    );

    // Add a penalty for moving between floors (simulating stair difficulty)
    const floorDiff = Math.abs(toRoom.floor - fromRoom.floor);
    const dynamicWeight = euclideanDistance + (floorDiff * 3);

    // Graph is bi-directional but Prisma schema stored both directions if it's undirected.
    // The seed.ts explicitly created (A->B) and (B->A).
    if (!graph[e.fromRoomId]) graph[e.fromRoomId] = [];
    graph[e.fromRoomId].push({ to: e.toRoomId, weight: dynamicWeight });
  });

  // We want to avoid the origin hazard room completely if it's not our start room
  // (If the guest is IN the hazard room, they obviously have to leave it, so don't delete their start node)
  if (!avoidSet.has(startRoomId)) {
    avoidRoomIds.forEach(hazard => {
      if(graph[hazard]) delete graph[hazard];
    });
  }

  // Dijkstra's algorithm
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
    // Find node with minimum distance
    let current: string | null = null;
    let minDist = Infinity;
    for (const nodeId of unvisited) {
      if (dist[nodeId] < minDist) {
        minDist = dist[nodeId];
        current = nodeId;
      }
    }

    if (current === null || dist[current] === Infinity) {
      // no path exists
      break;
    }

    // If we reached an exit, we can stop evaluating branching paths (optional optimization, but we want the shortest exit)
    // Actually, let's keep going until we exhaust the graph to find the absolute shortest.

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

  // Find the closest exit
  const exitRooms = rooms.filter(r => r.isExit);
  let bestExit: string | null = null;
  let exitDist = Infinity;

  for (const exit of exitRooms) {
    if (dist[exit.id] < exitDist) {
      exitDist = dist[exit.id];
      bestExit = exit.id;
    }
  }

  // If there's no path to any exit
  if (!bestExit) return [];

  // Reconstruct path
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
