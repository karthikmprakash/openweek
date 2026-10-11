export function tzOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(instant).map((part) => [part.type, part.value]));
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - instant.getTime();
}

/** Convert a `datetime-local` value in a studio's zone to a UTC Date. */
export function zonedLocalToUtc(local: string, timeZone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!match) throw new Error("Enter a date and time.");
  const [, ys, ms, ds, hs, mins] = match;
  const utcGuess = new Date(Date.UTC(Number(ys), Number(ms) - 1, Number(ds), Number(hs), Number(mins), 0));
  const offset = tzOffsetMs(utcGuess, timeZone);
  const adjusted = new Date(utcGuess.getTime() - offset);
  const offset2 = tzOffsetMs(adjusted, timeZone);
  if (offset2 !== offset) return new Date(utcGuess.getTime() - offset2);
  return adjusted;
}

export function formatInZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Compact “26 min ago” for recent activity. Full timestamps stay on `title`. */
export function formatRelativeTo(iso: string, now: Date, compact = false): string {
  const minutes = Math.round((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return compact ? "now" : "just now";
  if (minutes < 60) return compact ? `${minutes}m ago` : `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return compact ? `${hours}h ago` : hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 14) return compact ? `${days}d ago` : `${days} days ago`;
  return compact ? `${Math.round(days / 7)}w ago` : `${Math.round(days / 7)} weeks ago`;
}

export function formatDay(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(0);
    return true;
  } catch {
    return false;
  }
}

/** `YYYY-MM-DD` for the calendar day an instant falls on in a zone. */
export function ymdInZone(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
}

export function shiftYmd(ymd: string, days: number): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

/** First and last calendar day of the month containing `instant`, in the studio zone. */
export function monthYmds(instant: Date, timeZone: string, offsetMonths = 0): { first: string; last: string } {
  const [year, month] = ymdInZone(instant, timeZone).split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1 + offsetMonths, 1));
  const last = new Date(Date.UTC(year, month + offsetMonths, 0));
  return { first: first.toISOString().slice(0, 10), last: last.toISOString().slice(0, 10) };
}

/** Half-open UTC range covering local days `fromYmd` through `toYmd` inclusive. */
export function localDaysToUtcRange(fromYmd: string, toYmd: string, timeZone: string): { from: Date; to: Date } {
  return {
    from: zonedLocalToUtc(`${fromYmd}T00:00`, timeZone),
    to: zonedLocalToUtc(`${shiftYmd(toYmd, 1)}T00:00`, timeZone),
  };
}

/** `datetime-local` value for an instant in a zone. */
export function toLocalInput(instant: Date, timeZone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

const COMMON_ZONES: Array<[string, string]> = [
  ["America/Los_Angeles", "Pacific time (Los Angeles)"],
  ["America/Denver", "Mountain time (Denver)"],
  ["America/Phoenix", "Arizona (Phoenix)"],
  ["America/Chicago", "Central time (Chicago)"],
  ["America/New_York", "Eastern time (New York)"],
  ["America/Toronto", "Toronto"],
  ["America/Vancouver", "Vancouver"],
  ["Europe/London", "London"],
  ["Europe/Dublin", "Dublin"],
  ["Europe/Berlin", "Berlin"],
  ["Europe/Paris", "Paris"],
  ["Asia/Kolkata", "India (Kolkata)"],
  ["Asia/Singapore", "Singapore"],
  ["Asia/Dubai", "Dubai"],
  ["Australia/Sydney", "Sydney"],
  ["Australia/Melbourne", "Melbourne"],
  ["Pacific/Auckland", "Auckland"],
];

/** Common studio zones first, then every zone the runtime knows. `current` is always included. */
export function timeZoneOptions(current?: string): { common: Array<[string, string]>; all: string[] } {
  const known = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  const common = COMMON_ZONES.filter(([zone]) => isValidTimeZone(zone));
  const commonIds = new Set(common.map(([zone]) => zone));
  const all = known.filter((zone) => !commonIds.has(zone));
  if (current && !commonIds.has(current) && !all.includes(current)) all.unshift(current);
  return { common, all };
}
