import { useEffect, useState } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Txt } from "./Text";
import { Icon, type IconName } from "./Icon";
import { keepKeyboard } from "@/keyboard";
import { fontFamily } from "../../../constants/theme";

/**
 * Filled input. The label sits inside the field so the form reads as one column,
 * not label/box/label/box. Focus adds the only outline; an error replaces it with
 * a red one and says what is wrong underneath, where the eye already is.
 */
export function Field({ label, icon, error, style, onFocus, onBlur, ...rest }: TextInputProps & { label: string; icon?: IconName; error?: string }) {
  const { colors, radius } = useTheme();
  const [focused, setFocused] = useState(false);
  // A field that takes focus on its own arrived because somebody pressed a
  // button, and that press must not be read as "done typing".
  useEffect(() => {
    if (rest.autoFocus) keepKeyboard();
  }, [rest.autoFocus]);
  return (
    <View style={{ gap: 6 }}>
      <View
        style={{
          height: 60,
          paddingHorizontal: 16,
          justifyContent: "center",
          borderRadius: radius.button,
          backgroundColor: colors.bg.surface,
          borderWidth: 1,
          borderColor: error ? colors.status.danger : focused ? colors.accent.ember : colors.bg.surface,
        }}
      >
        <Txt variant="labelS" tone="tertiary">
          {label}
        </Txt>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TextInput
            placeholderTextColor={colors.text.tertiary}
            selectionColor={colors.accent.ember}
            accessibilityLabel={label}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            style={[{ flex: 1, color: colors.text.primary, fontFamily: fontFamily.regular, fontSize: 16, paddingVertical: 2, paddingHorizontal: 0 }, style]}
            {...rest}
          />
          {icon ? <Icon name={icon} size={16} color={colors.text.tertiary} /> : null}
        </View>
      </View>
      {error ? (
        <Txt variant="labelS" style={{ color: colors.status.danger, paddingLeft: 4 }}>
          {error}
        </Txt>
      ) : null}
    </View>
  );
}
