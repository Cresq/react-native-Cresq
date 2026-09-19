import { useMemo } from "react";
import type { ImageSourcePropType } from "react-native";
import { useDb } from "@/db/DbProvider";

/**
 * You, as the rest of the app needs you: a name, the letter it starts with,
 * and your photo if you have set one. There is deliberately no stock face
 * behind it. A new account showing a stranger's selfie as your profile picture
 * is the first thing a person sees, and it is wrong.
 */
export function useMe() {
  const { db } = useDb();
  const { name, first, handle, avatar } = db.profile;
  return useMemo(
    () => ({
      name,
      first,
      handle,
      initial: (first || name || "?").charAt(0),
      photo: (avatar ? { uri: avatar } : undefined) as ImageSourcePropType | undefined,
    }),
    [name, first, handle, avatar],
  );
}
