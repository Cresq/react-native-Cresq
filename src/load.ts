import { libraryExercises } from "@/data/exercises";

/**
 * How a set's weight is written.
 *
 * For most movements the figure is the weight that was moved. For a movement
 * done with the body's own weight (pull-ups, dips, push-ups) the figure in the
 * log is what was added to it: a belt with 10 kg on it, or nothing at all.
 * Written bare, "10 kg" on a pull-up reads as if somebody pulled ten kilos, so
 * it is written as what it is: BW+10 kg, and BW when nothing was added. What
 * the body itself weighed that day travels with the session (`Session.bodyKg`).
 */
const BODY = new Set(libraryExercises.filter((e) => e.bodyweight).map((e) => e.id));

/** The body's own weight, as lifters write it, in both languages. */
export const BW = "BW";

/** Whether what is logged for this movement is what was added to the body's own weight. A movement somebody made up themselves is taken to be a weighted one. */
export const isBodyweight = (exerciseId?: string) => !!exerciseId && BODY.has(exerciseId);

/** The figure without its unit, for a sentence that brings its own " kg": "80", or "BW+10". With nothing added to the body it is "BW", and the caller leaves the unit off. */
export const loadFigure = (kg: number, body: boolean) => (body ? (kg > 0 ? `${BW}+${kg}` : BW) : String(kg));

/** "80 kg", "BW+10 kg", or "BW". */
export const fmtLoad = (kg: number, body: boolean) => (body && !(kg > 0) ? BW : `${loadFigure(kg, body)} kg`);

/** "80 kg × 5", "BW+10 kg × 8", "BW × 12". */
export const fmtSet = (kg: number, reps: number, body: boolean) => `${fmtLoad(kg, body)} × ${reps}`;
