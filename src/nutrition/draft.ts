import type { Food } from "@/db/types";

/**
 * A food on its way to the review screen: what the label reader saw, what a
 * barcode brought back without figures, or what the person is about to type.
 *
 * It lives here rather than in the route parameters because a URL is a poor
 * place for eleven numbers and a photo, and because the review screen has to
 * be able to tell "nothing was read" from "the reader was never asked".
 */
export type FoodDraft = Partial<Omit<Food, "id" | "createdAt">> & {
  /** False when the reader could not make out the table; the form says so. */
  legible?: boolean;
  /** A line from the reader about what it could not read, shown under the warning. */
  note?: string;
  /** The photo it was read from, so the person can hold the numbers against it. */
  photoUri?: string;
};

let current: FoodDraft | null = null;

export const setDraft = (d: FoodDraft | null) => {
  current = d;
};
export const getDraft = () => current;
