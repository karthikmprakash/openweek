import { afterEach, describe, expect, it } from "vitest";
import { bookGuest } from "../src/lib/booking";
import { setEmailOptOut } from "../src/lib/credits";
import { processReminders } from "../src/lib/reminders";
import { updatePolicies } from "../src/lib/schedule";
import { classOn, studioFixture, tempDb } from "./helpers";

const open: Array<{ close: () => void }> = [];
afterEach(() => open.pop()?.close());

describe("reminders", () => {
  it("sends once inside the lead window and skips opt-outs", () => {
    const handle = tempDb();
    open.push(handle);
    const now = new Date("2026-06-01T15:00:00.000Z");
    const studio = studioFixture(handle.db, now);
    updatePolicies(
      handle.db,
      studio.studioId,
      {
        cancellationWindowHours: 12,
        lateCancelMode: "forfeit",
        lateCancelFeeCents: 0,
        noShowMode: "forfeit",
        noShowFeeCents: 0,
        waitlistClaimMinutes: 30,
        reminderLeadHours: 24,
        timezone: "America/Los_Angeles",
      },
      now,
    );
    const soon = classOn(handle.db, studio.studioId, new Date("2026-06-02T14:00:00.000Z"), { name: "Soon", capacity: 4 }, now);
    const later = classOn(handle.db, studio.studioId, new Date("2026-06-04T14:00:00.000Z"), { name: "Later", capacity: 4 }, now);
    bookGuest(handle.db, { studioId: studio.studioId, sessionId: soon.sessionId, guestName: "Avery Lane", guestEmail: "avery@example.test" }, now);
    bookGuest(handle.db, { studioId: studio.studioId, sessionId: soon.sessionId, guestName: "Blair Chen", guestEmail: "blair@example.test" }, now);
    bookGuest(handle.db, { studioId: studio.studioId, sessionId: later.sessionId, guestName: "Casey Diaz", guestEmail: "casey@example.test" }, now);
    setEmailOptOut(handle.db, studio.studioId, "blair@example.test", true);

    const first = processReminders(handle.db, studio.studioId, now);
    const second = processReminders(handle.db, studio.studioId, now);
    expect(first).toEqual({ sent: 1, skipped: 1 });
    expect(second).toEqual({ sent: 0, skipped: 0 });

    const sent = handle.db.prepare(`SELECT member_email, status FROM notifications WHERE template = 'class_reminder' ORDER BY member_email`).all() as Array<{
      member_email: string;
      status: string;
    }>;
    expect(sent).toEqual([
      { member_email: "avery@example.test", status: "sent" },
      { member_email: "blair@example.test", status: "skipped_opt_out" },
    ]);
  });
});
