import { createContext, useContext, useMemo, type PropsWithChildren } from "react";
import { darkColors, lightColors, layout, motion, radius, shadow, spacing, type, type Theme } from "../../constants/theme";

type Scheme = "dark" | "light";

const ThemeContext = createContext<Theme>({ colors: darkColors, spacing, radius, layout, type, motion, shadow });

/**
 * Dark is the shipped theme. Light exists as a second value set so the switch
 * later is one prop, not a refactor.
 */
export function ThemeProvider({ scheme = "dark", children }: PropsWithChildren<{ scheme?: Scheme }>) {
  const value = useMemo<Theme>(
    () => ({ colors: scheme === "dark" ? darkColors : lightColors, spacing, radius, layout, type, motion, shadow }),
    [scheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
