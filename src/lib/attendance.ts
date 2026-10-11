import type { Db } from "./db";
import { getBooking } from "./booking";
import { DomainError } from "./errors";
import { getSession } from "./schedule";

export const SELF_CHECK_IN_OPENS_MIN = 60;

/** Members can tap "I'm here" from an hour before class until it ends. */
export function selfCheckInWindow(session: { starts_at: string; ends_at: string }): { opensAt: Date; closesAt: Date } {
  return {
    opensAt: new Date(new Date(session.starts_at).getTime() - SELF_CHECK_IN_OPENS_MIN * 60 * 1000),
    closesAt: new Date(session.ends_at),
  };
}

export type AttendanceRow = {
  id: string;
  booking_id: string;
  session_id: string;
  studio_id: string;
  method: "self" | "staff";
  checked_in_at: string;
};

export function checkIn(
  db: Db,
  input: { bookingId: string; studioId: string; method: "self" | "staff"; token?: string },
  now: Date,
): AttendanceRow {
  const booking = getBooking(db, input.bookingId);
  if (!booking || booking.studio_id !== input.studioId) {
    throw new DomainError("That booking is not on this roster.", "not_found");
  }
  if (input.method === "self" && input.token !== booking.manage_token) {
    throw new DomainError("Open the link from your confirmation to check in.", "auth");
  }
  if (booking.status === "cancelled" || booking.status === "late_cancelled") {
    throw new DomainError("This booking is cancelled.", "cancelled");
  }
  if (booking.status === "offer_pending") {
    throw new DomainError("Claim the spot before checking in.", "offer");
  }

  const existing = db.prepare(`SELECT * FROM attendance WHERE booking_id = ?`).get(booking.id) as AttendanceRow | undefined;
  if (existing) return existing;

  if (input.method === "self") {
    const session = getSession(db, booking.session_id);
    if (!session) throw new DomainError("The class for this booking is gone.", "not_found");
    const window = selfCheckInWindow(session);
    if (now < window.opensAt) {
      throw new DomainError(`Check-in opens ${SELF_CHECK_IN_OPENS_MIN} minutes before class.`, "too_early");
    }
    if (now > window.closesAt) throw new DomainError("This class has ended. Ask the studio to check you in.", "too_late");
  }

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO attendance (id, booking_id, session_id, studio_id, method, checked_in_at) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, booking.id, booking.session_id, booking.studio_id, input.method, now.toISOString());
  db.prepare(`UPDATE bookings SET status = 'attended' WHERE id = ? AND status = 'confirmed'`).run(booking.id);
  return db.prepare(`SELECT * FROM attendance WHERE id = ?`).get(id) as AttendanceRow;
}

export function attendanceForBooking(db: Db, bookingId: string): AttendanceRow | null {
  return (db.prepare(`SELECT * FROM attendance WHERE booking_id = ?`).get(bookingId) as AttendanceRow | undefined) ?? null;
}

export function listAttendance(db: Db, studioId: string, sessionId: string): AttendanceRow[] {
  return db
    .prepare(`SELECT * FROM attendance WHERE studio_id = ? AND session_id = ? ORDER BY checked_in_at`)
    .all(studioId, sessionId) as AttendanceRow[];
}
