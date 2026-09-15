import { Component, type PropsWithChildren, type ReactNode } from "react";
import { View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useT } from "@/i18n";
import { Mark } from "@/components/Brand";
import { Txt } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { flushDb } from "@/db/storage";

/**
 * The last line before a white screen. A render fault anywhere below is caught
 * here, what is in memory is written to the device, and the person is given a
 * way back instead of a blank app. The session itself is already in the
 * document, so trying again resumes exactly where they were.
 */
export class ErrorBoundary extends Component<PropsWithChildren, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch() {
    // Whatever the fault was, the log in memory is still good. Get it onto the device.
    flushDb();
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return <Fallback message={this.state.error.message} onRetry={() => this.setState({ error: null })} />;
  }
}

function Fallback({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { colors } = useTheme();
  const t = useT();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.ground, alignItems: "center", justifyContent: "center", padding: 32, gap: 20 }}>
      <Mark size={72} />
      <View style={{ gap: 8, alignItems: "center" }}>
        <Txt variant="displayM" align="center">
          {t("That did not go to plan")}
        </Txt>
        <Txt variant="bodyM" tone="secondary" align="center">
          {t("Something in the app stopped. Your workout and your log are saved, nothing is lost.")}
        </Txt>
      </View>
      <Button label={t("Try again")} full={false} onPress={onRetry} />
      {__DEV__ ? (
        <Txt variant="labelS" tone="tertiary" align="center">
          {message}
        </Txt>
      ) : null}
    </View>
  );
}
