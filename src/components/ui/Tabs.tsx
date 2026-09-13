import { Pressable, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Txt } from "./Text";

export type Tab = { key: string; label: string; count?: number };

/**
 * Chapters of one screen. Text on a hairline with an underline under the
 * open one, so it reads as "parts of this page", not as a filter (that is
 * what Segmented is for). Two to four tabs; a page that wants more wants a
 * new screen instead. Content above the tabs is what every chapter shares.
 */
export function Tabs({ tabs, value, onChange }: { tabs: Tab[]; value: string; onChange: (key: string) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 22, borderBottomWidth: 1, borderBottomColor: colors.border.subtle }}>
      {tabs.map((t) => {
        const on = t.key === value;
        return (
          <Pressable
            key={t.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(t.key)}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            style={{ flexDirection: "row", alignItems: "baseline", gap: 5, paddingVertical: 10, marginBottom: -1, borderBottomWidth: 2, borderBottomColor: on ? colors.text.primary : "transparent" }}
          >
            <Txt variant="labelL" tone={on ? "primary" : "tertiary"}>
              {t.label}
            </Txt>
            {t.count !== undefined ? (
              <Txt variant="labelS" tone="tertiary" tabular>
                {t.count}
              </Txt>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
