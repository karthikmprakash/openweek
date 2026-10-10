import type { Db } from "./db";
import { memberByEmail, spendCredit, upsertMember, usableEntitlements } from "./credits";
import { DomainError } from "./errors";
import { createDirectCharge, insertPayment } from "./payments";
import { getSession } from "./schedule";
import type Stripe from "stripe";

const HOLDING = `('confirmed','offer_pending','attended','no_show')`;

export type BookingRow = {
  id: string;
  studio_id: string;
  session_id: string;
  member_id: string | null;
  guest_name: string;
  guest_email: string;
  status: string;
  entitlement_id: string | null;
  manage_token: string;
  created_at: string;
};

export function holdingCount(db: Db, sessionId: string): number {
  const row = db
    .prepare(`SELECT COUNT(*) AS c FROM bookings WHERE session_id = ? AND status IN ${HOLDING}`)
    .get(sessionId) as { c: number };
  return row.c;
}

export function spotsLeft(db: Db, sessionId: string): number {
  const session = getSession(db, sessionId);
  if (!session) return 0;
  return Math.max(0, session.capacity - holdingCount(db, sessionId));
}

export type BookResult = {
  booking: BookingRow;
  spotsLeft: number;
  usedEntitlementId: string | null;
};

function normalEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function bookGuest(
  db: Db,
  input: { studioId: string; sessionId: string; guestName: string; guestEmail: string },
  now: Date,
): BookResult {
  const name = input.guestName.trim();
  const email = normalEmail(input.guestEmail);
  if (name.length < 2) throw new DomainError("Add the name that should be on the roster.", "name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DomainError("Add a real email.", "email");

  return db.transaction(() => {
    const session = getSession(db, input.sessionId);
    if (!session || session.studio_id !== input.studioId) {
      throw new DomainError("That class is not on this schedule.", "not_found");
    }
    if (session.status !== "scheduled") throw new DomainError("This class was cancelled.", "cancelled");
    if (session.starts_at <= now.toISOString()) throw new DomainError("This class has already started.", "past");
    if (holdingCount(db, session.id) >= session.capacity) {
      throw new DomainError("This class is full. Join the waitlist.", "full");
    }

    const memberId = upsertMember(db, input.studioId, name, email, now);
    const member = memberByEmail(db, input.studioId, email);
    const credits = member ? usableEntitlements(db, member.id, now) : [];
    let entitlementId: string | null = null;
    if (credits.length > 0) {
      entitlementId = credits[0].id;
      spendCredit(db, entitlementId, now);
    } else if (session.drop_in_price_cents > 0) {
      throw new DomainError("This class needs a card payment or an active pass.", "payment_required");
    }

    const booking = insertBooking(db, {
      studioId: input.studioId,
      sessionId: session.id,
      memberId,
      guestName: name,
      guestEmail: email,
      status: "confirmed",
      entitlementId,
      now,
    });
    return { booking, spotsLeft: spotsLeft(db, session.id), usedEntitlementId: entitlementId };
  })();
}

export async function bookWithCard(
  db: Db,
  stripe: Stripe,
  input: {
    studioId: string;
    sessionId: string;
    guestName: string;
    guestEmail: string;
    idempotencyKey: string;
    stripeAccountId: string | null;
  },
  now: Date,
): Promise<BookResult> {
  const name = input.guestName.trim();
  const email = normalEmail(input.guestEmail);
  const session = getSession(db, input.sessionId);
  if (!session || session.studio_id !== input.studioId) {
    throw new DomainError("That class is not on this schedule.", "not_found");
  }
  if (session.drop_in_price_cents < 50) {
    throw new DomainError("Set a drop-in price of at least 50 cents before taking a card.", "amount");
  }
  if (holdingCount(db, session.id) >= session.capacity) {
    throw new DomainError("This class is full. Join the waitlist.", "full");
  }

  const existing = db
    .prepare(`SELECT id, booking_id FROM payments WHERE idempotency_key = ?`)
    .get(input.idempotencyKey) as { id: string; booking_id: string | null } | undefined;
  if (existing?.booking_id) {
    const booking = getBooking(db, existing.booking_id);
    if (booking) return { booking, spotsLeft: spotsLeft(db, booking.session_id), usedEntitlementId: booking.entitlement_id };
  }

  const charge = await createDirectCharge(stripe, {
    amountCents: session.drop_in_price_cents,
    currency: "usd",
    metadata: { studio_id: input.studioId, session_id: session.id, guest_email: email },
    stripeAccountId: input.stripeAccountId,
    idempotencyKey: input.idempotencyKey,
  });
  if (charge.status !== "succeeded" && charge.status !== "requires_capture" && charge.status !== "processing") {
    throw new DomainError("The card payment did not complete.", "payment");
  }

  try {
    return db.transaction(() => {
      if (holdingCount(db, session.id) >= session.capacity) {
        throw new DomainError("This class filled while the card was processing.", "full");
      }
      const memberId = upsertMember(db, input.studioId, name, email, now);
      const booking = insertBooking(db, {
        studioId: input.studioId,
        sessionId: session.id,
        memberId,
        guestName: name,
        guestEmail: email,
        status: "confirmed",
        entitlementId: null,
        now,
      });
      insertPayment(
        db,
        {
          studioId: input.studioId,
          bookingId: booking.id,
          memberId,
          amountCents: session.drop_in_price_cents,
          applicationFeeCents: charge.applicationFeeAmount,
          stripePaymentIntentId: charge.id,
          idempotencyKey: input.idempotencyKey,
          status: "succeeded",
          kind: "drop_in",
        },
        now,
      );
      return { booking, spotsLeft: spotsLeft(db, session.id), usedEntitlementId: null };
    })();
  } catch (error) {
    await stripe.refunds.create({ payment_intent: charge.id });
    throw error;
  }
}

export function insertBooking(
  db: Db,
  input: {
    studioId: string;
    sessionId: string;
    memberId: string | null;
    guestName: string;
    guestEmail: string;
    status: string;
    entitlementId: string | null;
    now: Date;
  },
): BookingRow {
  const id = crypto.randomUUID();
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  try {
    db.prepare(
      `INSERT INTO bookings (
        id, studio_id, session_id, member_id, guest_name, guest_email, status,
        entitlement_id, manage_token, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      input.studioId,
      input.sessionId,
      input.memberId,
      input.guestName,
      input.guestEmail,
      input.status,
      input.entitlementId,
      token,
      input.now.toISOString(),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE constraint failed: bookings.session_id")) {
      throw new DomainError("You already have a spot in this class.", "duplicate");
    }
    throw error;
  }
  return getBooking(db, id)!;
}

export function getBooking(db: Db, id: string): BookingRow | null {
  return (db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(id) as BookingRow | undefined) ?? null;
}

export function getBookingByToken(db: Db, token: string): BookingRow | null {
  return (db.prepare(`SELECT * FROM bookings WHERE manage_token = ?`).get(token) as BookingRow | undefined) ?? null;
}

export function listBookingsForSession(db: Db, studioId: string, sessionId: string): BookingRow[] {
  return db
    .prepare(
      `SELECT * FROM bookings WHERE studio_id = ? AND session_id = ? ORDER BY created_at ASC`,
    )
    .all(studioId, sessionId) as BookingRow[];
}

export function listUpcomingBookings(db: Db, studioId: string, now: Date) {
  return db
    .prepare(
      `SELECT b.id, b.guest_name, b.guest_email, b.status, b.manage_token, s.starts_at, c.name AS class_name, s.id AS session_id
       FROM bookings b
       JOIN class_sessions s ON s.id = b.session_id
       JOIN class_types c ON c.id = s.class_type_id
       WHERE b.studio_id = ? AND s.starts_at >= ? AND b.status IN ('confirmed', 'offer_pending', 'attended')
       ORDER BY s.starts_at ASC, b.guest_name ASC`,
    )
    .all(studioId, new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString()) as Array<{
    id: string;
    guest_name: string;
    guest_email: string;
    status: string;
    manage_token: string;
    starts_at: string;
    class_name: string;
    session_id: string;
  }>;
}
