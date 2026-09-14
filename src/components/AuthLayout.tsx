import type { PropsWithChildren } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { Screen, Row } from "./ui/Screen";
import { Lockup } from "./Brand";
import { Txt } from "./ui/Text";
import { Button } from "./ui/Button";
import { BrandLogo } from "./ui/Icon";
import { useT } from "@/i18n";

/**
 * One layout for Sign in and Sign up so both screens share exact positions.
 *
 * Lockup centering: the lockup is placed in a full-width row with its box centred
 * on the screen axis, not on the form column. The artwork has the round mark on
 * the left and the lighter wordmark on the right, so its visual centre sits a
 * little left of its box centre; a 3 pt nudge to the right corrects that.
 */
const LOCKUP_WIDTH = 140;
const OPTICAL_NUDGE = 3;

export function AuthLayout({ title, subtitle, children, footerCopy, footerAction, onFooter, onSocial }: PropsWithChildren<{ title: string; subtitle: string; footerCopy: string; footerAction: string; onFooter: () => void; onSocial: () => void }>) {
  const insets = useSafeAreaInsets();
  const t = useT();
  return (
    <Screen contentStyle={{ gap: 0, flexGrow: 1, paddingTop: insets.top + 36 }}>
      <View style={{ alignItems: "center", paddingLeft: OPTICAL_NUDGE }}>
        <Lockup width={LOCKUP_WIDTH} />
      </View>

      <View style={{ gap: 6, paddingTop: 48 }}>
        <Txt variant="displayL">{title}</Txt>
        <Txt variant="bodyM" tone="secondary">
          {subtitle}
        </Txt>
      </View>

      <View style={{ gap: 10, paddingTop: 28 }}>{children}</View>

      <View style={{ gap: 10, paddingTop: 28 }}>
        <OrDivider />
        <Button label={t("Continue with Apple")} variant="secondary" size="M" leading={<BrandLogo brand="apple" size={16} />} onPress={onSocial} />
        <Button label={t("Continue with Google")} variant="secondary" size="M" leading={<BrandLogo brand="google" size={16} />} onPress={onSocial} />
      </View>

      <View style={{ flex: 1 }} />
      <Row justify="center" gap={6} style={{ paddingTop: 24 }}>
        <Txt variant="bodyS" tone="tertiary">
          {footerCopy}
        </Txt>
        <Pressable accessibilityRole="button" onPress={onFooter} hitSlop={8}>
          <Txt variant="labelM">{footerAction}</Txt>
        </Pressable>
      </Row>
    </Screen>
  );
}

function OrDivider() {
  const { colors } = useTheme();
  const t = useT();
  return (
    <Row gap={12} style={{ paddingVertical: 6 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border.subtle }} />
      <Txt variant="labelS" tone="tertiary">
        {t("or")}
      </Txt>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border.subtle }} />
    </Row>
  );
}
