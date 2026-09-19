import { View } from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { useLocalSearchParams } from "expo-router";
import { useNav } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { useT } from "@/i18n";
import { Screen } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/**
 * The screen after something was finished: an account made, the questions
 * answered. One check mark that lands, three lines that follow it in, one
 * button. Nothing rains from the top; the moment is the person's, not the
 * app's.
 */
export default function Done() {
  const { colors } = useTheme();
  const router = useNav();
  const t = useT();
  const { kind = "account" } = useLocalSearchParams<{ kind?: "account" | "food" }>();
  const food = kind === "food";
  const go = () => {
    if (food && router.canGoBack()) router.back();
    else router.replace(food ? "/(tabs)/food" : "/(tabs)");
  };
  const tint = food ? colors.fuel.sage : colors.accent.ember;
  const soft = food ? colors.fuel.soft : colors.accent.soft;

  return (
    <Screen bottom={90} footer={<Animated.View entering={FadeIn.delay(360).duration(240)}><Button label={t("Let's begin")} iconRight="arrowRight" variant={food ? "sage" : "primary"} onPress={go} /></Animated.View>}>
      <View style={{ flex: 1, justifyContent: "center", gap: 28, paddingBottom: 60 }}>
        <Animated.View entering={ZoomIn.duration(380)} style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: soft, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" }}>
          <Icon name="check" size={44} color={tint} strokeWidth={2.6} />
        </Animated.View>
        <View style={{ gap: 10 }}>
          <Animated.View entering={FadeInDown.delay(140).duration(280)}>
            <Txt variant="displayXL">{t("Great, that's done")}</Txt>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(240).duration(280)}>
            <Txt variant="bodyL" tone="secondary">
              {food ? t("Your targets are set and today is waiting. Scan the first pack whenever you like.") : t("Your account is made and your plan is ready. Your first session is on Home; everything you log stays on this phone.")}
            </Txt>
          </Animated.View>
        </View>
      </View>
    </Screen>
  );
}
