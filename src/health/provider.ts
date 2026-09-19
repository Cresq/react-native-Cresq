import { Platform } from "react-native";
import type { HealthProvider } from "./types";

/**
 * The health store on every platform that is not iOS, which is to say none
 * yet. The bundler picks `provider.ios.ts` for an iPhone; the web build and
 * Android get this one, and never see the HealthKit bindings at all.
 */
export const health: HealthProvider = {
  name: Platform.OS === "android" ? "Health Connect" : "Apple Health",
  unavailable: Platform.OS === "android" ? "android" : "web",
  authorize: async () => false,
  workouts: async () => [],
};
