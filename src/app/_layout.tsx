import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";
import { DbProvider, useDb } from "@/db/DbProvider";
import { WorkoutProvider } from "@/store/workout";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LocaleSync } from "@/i18n";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SaveTrouble } from "@/components/SaveTrouble";

SplashScreen.preventAutoHideAsync();

/**
 * Route map
 *   /                     Splash, decides where to go
 *   /(auth)/sign-in       Sign in
 *   /(auth)/sign-up       Sign up → /onboarding
 *   /onboarding           Goal, experience, days, limitations (feeds plans and AI later)
 *   /(tabs)               Home, Feed, Train, Profile
 *   /notifications        From the bell on Home and Feed
 *   /train/split          Split editor (order of training days)
 *   /train/plan/[id]      Plan detail and editor
 *   /exercises            Exercise library; ?plan=ID adds to a plan, ?session=1 adds to the running session, ?favourite=1 picks Home lifts
 *   /workout/active       Running session (full-screen modal over the tabs)
 *   /workout/summary      Session complete
 *   /workout/posted       Posted to feed, with undo
 *   /workout/[id]         One logged session, read-only (from the Profile grid)
 *   /progress             Redirects to Profile › Favourites (old links)
 *   /progress/volume      Volume per week
 *   /progress/muscles     Working sets per muscle group
 *   /compare              People you follow who share their figures
 *   /compare/[id]         Your figures beside theirs
 *   /progress/[lift]      One exercise: trend, forecast, records, history
 *   /settings             Appearance, units, language, sample data, reset, sign out
 *   /settings/devices     Connected devices and Health permissions
 *   /settings/account     Account, privacy switches, consent, export, delete
 *   /legal/[doc]          privacy, terms, cookies, refunds, licences
 *   /search               Find people (from Feed)
 *   /followers            ?user=me|ID&tab=followers|following
 *   /user/[id]            Someone else's profile
 */
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Inter-Regular": require("@/assets/fonts/Inter-Regular.ttf"),
    "Inter-Medium": require("@/assets/fonts/Inter-Medium.ttf"),
    "Inter-SemiBold": require("@/assets/fonts/Inter-SemiBold.ttf"),
    "Inter-Bold": require("@/assets/fonts/Inter-Bold.ttf"),
    "Inter-ExtraBold": require("@/assets/fonts/Inter-ExtraBold.ttf"),
    "Inter-Italic": require("@/assets/fonts/Inter-Italic.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DbProvider>
        <Themed />
      </DbProvider>
    </GestureHandlerRootView>
  );
}

/**
 * The chosen theme lives in the profile, so this sits inside the database and
 * not above it. "system" follows the phone; the other two win over it.
 */
function Themed() {
  const { db } = useDb();
  const system = useColorScheme();
  const want = db.profile.theme ?? "system";
  const scheme = want === "system" ? (system === "light" ? "light" : "dark") : want;
  return (
    <ThemeProvider scheme={scheme}>
      <WorkoutProvider>
        <LocaleSync />
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <ErrorBoundary>
          <Routes />
        </ErrorBoundary>
        <SaveTrouble />
      </WorkoutProvider>
    </ThemeProvider>
  );
}

/** Kept apart so the stack's own background can read the theme's ground. */
function Routes() {
  const { colors } = useTheme();
  return (
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg.ground }, animation: "slide_from_right", animationDuration: 320, gestureEnabled: true, fullScreenGestureEnabled: true }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="onboarding" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="notifications" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="train/split" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="train/plan/[id]" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="exercises" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
            <Stack.Screen name="workout/active" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }} />
            <Stack.Screen name="workout/summary" options={{ presentation: "fullScreenModal", animation: "slide_from_right" }} />
            <Stack.Screen name="workout/posted" options={{ presentation: "fullScreenModal", animation: "slide_from_right" }} />
            <Stack.Screen name="progress/index" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="progress/volume" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="progress/muscles" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="compare/index" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="compare/[id]" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="progress/[lift]" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="workout/[id]" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="user/[id]" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="live/[id]" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="search" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="followers" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="settings/account" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="legal/[doc]" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="settings/index" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="settings/devices" options={{ animation: "slide_from_right" }} />
          </Stack>
  );
}
