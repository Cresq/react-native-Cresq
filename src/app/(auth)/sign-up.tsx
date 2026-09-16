import { useState } from "react";
import { Pressable, View } from "react-native";
import { useNav } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { emailOk, MIN_PASSWORD, useAuth } from "@/store/auth";
import { MIN_AGE } from "@/db/types";
import { useT } from "@/i18n";
import { AuthLayout } from "@/components/AuthLayout";
import { Txt } from "@/components/ui/Text";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Row } from "@/components/ui/Screen";

/**
 * Sign-up. Nothing is stored about the person until they tick both boxes:
 * the age check and the agreement to the Terms and Privacy Policy. The
 * timestamps of both go into the document with the account.
 */
export default function SignUp() {
  const { signUp } = useAuth();
  const router = useNav();
  const t = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ageOk, setAgeOk] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [error, setError] = useState<{ field: "name" | "email" | "password"; msg: string } | null>(null);
  const ready = ageOk && agreed;

  const go = () => {
    if (!name.trim()) return setError({ field: "name", msg: t("We need something to call you.") });
    if (!emailOk(email)) return setError({ field: "email", msg: t("That does not look like an email address.") });
    if (password.length < MIN_PASSWORD) return setError({ field: "password", msg: t("At least {n} characters.", { n: MIN_PASSWORD }) });
    setError(null);
    if (!ready) {
      setNudge(true);
      return;
    }
    signUp(email, name);
    router.replace("/onboarding");
  };

  return (
    <AuthLayout title={t("Create your account")} subtitle={t("Your log, records and photos stay yours.")} footerCopy={t("Already have an account?")} footerAction={t("Sign in")} onFooter={() => router.back()}>
      <Field label={t("Name")} value={name} onChangeText={(v) => { setName(v); setError(null); }} error={error?.field === "name" ? error.msg : undefined} placeholder={t("Your name")} autoComplete="name" textContentType="name" style={{ marginTop: 0 }} />
      <Field label={t("Email")} value={email} onChangeText={(v) => { setEmail(v); setError(null); }} error={error?.field === "email" ? error.msg : undefined} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" placeholder="you@example.com" />
      <Field label={t("Password")} value={password} onChangeText={(v) => { setPassword(v); setError(null); }} error={error?.field === "password" ? error.msg : undefined} secureTextEntry autoComplete="new-password" textContentType="newPassword" placeholder={t("At least {n} characters", { n: MIN_PASSWORD })} icon="lock" />

      <View style={{ gap: 4, paddingTop: 4 }}>
        <Check on={ageOk} onPress={() => setAgeOk(!ageOk)} label={t("I am {n} or older", { n: MIN_AGE })} />
        <Check on={agreed} onPress={() => setAgreed(!agreed)}>
          <Txt variant="bodyS" tone="secondary">
            {t("I agree to the")}{" "}
            <Txt variant="bodyS" tone="primary" onPress={() => router.push("/legal/terms")}>
              {t("Terms of Use")}
            </Txt>{" "}
            {t("and the")}{" "}
            <Txt variant="bodyS" tone="primary" onPress={() => router.push("/legal/privacy")}>
              {t("Privacy Policy")}
            </Txt>
          </Txt>
        </Check>
        {nudge && !ready ? (
          <Txt variant="labelS" tone="warning" style={{ paddingLeft: 34, paddingTop: 2 }}>
            {t("Tick both boxes to continue.")}
          </Txt>
        ) : null}
      </View>

      <Button label={t("Create account")} onPress={go} style={{ marginTop: 6, opacity: ready ? 1 : 0.6 }} />
      <Txt variant="labelS" tone="tertiary" align="center">
        {t("Your account and your log live on this phone. Nothing is sent anywhere until sync exists, and then only if you turn it on.")}
      </Txt>
    </AuthLayout>
  );
}

function Check({ on, onPress, label, children }: { on: boolean; onPress: () => void; label?: string; children?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label} onPress={onPress} hitSlop={6} style={{ paddingVertical: 8 }}>
      <Row gap={12} align="flex-start">
        <View style={{ width: 22, height: 22, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: on ? colors.accent.ember : colors.bg.raised, borderWidth: on ? 0 : 1, borderColor: colors.border.strong }}>
          {on ? <Icon name="check" size={14} color={colors.accent.on} strokeWidth={2.6} /> : null}
        </View>
        <View style={{ flex: 1, paddingTop: 2 }}>
          {label ? (
            <Txt variant="bodyS" tone="secondary">
              {label}
            </Txt>
          ) : (
            children
          )}
        </View>
      </Row>
    </Pressable>
  );
}
