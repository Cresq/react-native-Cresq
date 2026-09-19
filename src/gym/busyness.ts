/**
 * How busy a gym is, as far as CresQ can honestly say.
 *
 * Nobody publishes live occupancy for gyms: the chains keep theirs inside
 * their own apps, and Google does not offer its "popular times" to other
 * apps. So CresQ has two things to go on, and says which one it is using:
 *
 *   reports   what CresQ lifters at that gym said, shared without a name. A
 *             report from the last hour and a half is "now"; older ones for
 *             the same weekday become that gym's own pattern.
 *   typical   the pattern gyms in general follow (a small early peak, a lull,
 *             the after-work rush, a late-morning bulge at the weekend). It is
 *             not measured at the person's gym, and the card says so.
 */
export type Level = 1 | 2 | 3;

/** The hours on the strip. Outside them a gym is shut or all but empty. */
export const FIRST_HOUR = 6;
export const LAST_HOUR = 23;

export const LEVEL_NAME: Record<Level, string> = { 1: "Quiet", 2: "Moderate", 3: "Busy" };

/** Typical share of a gym's capacity in use, for each hour from FIRST_HOUR to LAST_HOUR. */
const MON_TO_THU = [0.25, 0.4, 0.45, 0.4, 0.3, 0.3, 0.4, 0.35, 0.3, 0.35, 0.55, 0.85, 1, 0.95, 0.75, 0.5, 0.3, 0.15];
const FRIDAY = [0.25, 0.4, 0.45, 0.4, 0.3, 0.3, 0.4, 0.35, 0.35, 0.45, 0.6, 0.75, 0.75, 0.6, 0.45, 0.3, 0.2, 0.1];
const SATURDAY = [0.05, 0.1, 0.25, 0.5, 0.7, 0.8, 0.75, 0.6, 0.5, 0.45, 0.4, 0.35, 0.3, 0.2, 0.15, 0.1, 0.05, 0.05];
const SUNDAY = [0.05, 0.1, 0.2, 0.4, 0.6, 0.7, 0.65, 0.55, 0.45, 0.4, 0.4, 0.4, 0.35, 0.25, 0.15, 0.1, 0.05, 0.05];

export function typicalDay(date: Date): number[] {
  const day = date.getDay();
  return day === 0 ? SUNDAY : day === 6 ? SATURDAY : day === 5 ? FRIDAY : MON_TO_THU;
}

export const levelOf = (share: number): Level => (share < 0.4 ? 1 : share < 0.7 ? 2 : 3);
/** A reported level (1 to 3, averaged) as a share of capacity, so reports and the typical pattern can sit on one strip. */
export const shareOf = (level: number) => Math.max(0, Math.min(1, (level - 1) / 2));

/** The same gym typed twice should be the same gym: case and stray spaces do not count. */
export const gymKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

/** How many reports an hour needs before it speaks for the gym instead of the typical pattern. */
export const ENOUGH = 3;

export type Reported = { hour: number; level: number; n: number };

/** The day's strip: the gym's own reports where there are enough of them, the typical pattern everywhere else. */
export function dayStrip(date: Date, reported: Reported[]): { hour: number; share: number; measured: boolean }[] {
  const typical = typicalDay(date);
  return typical.map((share, i) => {
    const hour = FIRST_HOUR + i;
    const own = reported.find((r) => r.hour === hour && r.n >= ENOUGH);
    return own ? { hour, share: shareOf(own.level), measured: true } : { hour, share, measured: false };
  });
}

/** The next hour today at which the level is different from now's, for the one line of advice under the strip. */
export function nextChange(strip: { hour: number; share: number }[], hour: number): { hour: number; level: Level } | null {
  const now = strip.find((s) => s.hour === hour);
  if (!now) return null;
  const level = levelOf(now.share);
  const later = strip.find((s) => s.hour > hour && levelOf(s.share) !== level);
  return later ? { hour: later.hour, level: levelOf(later.share) } : null;
}
