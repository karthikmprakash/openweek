import type { Db } from "./db";
import { restoreCredit } from "./credits";
import { DomainError } from "./errors";
import { enqueueNotification } from "./reminders";
import { getSession, type ClassSession } from "./schedule";

export type SessionSummary = ClassSession & { booked: number; checkedIn: number; waiting: number };

const SUMMARY_SQL = `
  SELECT s.id, s.studio_id, s.class_type_id, c.name AS class_name, s.starts_at, s.ends_at,
         s.capacity, s.instructor_name, s.status, c.drop_in_price_cents, c.duration_min, c.description,
         (SELECT COUNT(*) FROM bookings b
           WHERE b.session_id = s.id AND b.status IN ('confirmed','offer_pending','attended','no_show')) AS booked,
         (SELECT COUNT(*) FROM attendance a WHERE a.session_id = s.id) AS checkedIn,
         (SELECT COUNT(*) FROM waitlist w WHERE w.session_id = s.id AND w.status IN ('waiting','offered')) AS waiting
  FROM class_sessions s
  JOIN class_types c ON c.id = s.class_type_id`;

export function sessionSummaries(db: Db, studioId: string, fromIso: string, toIso: string): SessionSummary[] {
  return db
    .prepare(
      `${SUMMARY_SQL}
       WHERE s.studio_id = ? AND s.starts_at >= ? AND s.starts_at < ? AND s.status = 'scheduled'
       ORDER BY s.starts_at ASC`,
    )
    .all(studioId, fromIso, toIso) as SessionSummary[];
}

export function sessionSummary(db: Db, studioId: string, sessionId: string): SessionSummary | null {
  return (
    (db.prepare(`${SUMMARY_SQL} WHERE s.studio_id = ? AND s.id = ?`).get(studioId, sessionId) as SessionSummary | undefined) ??
    null
  );
}

export type RosterRow = {
  id: string;
  session_id: string;
  member_id: string | null;
  guest_name: string;
  guest_email: string;
  status: string;
  manage_token: string;
  attendance_id: string | null;
  method: "self" | "staff" | null;
  product_name: string | null;
};

export function rosterFor(db: Db, studioId: string, sessionIds: string[]): RosterRow[] {
  if (sessionIds.length === 0) return [];
  const marks = sessionIds.map(() => "?").join(",");
  return db
    .prepare(
      `SELECT b.id, b.session_id, b.member_id, b.guest_name, b.guest_email, b.status, b.manage_token,
              a.id AS attendance_id, a.method AS method, p.name AS product_name
       FROM bookings b
       LEFT JOIN attendance a ON a.booking_id = b.id
       LEFT JOIN entitlements e ON e.id = b.entitlement_id
       LEFT JOIN products p ON p.id = e.product_id
       WHERE b.studio_id = ? AND b.session_id IN (${marks})
         AND b.status IN ('confirmed','offer_pending','attended','no_show')
       ORDER BY b.guest_name COLLATE NOCASE ASC`,
    )
    .all(studioId, ...sessionIds) as RosterRow[];
}

export function waitlistFor(db: Db, studioId: string, sessionId: string) {
  return db
    .prepare(
      `SELECT id, guest_name, guest_email, position, status, offer_expires_at
       FROM waitlist WHERE studio_id = ? AND session_id = ? AND status IN ('waiting','offered')
       ORDER BY position ASC`,
    )
    .all(studioId, sessionId) as Array<{
    id: string;
    guest_name: string;
    guest_email: string;
    position: number;
    status: string;
    offer_expires_at: string | null;
  }>;
}

export type CancelSessionResult = { cancelled: number; restored: number; paidByCard: number; waitlistClosed: number };

/**
 * The studio cancels a class: every holder is released, pass visits go back,
 * the waitlist closes, and each member is told. Card refunds stay in Stripe.
 */
export function cancelSession(db: Db, studioId: string, sessionId: string, now: Date): CancelSessionResult {
  return db.transaction(() => {
    const session = getSession(db, sessionId);
    if (!session || session.studio_id !== studioId) throw new DomainError("That class is not on this schedule.", "not_found");
    if (session.status === "cancelled") throw new DomainError("This class is already cancelled.", "cancelled");
    if (session.ends_at <= now.toISOString()) throw new DomainError("This class has already ended.", "past");

    db.prepare(`UPDATE class_sessions SET status = 'cancelled' WHERE id = ?`).run(sessionId);
    const holders = db
      .prepare(`SELECT id, guest_email, guest_name, entitlement_id FROM bookings WHERE session_id = ? AND status IN ('confirmed','offer_pending')`)
      .all(sessionId) as Array<{ id: string; guest_email: string; guest_name: string; entitlement_id: string | null }>;

    let restored = 0;
    let paidByCard = 0;
    for (const booking of holders) {
      const delta = booking.entitlement_id ? restoreCredit(db, booking.entitlement_id) : 0;
      restored += delta;
      const paid = db
        .prepare(`SELECT COUNT(*) AS c FROM payments WHERE booking_id = ? AND status = 'succeeded' AND stripe_payment_intent_id IS NOT NULL`)
        .get(booking.id) as { c: number };
      paidByCard += paid.c > 0 ? 1 : 0;
      db.prepare(`UPDATE bookings SET status = 'cancelled', cancelled_at = ? WHERE id = ?`).run(now.toISOString(), booking.id);
      const message =
        delta > 0
          ? "The studio cancelled this class. The visit was returned to your pass."
          : paid.c > 0
            ? "The studio cancelled this class. The studio will refund your card."
            : "The studio cancelled this class. Nothing was charged.";
      db.prepare(
        `INSERT INTO policy_outcomes (id, studio_id, booking_id, kind, mode, fee_cents, credit_delta, message, created_at)
         VALUES (?, ?, ?, 'early_cancel', 'studio', 0, ?, ?, ?)`,
      ).run(crypto.randomUUID(), studioId, booking.id, delta, message, now.toISOString());
      enqueueNotification(
        db,
        {
          studioId,
          email: booking.guest_email,
          template: "class_cancelled",
          payload: { name: booking.guest_name, className: session.class_name, startsAt: session.starts_at },
          idempotencyKey: `class-cancelled:${booking.id}`,
          respectOptOut: false,
        },
        now,
      );
    }
    const closed = db
      .prepare(`UPDATE waitlist SET status = 'cancelled' WHERE session_id = ? AND status IN ('waiting','offered')`)
      .run(sessionId);
    return { cancelled: holders.length, restored, paidByCard, waitlistClosed: closed.changes };
  })();
}

export function memberDetail(db: Db, studioId: string, memberId: string, now: Date) {
  const member = db
    .prepare(`SELECT id, name, email, phone, email_opt_out, created_at FROM members WHERE studio_id = ? AND id = ?`)
    .get(studioId, memberId) as
    | { id: string; name: string; email: string; phone: string | null; email_opt_out: number; created_at: string }
    | undefined;
  if (!member) return null;
  const passes = db
    .prepare(
      `SELECT e.id, p.name, p.kind, e.credits_remaining, e.unlimited, e.expires_at
       FROM entitlements e JOIN products p ON p.id = e.product_id
       WHERE e.member_id = ? ORDER BY e.expires_at DESC`,
    )
    .all(member.id) as Array<{
    id: string;
    name: string;
    kind: string;
    credits_remaining: number | null;
    unlimited: number;
    expires_at: string;
  }>;
  const bookings = db
    .prepare(
      `SELECT b.id, b.status, s.id AS session_id, s.starts_at, c.name AS class_name
       FROM bookings b
       JOIN class_sessions s ON s.id = b.session_id
       JOIN class_types c ON c.id = s.class_type_id
       WHERE b.studio_id = ? AND b.guest_email = ?
       ORDER BY s.starts_at DESC LIMIT 50`,
    )
    .all(studioId, member.email) as Array<{ id: string; status: string; session_id: string; starts_at: string; class_name: string }>;
  const nowIso = now.toISOString();
  const holding = new Set(["confirmed", "offer_pending", "attended"]);
  return {
    member,
    activePasses: passes.filter((pass) => pass.expires_at > nowIso && (pass.unlimited === 1 || (pass.credits_remaining ?? 0) > 0)),
    pastPasses: passes.filter((pass) => !(pass.expires_at > nowIso && (pass.unlimited === 1 || (pass.credits_remaining ?? 0) > 0))),
    upcoming: bookings.filter((row) => row.starts_at >= nowIso && holding.has(row.status)).reverse(),
    history: bookings.filter((row) => row.starts_at < nowIso || !holding.has(row.status)),
  };
}
