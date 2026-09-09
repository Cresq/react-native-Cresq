import { Text, View } from "react-native";
import {Link} from "expo-router";
import "../../../global.css"
import {SafeAreaView as RNSafeAreaView} from 'react-native-safe-area-context'
import {styled} from "nativewind"
const SafeAreaView = styled(RNSafeAreaView);

export default function App() {
    return (
        <SafeAreaView className="flex-1 bg-background p-5">
                <Text className="text-xl font-bold text-white">
                    Welcome to CresQ!
                </Text>
                <Link href="/Onboarding" className="mt-4 rounded-xl px-6 py-4 bg-foreground text-white">Go to Onboarding</Link>
                <Link href="/(auth)/sign-in" className="mt-4 rounded-xl px-6 py-4 bg-foreground text-white">Go to SignIn</Link>
                <Link href="/(auth)/sign-up" className="mt-4 rounded-xl px-6 py-4 bg-foreground text-white">Go to SignUp</Link>

                <Link href="../../app/subscriptions/spotify">Spotify Subscription</Link>
                <Link
                    href= {{
                        pathname: "/subscriptions/[id]",
                        params: { id: "claude"},
                    }}
                >
                    Claude Max Subscription
                </Link>
        </SafeAreaView>
    );
}