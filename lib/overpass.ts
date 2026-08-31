import { IncidentType, DistressCategory } from "@prisma/client";

export type HelplineKind = "fire_station" | "hospital" | "police";

export type Helpline = {
  id: string;
  name: string;
  kind: HelplineKind;
  lat: number;
  lng: number;
  phone: string | null;
  distanceMeters: number;
};

const KIND_LABEL: Record<HelplineKind, string> = {
  fire_station: "Fire Station",
  hospital: "Hospital",
  police: "Police",
};

export function helplineLabel(kind: HelplineKind) {
  return KIND_LABEL[kind];
}

export function kindsForIncident(type: IncidentType): HelplineKind[] {
  switch (type) {
    case "fire":
    case "smoke":
      return ["fire_station", "hospital", "police"];
    case "medical":
      return ["hospital", "fire_station", "police"];
    case "earthquake":
      return ["fire_station", "hospital", "police"];
    case "security":
      return ["police", "hospital", "fire_station"];
    default:
      return ["fire_station", "hospital", "police"];
  }
}

export function kindForCategory(category: DistressCategory): HelplineKind {
  switch (category) {
    case "medical":
    case "mobility":
      return "hospital";
    case "fire_exposure":
    case "structural":
      return "fire_station";
    case "panic":
      return "police";
    default:
      return "fire_station";
  }
}

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export async function findHelplines(
  lat: number,
  lng: number,
  kinds: HelplineKind[],
  radiusMeters = 5000,
): Promise<Helpline[]> {
  if (kinds.length === 0) return [];
  const amenityRegex = kinds.join("|");

  const query = `
    [out:json][timeout:20];
    (
      node["amenity"~"^(${amenityRegex})$"](around:${radiusMeters},${lat},${lng});
      way["amenity"~"^(${amenityRegex})$"](around:${radiusMeters},${lat},${lng});
      relation["amenity"~"^(${amenityRegex})$"](around:${radiusMeters},${lat},${lng});
    );
    out center tags;
  `;

  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
  ];

  let json: { elements?: OverpassElement[] } | null = null;
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          "User-Agent": "ResQRoute/0.1 (hotel emergency coordination demo)",
        },
        body: `data=${encodeURIComponent(query)}`,
        cache: "no-store",
      });
      if (!res.ok) {
        console.warn(`[overpass] ${url} returned ${res.status}`);
        continue;
      }
      json = (await res.json()) as { elements?: OverpassElement[] };
      break;
    } catch (err) {
      console.warn(`[overpass] ${url} fetch failed:`, err);
      continue;
    }
  }

  if (!json) return [];

  const elements = json.elements ?? [];
  console.log(`[overpass] ${elements.length} elements for [${kinds.join(",")}] near ${lat},${lng}`);

  const seen = new Set<string>();
  const kindSet = new Set<string>(kinds);
  const out: Helpline[] = [];

  for (const el of elements) {
    const tags = el.tags ?? {};
    const amenity = tags.amenity as Helpline["kind"] | undefined;
    if (!amenity || !kindSet.has(amenity)) continue;

    const elLat = el.lat ?? el.center?.lat;
    const elLng = el.lon ?? el.center?.lon;
    if (typeof elLat !== "number" || typeof elLng !== "number") continue;

    const id = `${el.type}/${el.id}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const name =
      tags.name ||
      tags["name:en"] ||
      tags.operator ||
      `Unnamed ${KIND_LABEL[amenity]}`;
    const phone = tags.phone || tags["contact:phone"] || tags["emergency:phone"] || null;

    out.push({
      id,
      name,
      kind: amenity,
      lat: elLat,
      lng: elLng,
      phone,
      distanceMeters: haversineMeters(lat, lng, elLat, elLng),
    });
  }

  out.sort((a, b) => {
    const aRank = kinds.indexOf(a.kind);
    const bRank = kinds.indexOf(b.kind);
    if (aRank !== bRank) return aRank - bRank;
    return a.distanceMeters - b.distanceMeters;
  });

  return out.slice(0, 12);
}
