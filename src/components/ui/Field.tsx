import { useState } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Txt } from "./Text";
import { Icon, type IconName } from "./Icon";
import { fontFamily } from "../../../constants/theme";

/** Filled input. The label sits inside the field so the form reads as one column, not label/box/label/box. Focus adds the only outline. */
export function Field({ label, icon, style, onFocus, onBlur, ...rest }: TextInputProps & { label: string; icon?: IconName }) {
  const { colors, radius } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={{
        height: 60,
        paddingHorizontal: 16,
        justifyContent: "center",
        borderRadius: radius.button,
        backgroundColor: colors.bg.surface,
        borderWidth: 1,
        borderColor: focused ? colors.accent.ember : colors.bg.surface,
      }}
    >
      <Txt variant="labelS" tone="tertiary">
        {label}
      </Txt>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <TextInput
          placeholderTextColor={colors.text.tertiary}
          selectionColor={colors.accent.ember}
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
  );
}
