import type { Food } from "@/db/types";

/**
 * Reading a nutrition table off a photo.
 *
 * The reading itself happens on a server, never in the app: it needs an API
 * key, and this repository is public. The app sends the photo to whatever
 * `EXPO_PUBLIC_LABEL_READER_URL` points at (the function under
 * `supabase/functions/read-label` is one such thing) and gets the figures back
 * as numbers. When nothing is configured the app says so and offers the form,
 * rather than pretending to read and returning zeros.
 */
export type LabelReading = Partial<Pick<Food, "name" | "brand" | "kcal" | "protein" | "carbs" | "fat" | "sugars" | "saturated" | "fibre" | "salt" | "serving">> & {
  unit: Food["unit"];
  /** False when the table could not be made out at all. */
  legible: boolean;
  /** What was hard to read, in the reader's words, for the person checking. */
  note?: string;
};

/** This build has nowhere to send the photo. */
export class LabelReaderUnavailable extends Error {}
/** It was sent, and something went wrong on the way or on the other side. */
export class LabelReadFailed extends Error {}

const url = process.env.EXPO_PUBLIC_LABEL_READER_URL;
const key = process.env.EXPO_PUBLIC_LABEL_READER_KEY;

export const labelReaderConfigured = () => !!url;

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

export async function readLabel(image: { base64: string; mime: string }): Promise<LabelReading> {
  if (!url) throw new LabelReaderUnavailable();
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 60_000);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      signal: abort.signal,
      headers: { "Content-Type": "application/json", ...(key ? { "x-cresq-key": key } : {}) },
      body: JSON.stringify({ image: image.base64, mime: image.mime }),
    });
  } catch (e) {
    throw new LabelReadFailed(String(e));
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new LabelReadFailed(`HTTP ${res.status}`);
  const r = (await res.json()) as Record<string, unknown>;
  // Nothing from the network is trusted as-is: every figure is a number or it is nothing.
  return {
    name: typeof r.name === "string" && r.name.trim() ? r.name.trim() : undefined,
    brand: typeof r.brand === "string" && r.brand.trim() ? r.brand.trim() : undefined,
    unit: r.unit === "ml" ? "ml" : "g",
    kcal: num(r.kcal),
    protein: num(r.protein),
    carbs: num(r.carbs),
    fat: num(r.fat),
    sugars: num(r.sugars),
    saturated: num(r.saturated),
    fibre: num(r.fibre),
    salt: num(r.salt),
    serving: num(r.serving),
    legible: r.legible !== false,
    note: typeof r.note === "string" && r.note.trim() ? r.note.trim() : undefined,
  };
}
