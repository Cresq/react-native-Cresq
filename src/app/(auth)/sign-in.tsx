import { useState } from "react";
import { View } from "react-native";
import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/store/auth";
import { AuthLayout } from "@/components/AuthLayout";
import { Txt } from "@/components/ui/Text";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";

export default function SignIn() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("nick@cresq.nl");
  const [password, setPassword] = useState("");
  const [forgot, setForgot] = useState(false);
  const [sent, setSent] = useState(false);

  const go = () => {
    signIn();
    router.replace("/");
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Your next session is waiting." footerCopy="New to CresQ?" footerAction="Create an account" onFooter={() => router.push("/(auth)/sign-up")} onSocial={go}>
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Your password" icon="lock" />
      <Pressable accessibilityRole="button" onPress={() => setForgot(true)} hitSlop={8} style={{ alignSelf: "flex-end", paddingVertical: 4 }}>
        <Txt variant="labelS" tone="secondary">
          Forgot password?
        </Txt>
      </Pressable>
      <Button label="Sign in" onPress={go} style={{ marginTop: 6 }} />
      <BottomSheet visible={forgot} onClose={() => { setForgot(false); setSent(false); }} title="Reset your password" subtitle={sent ? undefined : "We email you a link. It works for one hour."}>
        <View style={{ paddingHorizontal: 8, paddingVertical: 8, gap: 10 }}>
          {sent ? (
            <Txt variant="bodyM" tone="secondary">
              If an account exists for {email || "that address"}, a reset link is on its way. Check your spam folder too.
            </Txt>
          ) : (
            <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" autoFocus />
          )}
          <Button label={sent ? "Done" : "Send reset link"} variant={sent ? "secondary" : "primary"} onPress={() => (sent ? (setForgot(false), setSent(false)) : setSent(true))} disabled={!sent && !email.includes("@")} />
        </View>
      </BottomSheet>
    </AuthLayout>
  );
}
