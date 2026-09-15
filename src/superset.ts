/**
 * Supersets are told apart by colour, not by number: every group letter maps
 * to one of six fixed hues that read on the dark and the light theme alike.
 * Text on them is always the dark ink.
 */
const PALETTE = ["#5B9CFF", "#8FCBA8", "#F2B826", "#FF7A70", "#4FD1C5", "#FFB454"] as const;

export const SUPERSET_INK = "#16100a";

export function supersetColor(group?: string) {
  if (!group) return undefined;
  const i = (group.charCodeAt(0) - 65) % PALETTE.length;
  return PALETTE[i < 0 ? 0 : i];
}
