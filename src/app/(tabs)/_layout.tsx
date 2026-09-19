import { Redirect, Tabs } from "expo-router";
import { useDb } from "@/db/DbProvider";
import { useAuth } from "@/store/auth";
import { TabBar } from "@/components/TabBar";

export default function TabLayout() {
  const { ready } = useDb();
  const { signedIn } = useAuth();
  // A deep link or a reload can land here before the stored log is read; deciding then would bounce a signed-in user to sign-in.
  if (!ready) return null;
  if (!signedIn) return <Redirect href="/(auth)/sign-in" />;
  // A tab that is not on screen is frozen: it keeps its state and its scroll
  // position, but it does not redraw for every change to the log while somebody
  // is on another tab or in a workout. It catches up the moment it is opened.
  // iOS and Android only; a browser ignores it.
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, freezeOnBlur: true, sceneStyle: { backgroundColor: "transparent" } }}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="feed" options={{ title: "Feed" }} />
      <Tabs.Screen name="train" options={{ title: "Train" }} />
      <Tabs.Screen name="food" options={{ title: "Food" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
