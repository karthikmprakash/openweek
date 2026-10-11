import { holdingCount, insertBooking, type BookingRow } from "./booking";
import { spendCredit, upsertMember, usableEntitlements } from "./credits";
import type { Db } from "./db";
import { DomainError } from "./errors";
import { enqueueNotification } from "./reminders";
import { getSession, getStudio } from "./schedule";
import { addMinutes } from "./time";

export type WaitlistRow = {
  id: string;
  studio_id: string;
  session_id: string;
  guest_name: string;
  guest_email: string;
  position: number;
  status: string;
  offer_expires_at: string | null;
  booking_id: string | null;
  created_at: string;
};

export function joinWaitlist(
  db: Db,
  input: { studioId: string; sessionId: string; guestName: string; guestEmail: string },
  now: Date,
): WaitlistRow {
  const email = input.guestEmail.trim().toLowerCase();
  const name = input.guestName.trim();
  if (name.length < 2) throw new DomainError("Add the name that should be on the list.", "name");
  return db.transaction(() => {
    const session = getSession(db, input.sessionId);
    if (!session || session.studio_id !== input.studioId) throw new DomainError("That class is not on this schedule.", "not_found");
    if (holdingCount(db, session.id) < session.capacity) {
      throw new DomainError("There is still a spot. Reserve it instead of waiting.", "open");
    }
    const existing = db
      .prepare(
        `SELECT * FROM waitlist WHERE session_id = ? AND guest_email = ? AND status IN ('waiting', 'offered')`,
      )
      .get(session.id, email) as WaitlistRow | undefined;
    if (existing) return existing;
    upsertMember(db, input.studioId, name, email, now);
    const pos = db.prepare(`SELECT COALESCE(MAX(position), 0) AS p FROM waitlist WHERE session_id = ?`).get(session.id) as {
      p: number;
    };
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO waitlist (
        id, studio_id, session_id, guest_name, guest_email, position, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'waiting', ?)`,
    ).run(id, input.studioId, session.id, name, email, pos.p + 1, now.toISOString());
    return db.prepare(`SELECT * FROM waitlist WHERE id = ?`).get(id) as WaitlistRow;
  })();
}

export function promoteNext(db: Db, sessionId: string, now: Date): WaitlistRow | null {
  const session = getSession(db, sessionId);
  if (!session) return null;
  if (holdingCount(db, sessionId) >= session.capacity) return null;
  const next = db
    .prepare(
      `SELECT * FROM waitlist WHERE session_id = ? AND status = 'waiting' ORDER BY position ASC, created_at ASC LIMIT 1`,
    )
    .get(sessionId) as WaitlistRow | undefined;
  if (!next) return null;
  const studio = getStudio(db, session.studio_id);
  const expires = addMinutes(now, studio.waitlist_claim_minutes);
  const member = db
    .prepare(`SELECT id FROM members WHERE studio_id = ? AND email = ?`)
    .get(session.studio_id, next.guest_email) as { id: string } | undefined;
  const booking: BookingRow = insertBooking(db, {
    studioId: session.studio_id,
    sessionId,
    memberId: member?.id ?? null,
    guestName: next.guest_name,
    guestEmail: next.guest_email,
    status: "offer_pending",
    entitlementId: null,
    now,
  });
  db.prepare(
    `UPDATE waitlist SET status = 'offered', offer_expires_at = ?, booking_id = ? WHERE id = ?`,
  ).run(expires.toISOString(), booking.id, next.id);
  enqueueNotification(
    db,
    {
      studioId: session.studio_id,
      email: next.guest_email,
      template: "waitlist_offer",
      payload: {
        className: session.class_name,
        claimPath: `/b/${booking.manage_token}`,
        expiresAt: expires.toISOString(),
      },
      idempotencyKey: `waitlist-offer:${next.id}`,
    },
    now,
  );
  return db.prepare(`SELECT * FROM waitlist WHERE id = ?`).get(next.id) as WaitlistRow;
}

export function claimOffer(db: Db, bookingToken: string, now: Date): BookingRow {
  return db.transaction(() => {
    const booking = db.prepare(`SELECT * FROM bookings WHERE manage_token = ?`).get(bookingToken) as BookingRow | undefined;
    if (!booking || booking.status !== "offer_pending") {
      throw new DomainError("There is no open offer on this link.", "offer");
    }
    const offer = db.prepare(`SELECT * FROM waitlist WHERE booking_id = ?`).get(booking.id) as WaitlistRow | undefined;
    if (!offer || offer.status !== "offered" || !offer.offer_expires_at) {
      throw new DomainError("This offer is no longer available.", "offer");
    }
    if (offer.offer_expires_at <= now.toISOString()) {
      throw new DomainError("The claim window has closed.", "expired");
    }
    let entitlementId: string | null = null;
    if (booking.member_id) {
      const credits = usableEntitlements(db, booking.member_id, now);
      if (credits.length > 0) {
        entitlementId = credits[0].id;
        spendCredit(db, entitlementId, now);
      }
    }
    db.prepare(`UPDATE bookings SET status = 'confirmed', entitlement_id = ? WHERE id = ?`).run(entitlementId, booking.id);
    db.prepare(`UPDATE waitlist SET status = 'claimed' WHERE id = ?`).run(offer.id);
    return db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(booking.id) as BookingRow;
  })();
}

export function expireOffers(db: Db, now: Date): number {
  const due = db
    .prepare(`SELECT * FROM waitlist WHERE status = 'offered' AND offer_expires_at <= ?`)
    .all(now.toISOString()) as WaitlistRow[];
  let moved = 0;
  for (const offer of due) {
    db.transaction(() => {
      db.prepare(`UPDATE waitlist SET status = 'expired' WHERE id = ? AND status = 'offered'`).run(offer.id);
      if (offer.booking_id) {
        db.prepare(
          `UPDATE bookings SET status = 'cancelled', cancelled_at = ? WHERE id = ? AND status = 'offer_pending'`,
        ).run(now.toISOString(), offer.booking_id);
      }
      promoteNext(db, offer.session_id, now);
    })();
    moved += 1;
  }
  return moved;
}

export function listWaitlist(db: Db, studioId: string, sessionId: string): WaitlistRow[] {
  return db
    .prepare(`SELECT * FROM waitlist WHERE studio_id = ? AND session_id = ? ORDER BY position ASC`)
    .all(studioId, sessionId) as WaitlistRow[];
}

export function waitlistForEmail(db: Db, studioId: string, sessionId: string, email: string): WaitlistRow | null {
  return (
    (db
      .prepare(
        `SELECT * FROM waitlist WHERE studio_id = ? AND session_id = ? AND guest_email = ? AND status IN ('waiting', 'offered')`,
      )
      .get(studioId, sessionId, email.trim().toLowerCase()) as WaitlistRow | undefined) ?? null
  );
}

export function listActiveWaitlistForEmail(db: Db, studioId: string, email: string) {
  return db
    .prepare(
      `SELECT session_id, position, status FROM waitlist
       WHERE studio_id = ? AND guest_email = ? AND status IN ('waiting', 'offered')`,
    )
    .all(studioId, email.trim().toLowerCase()) as Array<{ session_id: string; position: number; status: string }>;
}
