import { useEffect } from "react";
import { AppState } from "react-native";
import { useHealth } from "@/store/health";

/**
 * Keeps the day's burned energy in step with the phone's health store: once
 * when the app starts, and again every time it comes back to the front, which
 * is when a workout recorded on a watch will have arrived. Draws nothing, and
 * does nothing unless the person has connected the store.
 */
export function HealthSync() {
  const { connected, sync } = useHealth();
  useEffect(() => {
    if (!connected) return;
    void sync();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void sync();
    });
    return () => sub.remove();
  }, [connected, sync]);
  return null;
}
