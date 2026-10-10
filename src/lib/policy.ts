import type { BookingRow } from "./booking";
import { getBooking } from "./booking";
import { creditsRemaining, restoreCredit, spendCredit, usableEntitlements } from "./credits";
import type { Db } from "./db";
import { DomainError } from "./errors";
import { insertPayment } from "./payments";
import { getSession, getStudio } from "./schedule";
import { promoteNext } from "./waitlist";

export type PolicyOutcome = {
  kind: "early_cancel" | "late_cancel" | "no_show";
  mode: string;
  feeCents: number;
  creditDelta: number;
  message: string;
  bookingId: string;
};

export function cancelBooking(db: Db, input: { bookingId?: string; token?: string }, now: Date): PolicyOutcome {
  return db.transaction(() => {
    const booking = input.token
      ? (db.prepare(`SELECT * FROM bookings WHERE manage_token = ?`).get(input.token) as BookingRow | undefined)
      : input.bookingId
        ? getBooking(db, input.bookingId)
        : null;
    if (!booking) throw new DomainError("That booking was not found.", "not_found");
    if (booking.status === "cancelled" || booking.status === "late_cancelled") {
      const prior = latestOutcome(db, booking.id);
      if (prior) return prior;
      throw new DomainError("This booking is already cancelled.", "cancelled");
    }
    if (booking.status === "offer_pending") {
      db.prepare(`UPDATE bookings SET status = 'cancelled', cancelled_at = ? WHERE id = ?`).run(now.toISOString(), booking.id);
      db.prepare(`UPDATE waitlist SET status = 'cancelled' WHERE booking_id = ?`).run(booking.id);
      const outcome = record(db, booking, "early_cancel", "offer", 0, 0, "The waitlist offer was declined.", now);
      promoteNext(db, booking.session_id, now);
      return outcome;
    }
    const outcome = applyPolicy(db, booking, "cancel", now);
    const session = getSession(db, booking.session_id);
    if (session && session.starts_at > now.toISOString()) promoteNext(db, booking.session_id, now);
    return outcome;
  })();
}

export function markNoShows(db: Db, studioId: string, now: Date): number {
  const rows = db
    .prepare(
      `SELECT b.* FROM bookings b
       JOIN class_sessions s ON s.id = b.session_id
       WHERE b.studio_id = ? AND b.status = 'confirmed' AND s.ends_at <= ?`,
    )
    .all(studioId, now.toISOString()) as BookingRow[];
  for (const booking of rows) {
    db.transaction(() => applyPolicy(db, booking, "no_show", now))();
  }
  return rows.length;
}

function applyPolicy(db: Db, booking: BookingRow, reason: "cancel" | "no_show", now: Date): PolicyOutcome {
  const studio = getStudio(db, booking.studio_id);
  const session = getSession(db, booking.session_id);
  if (!session) throw new DomainError("The class for this booking is gone.", "not_found");
  const windowMs = studio.cancellation_window_hours * 60 * 60 * 1000;
  const starts = new Date(session.starts_at).getTime();
  const early = reason === "cancel" && starts - now.getTime() >= windowMs;

  if (early) {
    const delta = booking.entitlement_id ? restoreCredit(db, booking.entitlement_id) : 0;
    db.prepare(`UPDATE bookings SET status = 'cancelled', cancelled_at = ? WHERE id = ?`).run(now.toISOString(), booking.id);
    const message =
      delta > 0
        ? "Cancelled in time. The visit was returned to the pass."
        : "Cancelled in time. No fee applies.";
    return record(db, booking, "early_cancel", "window", 0, delta, message, now);
  }

  const mode = reason === "no_show" ? studio.no_show_mode : studio.late_cancel_mode;
  const fee = reason === "no_show" ? studio.no_show_fee_cents : studio.late_cancel_fee_cents;
  const kind = reason === "no_show" ? "no_show" : "late_cancel";
  let creditDelta = 0;
  let feeCents = 0;

  if (mode === "fee") {
    if (booking.entitlement_id) creditDelta += restoreCredit(db, booking.entitlement_id);
    feeCents = fee;
    if (feeCents > 0) {
      insertPayment(
        db,
        {
          studioId: booking.studio_id,
          bookingId: booking.id,
          memberId: booking.member_id,
          amountCents: feeCents,
          applicationFeeCents: null,
          status: "succeeded",
          kind: reason === "no_show" ? "no_show_fee" : "late_fee",
        },
        now,
      );
    }
  } else if (mode === "credit") {
    creditDelta += extraCreditPenalty(db, booking, now);
  }

  const status = reason === "no_show" ? "no_show" : "late_cancelled";
  db.prepare(`UPDATE bookings SET status = ?, cancelled_at = ? WHERE id = ?`).run(
    status,
    reason === "cancel" ? now.toISOString() : null,
    booking.id,
  );

  const message = describe(kind, mode, feeCents, creditDelta);
  return record(db, booking, kind, mode, feeCents, creditDelta, message, now);
}

function extraCreditPenalty(db: Db, booking: BookingRow, now: Date): number {
  if (!booking.member_id) return 0;
  const usable = usableEntitlements(db, booking.member_id, now).filter((row) => row.id !== booking.entitlement_id);
  const same = booking.entitlement_id
    ? usableEntitlements(db, booking.member_id, now).find((row) => row.id === booking.entitlement_id)
    : undefined;
  const target = same && (same.unlimited === 1 || (creditsRemaining(db, same.id) ?? 0) > 0) ? same : usable[0];
  if (!target) return 0;
  if (target.unlimited === 1) return 0;
  const before = creditsRemaining(db, target.id) ?? 0;
  if (before < 1) return 0;
  spendCredit(db, target.id, now);
  return -1;
}

function describe(kind: "late_cancel" | "no_show", mode: string, feeCents: number, creditDelta: number): string {
  const label = kind === "no_show" ? "No-show" : "Late cancel";
  if (mode === "fee") {
    const dollars = (feeCents / 100).toFixed(2);
    return creditDelta > 0
      ? `${label}. A $${dollars} fee applies, and the visit was returned to the pass.`
      : `${label}. A $${dollars} fee applies.`;
  }
  if (mode === "credit") {
    return creditDelta < 0
      ? `${label}. An extra visit was taken from the pass.`
      : `${label}. The visit stays on the pass and is not returned.`;
  }
  return `${label}. The visit is kept and no fee was added.`;
}

function record(
  db: Db,
  booking: BookingRow,
  kind: PolicyOutcome["kind"],
  mode: string,
  feeCents: number,
  creditDelta: number,
  message: string,
  now: Date,
): PolicyOutcome {
  db.prepare(
    `INSERT INTO policy_outcomes (id, studio_id, booking_id, kind, mode, fee_cents, credit_delta, message, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(crypto.randomUUID(), booking.studio_id, booking.id, kind, mode, feeCents, creditDelta, message, now.toISOString());
  return { kind, mode, feeCents, creditDelta, message, bookingId: booking.id };
}

export function latestOutcome(db: Db, bookingId: string): PolicyOutcome | null {
  const row = db
    .prepare(
      `SELECT kind, mode, fee_cents AS feeCents, credit_delta AS creditDelta, message, booking_id AS bookingId
       FROM policy_outcomes WHERE booking_id = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .get(bookingId) as PolicyOutcome | undefined;
  return row ?? null;
}
