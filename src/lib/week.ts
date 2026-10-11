import { shiftYmd, ymdInZone, zonedLocalToUtc } from "./time";

export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDayShort(iso: string, timeZone: string): { weekday: string; date: string } {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(new Date(iso));
  const date = new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric" }).format(new Date(iso));
  return { weekday, date };
}

export function zonedYmd(instant: Date, timeZone: string): string {
  return ymdInZone(instant, timeZone);
}

/** Seven midnights in the studio zone, starting today or at `?week=YYYY-MM-DD`. */
export function sevenDays(weekParam: string | undefined, now: Date, timeZone: string): { start: Date; days: Date[] } {
  const valid = weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) && !Number.isNaN(Date.parse(`${weekParam}T00:00:00Z`));
  const startYmd = valid ? weekParam : ymdInZone(now, timeZone);
  const days = Array.from({ length: 7 }, (_, index) => zonedLocalToUtc(`${shiftYmd(startYmd, index)}T00:00`, timeZone));
  return { start: days[0], days };
}

export function weekRangeLabel(days: Date[], timeZone: string): string {
  const first = days[0];
  const last = days[days.length - 1];
  const month = (date: Date) => new Intl.DateTimeFormat("en-US", { timeZone, month: "short" }).format(date);
  const day = (date: Date) => new Intl.DateTimeFormat("en-US", { timeZone, day: "numeric" }).format(date);
  return month(first) === month(last)
    ? `${month(first)} ${day(first)} – ${day(last)}`
    : `${month(first)} ${day(first)} – ${month(last)} ${day(last)}`;
}

export function weekLinks(basePath: string, days: Date[], timeZone: string, now: Date) {
  const current = ymdInZone(days[0], timeZone);
  const today = ymdInZone(now, timeZone);
  const join = basePath.includes("?") ? "&" : "?";
  return {
    previous: `${basePath}${join}week=${shiftYmd(current, -7)}`,
    next: `${basePath}${join}week=${shiftYmd(current, 7)}`,
    today: basePath,
    isCurrent: current === today,
    startsBeforeToday: current < today,
    label: weekRangeLabel(days, timeZone),
  };
}
