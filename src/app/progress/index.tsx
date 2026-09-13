import { Redirect } from "expo-router";

/** The lifts overview now lives in Profile › Lifts. Old links land there. */
export default function Progress() {
  return <Redirect href="/(tabs)/profile?tab=lifts" />;
}
