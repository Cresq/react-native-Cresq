import { createContext, useContext, useMemo, type PropsWithChildren } from "react";
import { darkColors, lightColors, layout, lightShadow, motion, radius, shadow, spacing, type, type Theme } from "../../constants/theme";

type Scheme = "dark" | "light";

const ThemeContext = createContext<Theme>({ colors: darkColors, spacing, radius, layout, type, motion, shadow, scheme: "dark" });

/**
 * Both themes are real. Colours and shadows come as a pair, because a shadow
 * that works on near-black reads as dirt on paper. `scheme` is exposed so the
 * few places that cannot use a token, the status bar and the blur behind the
 * tab bar, can follow.
 */
export function ThemeProvider({ scheme = "dark", children }: PropsWithChildren<{ scheme?: Scheme }>) {
  const value = useMemo<Theme>(
    () => ({ colors: scheme === "dark" ? darkColors : lightColors, spacing, radius, layout, type, motion, shadow: scheme === "dark" ? shadow : lightShadow, scheme }),
    [scheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
