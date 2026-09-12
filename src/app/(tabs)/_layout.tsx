import { Redirect, Tabs } from "expo-router";
import { useAuth } from "@/store/auth";
import { TabBar } from "@/components/TabBar";

export default function TabLayout() {
  const { signedIn } = useAuth();
  if (!signedIn) return <Redirect href="/(auth)/sign-in" />;
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "transparent" } }}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="feed" options={{ title: "Feed" }} />
      <Tabs.Screen name="train" options={{ title: "Train" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
