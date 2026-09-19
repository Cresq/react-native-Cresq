import type { GymPlace } from "@/db/types";
import type { Level, Reported } from "./busyness";
import { gymLabel } from "./places";

/**
 * Busyness reports, shared through Supabase: the gym's place id and name, a
 * level from one to three, and when. No account, no device id, nothing about the person. The
 * server stamps the time itself, so a report cannot be backdated to paint a
 * pattern that was never there.
 *
 * Talks to PostgREST directly with the publishable key, like the product
 * shelf. Nothing waits on it: a fetch that fails leaves the card on the
 * typical pattern, a report that fails is kept on the phone and nothing more.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const gymCloudConfigured = () => !!url && !!key;

const headers = () => ({ apikey: key!, Authorization: `Bearer ${key!}`, "Content-Type": "application/json" });

export type Busyness = {
  /** Reports from the last hour and a half, averaged; null when there are none. */
  live: { level: number; n: number; latest: number } | null;
  /** This weekday's hours, from the reports of the last months. */
  hours: Reported[];
};

export async function fetchBusyness(placeId: string, signal?: AbortSignal): Promise<Busyness | null> {
  if (!gymCloudConfigured()) return null;
  try {
    const res = await fetch(`${url}/rest/v1/rpc/gym_busyness`, { method: "POST", headers: headers(), body: JSON.stringify({ p_gym_key: placeId }), signal });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<Busyness> | null;
    if (!data) return null;
    const live = data.live && typeof data.live.level === "number" && data.live.n > 0 ? { level: data.live.level, n: data.live.n, latest: Number(data.live.latest) || 0 } : null;
    const hours = Array.isArray(data.hours) ? data.hours.filter((h): h is Reported => typeof h?.hour === "number" && typeof h?.level === "number" && typeof h?.n === "number") : [];
    return { live, hours };
  } catch {
    return null;
  }
}

export async function sendReport(place: GymPlace, level: Level): Promise<boolean> {
  if (!gymCloudConfigured()) return false;
  try {
    const res = await fetch(`${url}/rest/v1/gym_reports`, { method: "POST", headers: { ...headers(), Prefer: "return=minimal" }, body: JSON.stringify({ gym_key: place.id, gym_name: gymLabel(place).slice(0, 120), level }) });
    return res.ok;
  } catch {
    return false;
  }
}
