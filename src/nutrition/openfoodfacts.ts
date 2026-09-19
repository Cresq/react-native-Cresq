import type { Food } from "@/db/types";
import { kjToKcal } from "./derive";

/**
 * Open Food Facts: the open database behind most barcode lookups in Europe,
 * free, no key, and good on Dutch shelves. One request per scan, the result
 * kept on the device, so the second scan of the same pack costs nothing and
 * works without a signal.
 */
const BASE = "https://world.openfoodfacts.org/api/v2/product/";
const FIELDS = ["code", "product_name", "product_name_nl", "product_name_en", "brands", "nutriments", "nutrition_data_per", "serving_quantity", "quantity"].join(",");

/** The network let us down, as opposed to the product simply not being known. */
export class LookupFailed extends Error {}

type Nutriments = Record<string, unknown>;

const num = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
};

/** What a scan brings back, or null when the barcode is not in the database. */
export async function lookupBarcode(code: string, signal?: AbortSignal): Promise<Omit<Food, "id" | "createdAt"> | null> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${encodeURIComponent(code)}?fields=${FIELDS}`, {
      signal,
      // Open Food Facts asks that apps say who they are. Browsers set their own and ignore this.
      headers: { "User-Agent": "CresQ/1.0 (nick.li@cresq.nl)", Accept: "application/json" },
    });
  } catch (e) {
    throw new LookupFailed(String(e));
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new LookupFailed(`HTTP ${res.status}`);
  const body = (await res.json()) as { status?: number; product?: Record<string, unknown> };
  if (!body.product || body.status === 0) return null;

  const p = body.product;
  const n = (p.nutriments ?? {}) as Nutriments;
  // `_100g` is always per 100 g or 100 ml, whatever the pack printed: Open Food Facts normalises it.
  const kcal = num(n["energy-kcal_100g"]) ?? (num(n["energy_100g"]) !== undefined ? kjToKcal(num(n["energy_100g"])!) : undefined);
  const protein = num(n["proteins_100g"]);
  const carbs = num(n["carbohydrates_100g"]);
  const fat = num(n["fat_100g"]);
  // A pack in the database with no table at all is no better than an unknown one.
  if (kcal === undefined && protein === undefined && carbs === undefined && fat === undefined) return null;

  const name = String(p.product_name_nl || p.product_name || p.product_name_en || "").trim();
  const brand = String(p.brands ?? "").split(",")[0].trim();
  const per = String(p.nutrition_data_per ?? "");
  const quantity = String(p.quantity ?? "");
  const unit: Food["unit"] = /ml/i.test(per) || /\b(ml|cl|l)\b/i.test(quantity) ? "ml" : "g";

  return {
    name: name || `Product ${code}`,
    brand: brand || undefined,
    barcode: code,
    unit,
    kcal: Math.round(kcal ?? 0),
    protein: protein ?? 0,
    carbs: carbs ?? 0,
    fat: fat ?? 0,
    sugars: num(n["sugars_100g"]),
    saturated: num(n["saturated-fat_100g"]),
    fibre: num(n["fiber_100g"]),
    salt: num(n["salt_100g"]),
    serving: num(p.serving_quantity),
    source: "openfoodfacts",
    verified: false,
  };
}
