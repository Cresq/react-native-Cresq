import { Redirect } from "expo-router";

/** The lifts overview now lives in Profile › Favourites. Old links land there. */
export default function Progress() {
  return <Redirect href="/(tabs)/profile?tab=favourites" />;
}
