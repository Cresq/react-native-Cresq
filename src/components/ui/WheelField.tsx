import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useT } from "@/i18n";
import { haptic } from "@/haptics";
import { Txt } from "./Text";
import { Icon } from "./Icon";
import { BottomSheet } from "./BottomSheet";
import { WheelPicker } from "./WheelPicker";

/**
 * A field for a figure you pick rather than type. It looks like every other
 * field, the label inside and the value under it; pressing it brings the wheel
 * up in a sheet. The value changes only when the sheet's tick is pressed, so
 * a wheel brushed on the way past changes nothing, and the page itself stays
 * as quiet as a form.
 *
 * The wheels are the children, and they are built when the sheet opens, so
 * they always start from the figure the field is showing.
 */
export function WheelField({ label, text, placeholder, title, subtitle, confirm, accent = "ember", onOpen, onConfirm, children }: { label: string; /** The value as the field shows it; absent shows the placeholder. */ text?: string; placeholder?: string; /** The sheet's title; the label when absent. */ title?: string; subtitle?: string; /** What the tick in the sheet's header says to a screen reader. */ confirm: string; accent?: "ember" | "sage"; onOpen?: () => void; onConfirm: () => void; children: ReactNode }) {
  const { colors, radius } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={text ? `${label}, ${text}` : label}
        onPress={() => {
          onOpen?.();
          haptic("tap");
          setOpen(true);
        }}
        style={({ pressed }) => ({ height: 60, paddingHorizontal: 16, justifyContent: "center", borderRadius: radius.button, backgroundColor: colors.bg.surface, borderWidth: 1, borderColor: open ? (accent === "sage" ? colors.fuel.sage : colors.accent.ember) : colors.bg.surface, opacity: pressed ? 0.8 : 1 })}
      >
        <Txt variant="labelS" tone="tertiary">
          {label}
        </Txt>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Txt variant="bodyL" tone={text ? "primary" : "tertiary"} numberOfLines={1} style={{ flex: 1, paddingVertical: 2 }}>
            {text ?? placeholder ?? ""}
          </Txt>
          <Icon name="chevronDown" size={16} color={colors.text.tertiary} strokeWidth={2} />
        </View>
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)} title={title ?? label} subtitle={subtitle} confirm={{ label: confirm, accent, onPress: () => { onConfirm(); setOpen(false); } }}>
        <View style={{ paddingHorizontal: 8, paddingBottom: 8, gap: 12 }}>{open ? children : null}</View>
      </BottomSheet>
    </>
  );
}

/** The common case: one wheel of numbers. The draft lives here; the parent hears about it only when it is confirmed. */
export function NumberWheelField({ label, title, values, value, onChange, format = String, accent }: { label: string; title?: string; values: number[]; value: number; onChange: (v: number) => void; format?: (v: number) => string; accent?: "ember" | "sage" }) {
  const t = useT();
  const [draft, setDraft] = useState(value);
  return (
    <WheelField label={label} title={title} text={format(value)} confirm={t("Use {value}", { value: format(draft) })} accent={accent} onOpen={() => setDraft(value)} onConfirm={() => onChange(draft)}>
      <WheelPicker values={values} value={draft} onChange={setDraft} format={format} />
    </WheelField>
  );
}
