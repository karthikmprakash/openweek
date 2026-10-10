import type { Db } from "./db";
import { markNoShows } from "./policy";
import { processReminders } from "./reminders";
import { expireOffers } from "./waitlist";

export function runJobs(db: Db, studioId: string, now: Date) {
  const reminders = processReminders(db, studioId, now);
  const offersExpired = expireOffers(db, now);
  const noShows = markNoShows(db, studioId, now);
  return { reminders, offersExpired, noShows };
}
