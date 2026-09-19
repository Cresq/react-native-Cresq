import type { GymPlace } from "@/db/types";

/**
 * Finding a real gym. The places come from OpenStreetMap, searched through
 * Photon (komoot's open geocoder, built for search-as-you-type, free under
 * fair use, no key). Only places mapped as a fitness centre come back, so what
 * a person links is a gym that exists, at an address, with an id of its own,
 * and everybody who picks that gym is talking about the same one.
 *
 * The Netherlands is searched first, because that is where CresQ's lifters
 * train; a search that finds nothing there is tried again without a border,
 * for the gym on holiday.
 */
const PHOTON = "https://photon.komoot.io/api/";
/** West, south, east, north: the Netherlands with a little room around it. */
const NL = "3.0,50.6,7.4,53.8";
const LIMIT = 8;

type Feature = {
  geometry?: { coordinates?: [number, number] };
  properties?: { osm_id?: number; osm_type?: string; name?: string; street?: string; housenumber?: string; city?: string; town?: string; village?: string; postcode?: string };
};

async function ask(q: string, bbox: string | null, signal?: AbortSignal): Promise<GymPlace[]> {
  const params = [`q=${encodeURIComponent(q)}`, "osm_tag=leisure:fitness_centre", `limit=${LIMIT}`, bbox ? `bbox=${bbox}` : ""].filter(Boolean).join("&");
  const res = await fetch(`${PHOTON}?${params}`, { signal });
  if (!res.ok) throw new Error(`photon ${res.status}`);
  const data = (await res.json()) as { features?: Feature[] };
  const out: GymPlace[] = [];
  for (const f of data.features ?? []) {
    const p = f.properties;
    // A gym without a name cannot be told from the one next door, and an id is what makes it one place for everybody.
    if (!p?.name || !p.osm_id || !p.osm_type) continue;
    const street = [p.street, p.housenumber].filter(Boolean).join(" ") || undefined;
    const [lon, lat] = f.geometry?.coordinates ?? [];
    out.push({ id: `osm:${p.osm_type}${p.osm_id}`, name: p.name, street, city: p.city ?? p.town ?? p.village, lat, lon });
  }
  return out;
}

/** Gyms matching what was typed, nearest to the words first. Throws when the search could not be reached. */
export async function searchGyms(q: string, signal?: AbortSignal): Promise<GymPlace[]> {
  const home = await ask(q, NL, signal);
  return home.length ? home : ask(q, null, signal);
}

/** How a gym is written in one line: on the card, and as the place on a post. */
export const gymLabel = (g: GymPlace) => [g.name, g.city].filter(Boolean).join(", ");
/** The line under it, for telling two branches of a chain apart. */
export const gymAddress = (g: GymPlace) => [g.street, g.city].filter(Boolean).join(", ");
