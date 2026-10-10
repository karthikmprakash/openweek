import type { Db } from "./db";
import { getBooking } from "./booking";
import { DomainError } from "./errors";

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

export function roster(db: Db, studioId: string, now: Date) {
  const from = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
  return db
    .prepare(
      `SELECT b.id, b.guest_name, b.guest_email, b.status, c.name AS class_name, s.starts_at,
              a.method AS method, a.id AS attendance_id
       FROM bookings b
       JOIN class_sessions s ON s.id = b.session_id
       JOIN class_types c ON c.id = s.class_type_id
       LEFT JOIN attendance a ON a.booking_id = b.id
       WHERE b.studio_id = ? AND s.starts_at >= ? AND b.status IN ('confirmed', 'attended')
       ORDER BY s.starts_at ASC, b.guest_name ASC`,
    )
    .all(studioId, from) as Array<{
    id: string;
    guest_name: string;
    guest_email: string;
    status: string;
    class_name: string;
    starts_at: string;
    method: "self" | "staff" | null;
    attendance_id: string | null;
  }>;
}

export function listAttendance(db: Db, studioId: string, sessionId: string): AttendanceRow[] {
  return db
    .prepare(`SELECT * FROM attendance WHERE studio_id = ? AND session_id = ? ORDER BY checked_in_at`)
    .all(studioId, sessionId) as AttendanceRow[];
}
