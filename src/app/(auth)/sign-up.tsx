import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useAuth } from "@/store/auth";
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
  const { signIn } = useAuth();
  const { update } = useDb();
  const router = useRouter();
  const t = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ageOk, setAgeOk] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [nudge, setNudge] = useState(false);
  const ready = ageOk && agreed;

  const go = () => {
    if (!ready) {
      setNudge(true);
      return;
    }
    const now = Date.now();
    update((d) => ({ ...d, profile: { ...d.profile, name: name.trim() || d.profile.name, first: name.trim().split(" ")[0] || d.profile.first }, consent: { ...d.consent, termsAcceptedAt: now, ageConfirmedAt: now } }));
    signIn();
    router.replace("/onboarding");
  };

  return (
    <AuthLayout title={t("Create your account")} subtitle={t("Your log, records and photos stay yours.")} footerCopy={t("Already have an account?")} footerAction={t("Sign in")} onFooter={() => router.back()} onSocial={go}>
      <Field label={t("Name")} value={name} onChangeText={setName} placeholder={t("Your name")} style={{ marginTop: 0 }} />
      <Field label={t("Email")} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
      <Field label={t("Password")} value={password} onChangeText={setPassword} secureTextEntry placeholder={t("At least 8 characters")} icon="lock" />

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
        {t("We store nothing about you until you create the account.")}
      </Txt>
    </AuthLayout>
  );
}

function Check({ on, onPress, label, children }: { on: boolean; onPress: () => void; label?: string; children?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label} onPress={onPress} hitSlop={6} style={{ paddingVertical: 6 }}>
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
