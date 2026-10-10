import { afterEach, describe, expect, it } from "vitest";
import { bookGuest } from "../src/lib/booking";
import { createProduct, creditsRemaining, grantEntitlement, upsertMember } from "../src/lib/credits";
import { cancelBooking, markNoShows } from "../src/lib/policy";
import { updatePolicies } from "../src/lib/schedule";
import { classOn, studioFixture, tempDb } from "./helpers";

const open: Array<{ close: () => void }> = [];
afterEach(() => open.pop()?.close());

function configure(
  db: Parameters<typeof updatePolicies>[0],
  studioId: string,
  mode: "fee" | "credit" | "forfeit",
  fee: number,
  now: Date,
) {
  updatePolicies(
    db,
    studioId,
    {
      cancellationWindowHours: 12,
      lateCancelMode: mode,
      lateCancelFeeCents: fee,
      noShowMode: mode,
      noShowFeeCents: fee,
      waitlistClaimMinutes: 30,
      reminderLeadHours: 24,
      timezone: "America/Los_Angeles",
    },
    now,
  );
}

describe("cancellation policy", () => {
  it("returns a credit before the window and charges a fee after it", () => {
    const handle = tempDb();
    open.push(handle);
    const now = new Date("2026-06-01T12:00:00.000Z");
    const studio = studioFixture(handle.db, now);
    configure(handle.db, studio.studioId, "fee", 1500, now);
    const memberId = upsertMember(handle.db, studio.studioId, "Avery Lane", "avery@example.test", now);
    const pack = createProduct(handle.db, { studioId: studio.studioId, kind: "pack", name: "Card", priceCents: 1000, creditCount: 4, validityDays: 60 }, now);
    const entitlementId = grantEntitlement(handle.db, { studioId: studio.studioId, memberId, productId: pack }, now);

    const earlySession = classOn(handle.db, studio.studioId, new Date(now.getTime() + 12 * 60 * 60 * 1000), { priceCents: 4000 }, now);
    const early = bookGuest(handle.db, { studioId: studio.studioId, sessionId: earlySession.sessionId, guestName: "Avery Lane", guestEmail: "avery@example.test" }, now);
    expect(creditsRemaining(handle.db, entitlementId)).toBe(3);
    const earlyOutcome = cancelBooking(handle.db, { token: early.booking.manage_token }, now);
    expect(earlyOutcome.kind).toBe("early_cancel");
    expect(earlyOutcome.feeCents).toBe(0);
    expect(earlyOutcome.creditDelta).toBe(1);
    expect(earlyOutcome.message).toContain("returned");
    expect(creditsRemaining(handle.db, entitlementId)).toBe(4);

    const boundary = classOn(
      handle.db,
      studio.studioId,
      new Date(now.getTime() + 12 * 60 * 60 * 1000 - 1),
      { priceCents: 4000, name: "Edge" },
      now,
    );
    const late = bookGuest(handle.db, { studioId: studio.studioId, sessionId: boundary.sessionId, guestName: "Avery Lane", guestEmail: "avery@example.test" }, now);
    const lateOutcome = cancelBooking(handle.db, { bookingId: late.booking.id }, now);
    expect(lateOutcome.kind).toBe("late_cancel");
    expect(lateOutcome.feeCents).toBe(1500);
    expect(lateOutcome.message).toContain("$15.00");
    const fee = handle.db.prepare(`SELECT amount_cents, application_fee_cents, kind FROM payments WHERE booking_id = ?`).get(late.booking.id) as {
      amount_cents: number;
      application_fee_cents: number | null;
      kind: string;
    };
    expect(fee).toEqual({ amount_cents: 1500, application_fee_cents: null, kind: "late_fee" });
    expect(creditsRemaining(handle.db, entitlementId)).toBe(4);
  });

  it("takes an extra credit on a late cancel when that rule is selected", () => {
    const handle = tempDb();
    open.push(handle);
    const now = new Date("2026-06-01T12:00:00.000Z");
    const studio = studioFixture(handle.db, now);
    configure(handle.db, studio.studioId, "credit", 0, now);
    const memberId = upsertMember(handle.db, studio.studioId, "Avery Lane", "avery@example.test", now);
    const pack = createProduct(handle.db, { studioId: studio.studioId, kind: "pack", name: "Card", priceCents: 1000, creditCount: 3, validityDays: 60 }, now);
    const entitlementId = grantEntitlement(handle.db, { studioId: studio.studioId, memberId, productId: pack }, now);
    const { sessionId } = classOn(handle.db, studio.studioId, new Date(now.getTime() + 60 * 60 * 1000), {}, now);
    const booked = bookGuest(handle.db, { studioId: studio.studioId, sessionId, guestName: "Avery Lane", guestEmail: "avery@example.test" }, now);
    expect(creditsRemaining(handle.db, entitlementId)).toBe(2);
    const outcome = cancelBooking(handle.db, { bookingId: booked.booking.id }, now);
    expect(outcome.kind).toBe("late_cancel");
    expect(outcome.creditDelta).toBe(-1);
    expect(outcome.feeCents).toBe(0);
    expect(creditsRemaining(handle.db, entitlementId)).toBe(1);
    expect(outcome.message.length).toBeGreaterThan(10);
  });

  it("marks a missed class with the no-show rule", () => {
    const handle = tempDb();
    open.push(handle);
    const now = new Date("2026-06-01T12:00:00.000Z");
    const studio = studioFixture(handle.db, now);
    configure(handle.db, studio.studioId, "fee", 1000, now);
    const starts = new Date("2026-05-01T15:00:00.000Z");
    const { sessionId } = classOn(handle.db, studio.studioId, starts, { priceCents: 0 }, now);
    bookGuest(handle.db, { studioId: studio.studioId, sessionId, guestName: "Avery Lane", guestEmail: "avery@example.test" }, new Date("2026-04-01T12:00:00.000Z"));
    const marked = markNoShows(handle.db, studio.studioId, now);
    expect(marked).toBe(1);
    const booking = handle.db.prepare(`SELECT status FROM bookings WHERE session_id = ?`).get(sessionId) as { status: string };
    expect(booking.status).toBe("no_show");
    const fee = handle.db.prepare(`SELECT kind, amount_cents, application_fee_cents FROM payments`).get() as {
      kind: string;
      amount_cents: number;
      application_fee_cents: number | null;
    };
    expect(fee).toEqual({ kind: "no_show_fee", amount_cents: 1000, application_fee_cents: null });
  });
});
