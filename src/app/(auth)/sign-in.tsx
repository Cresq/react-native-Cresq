import { useState } from "react";
import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/store/auth";
import { AuthLayout } from "@/components/AuthLayout";
import { Txt } from "@/components/ui/Text";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export default function SignIn() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("nick@cresq.nl");
  const [password, setPassword] = useState("");

  const go = () => {
    signIn();
    router.replace("/");
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Your next session is waiting." footerCopy="New to CresQ?" footerAction="Create an account" onFooter={() => router.push("/(auth)/sign-up")} onSocial={go}>
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Your password" icon="lock" />
      <Pressable accessibilityRole="button" onPress={() => {}} hitSlop={8} style={{ alignSelf: "flex-end", paddingVertical: 4 }}>
        <Txt variant="labelS" tone="secondary">
          Forgot password?
        </Txt>
      </Pressable>
      <Button label="Sign in" onPress={go} style={{ marginTop: 6 }} />
    </AuthLayout>
  );
}
