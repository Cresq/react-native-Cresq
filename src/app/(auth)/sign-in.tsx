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
import { useT } from "@/i18n";

export default function SignIn() {
  const { signIn } = useAuth();
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState("nick@cresq.nl");
  const [password, setPassword] = useState("");
  const [forgot, setForgot] = useState(false);
  const [sent, setSent] = useState(false);

  const go = () => {
    signIn();
    router.replace("/");
  };

  return (
    <AuthLayout title={t("Welcome back")} subtitle={t("Your next session is waiting.")} footerCopy={t("New to CresQ?")} footerAction={t("Create an account")} onFooter={() => router.push("/(auth)/sign-up")} onSocial={go}>
      <Field label={t("Email")} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
      <Field label={t("Password")} value={password} onChangeText={setPassword} secureTextEntry placeholder={t("Your password")} icon="lock" />
      <Pressable accessibilityRole="button" onPress={() => setForgot(true)} hitSlop={8} style={{ alignSelf: "flex-end", paddingVertical: 4 }}>
        <Txt variant="labelS" tone="secondary">
          {t("Forgot password?")}
        </Txt>
      </Pressable>
      <Button label={t("Sign in")} onPress={go} style={{ marginTop: 6 }} />
      <BottomSheet visible={forgot} onClose={() => { setForgot(false); setSent(false); }} title={t("Reset your password")} subtitle={sent ? undefined : t("We email you a link. It works for one hour.")}>
        <View style={{ paddingHorizontal: 8, paddingVertical: 8, gap: 12 }}>
          {sent ? (
            <Txt variant="bodyM" tone="secondary">
              {t("If an account exists for {email}, a reset link is on its way. Check your spam folder too.", { email: email || t("that address") })}
            </Txt>
          ) : (
            <Field label={t("Email")} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" autoFocus />
          )}
          <Button label={sent ? t("Done") : t("Send reset link")} variant={sent ? "secondary" : "primary"} onPress={() => (sent ? (setForgot(false), setSent(false)) : setSent(true))} disabled={!sent && !email.includes("@")} />
        </View>
      </BottomSheet>
    </AuthLayout>
  );
}
