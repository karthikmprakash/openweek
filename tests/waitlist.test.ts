import { afterEach, describe, expect, it } from "vitest";
import { bookGuest } from "../src/lib/booking";
import { cancelBooking } from "../src/lib/policy";
import { updatePolicies } from "../src/lib/schedule";
import { claimOffer, expireOffers, joinWaitlist } from "../src/lib/waitlist";
import { classOn, studioFixture, tempDb } from "./helpers";

const open: Array<{ close: () => void }> = [];
afterEach(() => open.pop()?.close());

function policies(db: Parameters<typeof updatePolicies>[0], studioId: string, now: Date) {
  updatePolicies(
    db,
    studioId,
    {
      cancellationWindowHours: 0,
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
}

describe("waitlist", () => {
  it("promotes in order, notifies, and moves on when the claim window expires", () => {
    const handle = tempDb();
    open.push(handle);
    const now = new Date("2026-06-01T15:00:00.000Z");
    const studio = studioFixture(handle.db, now);
    policies(handle.db, studio.studioId, now);
    const { sessionId } = classOn(handle.db, studio.studioId, new Date("2026-06-03T16:00:00.000Z"), { capacity: 1 }, now);
    const held = bookGuest(handle.db, { studioId: studio.studioId, sessionId, guestName: "Avery Lane", guestEmail: "avery@example.test" }, now);
    const first = joinWaitlist(handle.db, { studioId: studio.studioId, sessionId, guestName: "Blair Chen", guestEmail: "blair@example.test" }, now);
    const second = joinWaitlist(handle.db, { studioId: studio.studioId, sessionId, guestName: "Casey Diaz", guestEmail: "casey@example.test" }, now);
    expect(first.position).toBe(1);
    expect(second.position).toBe(2);

    cancelBooking(handle.db, { bookingId: held.booking.id }, now);
    const offered = handle.db.prepare(`SELECT * FROM waitlist WHERE id = ?`).get(first.id) as {
      status: string;
      offer_expires_at: string;
      booking_id: string;
    };
    expect(offered.status).toBe("offered");
    const note = handle.db.prepare(`SELECT * FROM notifications WHERE idempotency_key = ?`).get(`waitlist-offer:${first.id}`) as {
      template: string;
      member_email: string;
      status: string;
    };
    expect(note.template).toBe("waitlist_offer");
    expect(note.member_email).toBe("blair@example.test");
    expect(note.status).toBe("sent");

    const booking = handle.db.prepare(`SELECT manage_token, status FROM bookings WHERE id = ?`).get(offered.booking_id) as {
      manage_token: string;
      status: string;
    };
    expect(booking.status).toBe("offer_pending");
    const claimed = claimOffer(handle.db, booking.manage_token, now);
    expect(claimed.status).toBe("confirmed");

    cancelBooking(handle.db, { bookingId: claimed.id }, now);
    const reoffered = handle.db.prepare(`SELECT status, offer_expires_at FROM waitlist WHERE id = ?`).get(second.id) as {
      status: string;
      offer_expires_at: string;
    };
    expect(reoffered.status).toBe("offered");
    expireOffers(handle.db, new Date(new Date(reoffered.offer_expires_at).getTime() + 1000));
    const after = handle.db.prepare(`SELECT status FROM waitlist WHERE id = ?`).get(second.id) as { status: string };
    expect(after.status).toBe("expired");
    const confirmed = handle.db.prepare(`SELECT COUNT(*) AS c FROM bookings WHERE session_id = ? AND status = 'confirmed'`).get(sessionId) as {
      c: number;
    };
    expect(confirmed.c).toBe(0);
  });
});
