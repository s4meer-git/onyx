/**
 * All workout dates are plain YYYY-MM-DD strings in the user's local timezone,
 * so a late-night session never lands on the wrong day and streaks can't drift.
 */

export const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE ?? "Asia/Kolkata";

export function todayISO(timeZone: string = TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const date = isoToDate(iso);
  date.setDate(date.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatLong(iso: string): string {
  return isoToDate(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** "Sat 1 Aug" — compact enough to sit beside the brand mark on a small phone. */
export function formatCompact(iso: string): string {
  return isoToDate(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatShort(iso: string): string {
  return isoToDate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function relativeDay(iso: string, today = todayISO()): string {
  if (iso === today) return "Today";
  if (iso === addDays(today, -1)) return "Yesterday";
  const diff = Math.round((isoToDate(today).getTime() - isoToDate(iso).getTime()) / 86_400_000);
  if (diff > 0 && diff < 7) return `${diff} days ago`;
  if (diff >= 7 && diff < 14) return "Last week";
  return formatShort(iso);
}

/** The last `count` dates ending today, oldest first. */
export function recentDates(count: number, today = todayISO()): string[] {
  return Array.from({ length: count }, (_, i) => addDays(today, i - count + 1));
}
