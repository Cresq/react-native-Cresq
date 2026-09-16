import { libraryExercises } from "@/data/exercises";
import type { Exercise } from "@/db/types";
import { ExerciseMedia } from "./ExerciseMedia";

/**
 * The round mark that shows which movement a line is about, wherever exercises
 * are listed: the feed, a logged session, a workout's plan.
 *
 * Most of those places only ever had the name to work with, because a post from
 * somebody else carries words and not ids. So a name resolves too, loosely
 * enough that "Pull-up", "pull up" and "Pull Up" all land on the same movement.
 */
const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

const BY_ID = new Map(libraryExercises.map((e) => [e.id, e]));
const BY_NAME = new Map(libraryExercises.map((e) => [key(e.name), e]));

/** The catalogue entry behind an id or a name, if there is one. */
export function findExercise(exerciseId?: string, name?: string): Exercise | undefined {
  if (exerciseId) {
    const hit = BY_ID.get(exerciseId);
    if (hit) return hit;
  }
  return name ? BY_NAME.get(key(name)) : undefined;
}

/**
 * An exercise the library has never heard of, a custom one somebody typed in,
 * still gets a mark: the quiet placeholder keeps the column straight, which a
 * gap would not.
 */
export function ExerciseMark({
  exerciseId,
  name,
  size = 26,
  onPress,
}: {
  exerciseId?: string;
  name?: string;
  size?: number;
  onPress?: () => void;
}) {
  return <ExerciseMedia exercise={findExercise(exerciseId, name)} size={size} round onPress={onPress} />;
}
