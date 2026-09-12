import { useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/store/auth";
import { AuthLayout } from "@/components/AuthLayout";
import { Txt } from "@/components/ui/Text";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";

export default function SignUp() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const filled = [name, email, password].filter(Boolean).length;
  const progress = 0.2 + filled * 0.15;

  const go = () => {
    signIn();
    router.replace("/onboarding");
  };

  return (
    <AuthLayout title="Create your account" subtitle="Your log, records and photos stay yours." footerCopy="Already have an account?" footerAction="Sign in" onFooter={() => router.back()} onSocial={go}>
      <ProgressBar value={progress} label="Almost ready for your first workout" right={`${Math.round(progress * 100)}%`} />
      <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" style={{ marginTop: 0 }} />
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 8 characters" icon="lock" />
      <Button label="Create account" onPress={go} style={{ marginTop: 6 }} />
      <Txt variant="labelS" tone="tertiary" align="center">
        By continuing you agree to the Terms and the Privacy Policy.
      </Txt>
    </AuthLayout>
  );
}
