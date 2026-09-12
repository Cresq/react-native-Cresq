import { useEffect } from "react";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { AuthProvider } from "@/store/auth";
import { WorkoutProvider } from "@/store/workout";
import { SplitProvider } from "@/store/split";
import { darkColors } from "../../constants/theme";

SplashScreen.preventAutoHideAsync();

/**
 * Route map
 *   /                     Splash, decides where to go
 *   /(auth)/sign-in       Sign in
 *   /(auth)/sign-up       Sign up
 *   /(tabs)               Home · Feed · Train · Profile
 *   /notifications        From the bell on Home and Feed
 *   /train/split          Split editor (order of training days)
 *   /workout/active       Running session (full-screen modal over the tabs)
 *   /workout/summary      Session complete
 *   /workout/posted       Posted to feed, with undo
 *   /progress/[lift]      Lift detail (from Home lifts card or Profile › Progress)
 *   /settings/devices     Connected devices and Health permissions
 */
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Bricolage-SemiBold": require("@/assets/fonts/BricolageGrotesque-SemiBold.ttf"),
    "Bricolage-Bold": require("@/assets/fonts/BricolageGrotesque-Bold.ttf"),
    "Instrument-Regular": require("@/assets/fonts/InstrumentSans-Regular.ttf"),
    "Instrument-Medium": require("@/assets/fonts/InstrumentSans-Medium.ttf"),
    "Instrument-SemiBold": require("@/assets/fonts/InstrumentSans-SemiBold.ttf"),
    "Instrument-Bold": require("@/assets/fonts/InstrumentSans-Bold.ttf"),
    "Instrument-Italic": require("@/assets/fonts/InstrumentSans-Italic.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider scheme="dark">
      <AuthProvider>
        <WorkoutProvider>
          <SplitProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: darkColors.bg.ground }, animation: "fade" }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="notifications" options={{ animation: "slide_from_right" }} />
              <Stack.Screen name="train/split" options={{ animation: "slide_from_right" }} />
              <Stack.Screen name="workout/active" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }} />
              <Stack.Screen name="workout/summary" options={{ presentation: "fullScreenModal", animation: "slide_from_right" }} />
              <Stack.Screen name="workout/posted" options={{ presentation: "fullScreenModal", animation: "slide_from_right" }} />
              <Stack.Screen name="progress/[lift]" options={{ animation: "slide_from_right" }} />
              <Stack.Screen name="settings/devices" options={{ animation: "slide_from_right" }} />
            </Stack>
          </SplitProvider>
        </WorkoutProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
