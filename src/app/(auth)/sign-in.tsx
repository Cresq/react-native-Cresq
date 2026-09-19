import { useState } from "react";
import { useNav } from "@/nav";
import { emailOk, MIN_PASSWORD, useAuth } from "@/store/auth";
import { AuthLayout } from "@/components/AuthLayout";
import { Txt } from "@/components/ui/Text";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { BottomSheet, SheetGroup, SheetNote } from "@/components/ui/BottomSheet";
import { useT } from "@/i18n";

/**
 * Sign in. The address has to match the account this device holds, so two
 * people cannot end up sharing one training history by accident. Nothing is
 * pre-filled: a demo login left in a shipped build is how test accounts reach
 * real users.
 */
export default function SignIn() {
  const { signIn, account } = useAuth();
  const router = useNav();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ field: "email" | "password"; msg: string } | null>(null);
  const [forgot, setForgot] = useState(false);

  const go = () => {
    if (!emailOk(email)) return setError({ field: "email", msg: t("That does not look like an email address.") });
    if (password.length < MIN_PASSWORD) return setError({ field: "password", msg: t("At least {n} characters.", { n: MIN_PASSWORD }) });
    const res = signIn(email);
    if (!res.ok) return setError({ field: "email", msg: t("This device holds the account for {email}. Sign in with that address, or reset the app in Settings.", { email: res.heldBy }) });
    setError(null);
    router.replace("/");
  };

  return (
    <AuthLayout title={t("Welcome back")} subtitle={t("Your next session is waiting.")} footerCopy={t("New to CresQ?")} footerAction={t("Create an account")} onFooter={() => router.push("/(auth)/sign-up")}>
      <Field label={t("Email")} value={email} onChangeText={(v) => { setEmail(v); setError(null); }} error={error?.field === "email" ? error.msg : undefined} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" placeholder={account?.email || "you@example.com"} />
      <Field label={t("Password")} value={password} onChangeText={(v) => { setPassword(v); setError(null); }} error={error?.field === "password" ? error.msg : undefined} secureTextEntry autoComplete="current-password" textContentType="password" placeholder={t("Your password")} icon="lock" />
      <Button label={t("Sign in")} onPress={go} style={{ marginTop: 6 }} />
      <Txt variant="labelS" tone="tertiary" align="center" onPress={() => setForgot(true)}>
        {t("Forgot password?")}
      </Txt>

      <BottomSheet visible={forgot} onClose={() => setForgot(false)} title={t("Your account is on this phone")} subtitle={t("CresQ does not sync to a server yet, so there is no password to reset and nothing to email. Your log is on this device.")}>
        <SheetGroup>
          <SheetNote>{t("Keep a copy: Settings, Account and privacy, Download my data. When sync arrives you sign in with your email and your log comes with you.")}</SheetNote>
        </SheetGroup>
      </BottomSheet>
    </AuthLayout>
  );
}
