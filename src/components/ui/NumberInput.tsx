import { useState } from "react";
import { TextInput, type TextInputProps } from "react-native";
import { useHeld } from "@/typing";

/**
 * A number typed into a box.
 *
 * While the box has focus the typed text is the truth. Reading the number
 * back out on every keystroke eats the decimal point ("82." is 82, and the
 * next key makes it 825), so a half kilo could not be typed. The owner hears
 * the number when the typing pauses or the box is left, see `useHeld`.
 */
export function NumberInput({ value, onCommit, decimal, pause, onFocus, onBlur, ...rest }: Omit<TextInputProps, "value" | "onChangeText"> & { value: number; onCommit: (n: number) => void; /** Allow a decimal point, typed as a point or a comma. */ decimal?: boolean; /** How long the typing pauses before the owner hears; 0 where a late number could land on a row that has moved. */ pause?: number }) {
  const [draft, setDraft] = useState<string | null>(null);
  const { hold, tell } = useHeld<{ n: number }>((p) => onCommit(p.n), pause);
  return (
    <TextInput
      keyboardType={decimal ? "decimal-pad" : "number-pad"}
      selectTextOnFocus
      {...rest}
      value={draft ?? String(value)}
      onChangeText={(v) => {
        const clean = decimal ? v.replace(",", ".").replace(/[^0-9.]/g, "") : v.replace(/[^0-9]/g, "");
        setDraft(clean);
        hold({ n: Number(clean) || 0 });
      }}
      onFocus={onFocus}
      onBlur={(e) => {
        tell();
        setDraft(null);
        onBlur?.(e);
      }}
    />
  );
}
