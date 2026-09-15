/**
 * CresQ design tokens. Names mirror the Figma variables and text styles
 * (Foundations page, "CresQ · Build spec"). Code references tokens, never hex.
 */

export const darkColors = {
  bg: { ground: "#151311", surface: "#1E1B18", raised: "#292520", inverse: "#F4EFE6" },
  border: { subtle: "#2E2A25", strong: "#3D3831", highlight: "rgba(255,255,255,0.06)" },
  text: { primary: "#F4EFE6", secondary: "#A8A197", tertiary: "#6F695F", inverse: "#16100A" },
  icon: { default: "#A8A197", strong: "#F4EFE6" },
  accent: { ember: "#F26B1D", pressed: "#D4581A", soft: "#3A2416", on: "#16100A" },
  fuel: { sage: "#8FCBA8", soft: "#1B2E25" },
  pr: { gold: "#F2B826", soft: "#3A2F10" },
  status: { success: "#5DBE7A", warning: "#E8B84A", danger: "#E5544B" },
} as const;

/** Proposed light theme. Same keys, second set of values. Not shipped in v1. */
export const lightColors: Colors = {
  bg: { ground: "#F6F3EE", surface: "#FFFFFF", raised: "#EFEBE4", inverse: "#1B1815" },
  border: { subtle: "#E3DED6", strong: "#CFC9BF", highlight: "rgba(255,255,255,0.8)" },
  text: { primary: "#1B1815", secondary: "#5E5850", tertiary: "#8C867C", inverse: "#F6F3EE" },
  icon: { default: "#5E5850", strong: "#1B1815" },
  accent: { ember: "#E8621A", pressed: "#C9520F", soft: "#FDE6D8", on: "#1B1815" },
  fuel: { sage: "#3F8F66", soft: "#E2F1E8" },
  pr: { gold: "#C9920A", soft: "#FBF0CC" },
  status: { success: "#2E9E55", warning: "#C2901A", danger: "#D23F36" },
};

export type Colors = {
  [G in keyof typeof darkColors]: { [K in keyof (typeof darkColors)[G]]: string };
};

/**
 * A 4 pt grid. Every gap, padding and inset is one of these; nothing in between.
 * The two exceptions are the 1 and 2 pt nudges that hold a label against the
 * figure it belongs to, which are typography, not layout.
 */
export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const;

export const radius = {
  pill: 999,
  tabBar: 36,
  sheet: 32,
  bar: 28,
  card: 24,
  cardM: 20,
  row: 18,
  button: 16,
  setRow: 14,
  input: 12,
  iconBox: 10,
} as const;

/**
 * Rhythm: 24 between sections, 12 inside a section, 8 between list rows.
 * One contained surface per screen (the anchor); everything else sits on the ground.
 */
export const layout = {
  screenInset: 20,
  sectionGap: 28,
  innerGap: 12,
  rowGap: 8,
  tabBarHeight: 74,
  tabBarInset: 16,
  /** Content bottom padding so lists scroll clear of the floating tab bar. */
  tabBarClearance: 130,
} as const;

/** One family, Inter, chosen 14 Sep 2026. Titles lean on weight and tighter tracking, not on a second face. */
export const fontFamily = {
  displaySemi: "Inter-SemiBold",
  displayBold: "Inter-Bold",
  displayHeavy: "Inter-ExtraBold",
  regular: "Inter-Regular",
  medium: "Inter-Medium",
  semibold: "Inter-SemiBold",
  bold: "Inter-Bold",
  italic: "Inter-Italic",
} as const;

export type TypeStyle = { fontFamily: string; fontSize: number; lineHeight: number; letterSpacing: number };

const t = (fontFamilyName: string, fontSize: number, lineHeight: number, letterSpacing = 0): TypeStyle => ({
  fontFamily: fontFamilyName,
  fontSize,
  lineHeight,
  letterSpacing,
});

/** Mirrors the Figma text styles one to one. */
export const type = {
  displayXL: t(fontFamily.displayHeavy, 34, 40, -0.9),
  displayL: t(fontFamily.displayBold, 26, 31, -0.6),
  displayM: t(fontFamily.displaySemi, 20, 25, -0.4),
  displayS: t(fontFamily.displaySemi, 17, 22, -0.25),
  numberXL: t(fontFamily.displayHeavy, 44, 48, -1.2),
  numberL: t(fontFamily.displayBold, 28, 31, -0.7),
  numberM: t(fontFamily.displaySemi, 20, 23, -0.4),
  bodyL: t(fontFamily.regular, 16, 23),
  bodyM: t(fontFamily.regular, 15, 21),
  bodyS: t(fontFamily.regular, 13, 18),
  labelL: t(fontFamily.semibold, 15, 20),
  labelM: t(fontFamily.medium, 13, 16, 0.05),
  labelS: t(fontFamily.medium, 11, 14, 0.2),
  buttonL: t(fontFamily.semibold, 16, 20),
  buttonM: t(fontFamily.semibold, 14, 18),
} as const;

export type TypeVariant = keyof typeof type;

export const motion = { fast: 120, base: 200, slow: 320 } as const;

/** One depth level, as React Native wants it. */
export type ShadowLevel = { shadowColor: string; shadowOpacity: number; shadowRadius: number; shadowOffset: { width: number; height: number }; elevation: number };
/** The five levels a theme has to supply. */
export type ShadowSet = { card: ShadowLevel; lifted: ShadowLevel; ember: ShadowLevel; gold: ShadowLevel; floating: ShadowLevel };

export const shadow: ShadowSet = {
  /** A surface resting on the page. Every card carries this; it is what stops the app reading flat. */
  card: { shadowColor: "#000000", shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  /** Picked up: a dragged exercise, a sheet on its way in. */
  lifted: { shadowColor: "#000000", shadowOpacity: 0.45, shadowRadius: 26, shadowOffset: { width: 0, height: 16 }, elevation: 14 },
  ember: { shadowColor: "#F26B1D", shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  gold: { shadowColor: "#F2B826", shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 16 }, elevation: 6 },
  floating: { shadowColor: "#000000", shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
};

/**
 * The same four levels on a light page, where black at a third would read as
 * dirt. Depth there comes from a soft, wide shadow and almost no darkness.
 */
export const lightShadow: ShadowSet = {
  card: { shadowColor: "#2A241C", shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  lifted: { shadowColor: "#2A241C", shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 10 },
  ember: { shadowColor: "#E8621A", shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  gold: { shadowColor: "#C9920A", shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 5 },
  floating: { shadowColor: "#2A241C", shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
};

export const theme = { colors: darkColors, spacing, radius, layout, type, motion, shadow, scheme: "dark" as "dark" | "light" } as const;
export type Theme = { colors: Colors; scheme: "dark" | "light" } & Omit<typeof theme, "colors" | "scheme">;
