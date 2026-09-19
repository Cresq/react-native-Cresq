import type { Food } from "@/db/types";

/**
 * The shared shelf: products keyed by barcode, in Supabase, so a pack one
 * person checked against the label is instant for everybody after. No
 * personal data goes here; the person's own log stays on the phone.
 *
 * Talks to PostgREST directly with the publishable key. Nothing here is
 * awaited by a screen that cannot go on without it: a lookup that fails falls
 * through to Open Food Facts, a publish that fails is simply not published.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const cloudConfigured = () => !!url && !!key;

type Row = {
  barcode: string;
  name: string;
  brand: string | null;
  unit: "g" | "ml";
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  sugars: number | null;
  saturated: number | null;
  fibre: number | null;
  salt: number | null;
  serving: number | null;
  source: Food["source"];
  verified: boolean;
};

const headers = () => ({ apikey: key!, Authorization: `Bearer ${key!}`, "Content-Type": "application/json" });
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** The shelf's copy of a barcode, or null when nobody has put it there. */
export async function fetchProduct(barcode: string, signal?: AbortSignal): Promise<Omit<Food, "id" | "createdAt"> | null> {
  if (!cloudConfigured()) return null;
  const res = await fetch(`${url}/rest/v1/products?barcode=eq.${encodeURIComponent(barcode)}&limit=1`, { headers: headers(), signal });
  if (!res.ok) return null;
  const rows = (await res.json()) as Row[];
  const r = rows[0];
  if (!r) return null;
  return {
    name: r.name,
    brand: r.brand ?? undefined,
    barcode: r.barcode,
    unit: r.unit === "ml" ? "ml" : "g",
    kcal: num(r.kcal) ?? 0,
    protein: num(r.protein) ?? 0,
    carbs: num(r.carbs) ?? 0,
    fat: num(r.fat) ?? 0,
    sugars: num(r.sugars),
    saturated: num(r.saturated),
    fibre: num(r.fibre),
    salt: num(r.salt),
    serving: num(r.serving),
    source: r.source,
    // The shelf's word, not this person's: they still see "not checked yet" until they look themselves.
    verified: false,
  };
}

/**
 * Put a product on the shelf, or replace the shelf's copy. Only ever called
 * with something a person has just checked against the pack, and with a
 * barcode; a food without one is theirs alone.
 */
export function publishProduct(food: Omit<Food, "id" | "createdAt">): void {
  if (!cloudConfigured() || !food.barcode || !food.verified) return;
  const row: Row = {
    barcode: food.barcode,
    name: food.name,
    brand: food.brand ?? null,
    unit: food.unit,
    kcal: food.kcal,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    sugars: food.sugars ?? null,
    saturated: food.saturated ?? null,
    fibre: food.fibre ?? null,
    salt: food.salt ?? null,
    serving: food.serving ?? null,
    source: food.source,
    verified: true,
  };
  void fetch(`${url}/rest/v1/products?on_conflict=barcode`, {
    method: "POST",
    headers: { ...headers(), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(row),
  }).catch(() => undefined);
}
