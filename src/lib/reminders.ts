import type { Db } from "./db";
import { memberByEmail } from "./credits";
import { getStudio } from "./schedule";

export type NotificationRow = {
  id: string;
  studio_id: string;
  member_email: string;
  channel: string;
  template: string;
  payload: string;
  idempotency_key: string;
  status: string;
  sent_at: string | null;
};

export function enqueueNotification(
  db: Db,
  input: {
    studioId: string;
    email: string;
    channel?: "email" | "sms";
    template: string;
    payload: Record<string, string>;
    idempotencyKey: string;
    scheduledFor?: string | null;
    respectOptOut?: boolean;
  },
  now: Date,
): { row: NotificationRow; created: boolean } {
  const email = input.email.trim().toLowerCase();
  const member = memberByEmail(db, input.studioId, email);
  const optedOut = input.respectOptOut !== false && member?.email_opt_out === 1;
  const status = optedOut ? "skipped_opt_out" : "sent";
  let created = true;
  try {
    db.prepare(
      `INSERT INTO notifications (
        id, studio_id, member_email, channel, template, payload, idempotency_key, status, scheduled_for, sent_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      crypto.randomUUID(),
      input.studioId,
      email,
      input.channel ?? "email",
      input.template,
      JSON.stringify(input.payload),
      input.idempotencyKey,
      status,
      input.scheduledFor ?? null,
      optedOut ? null : now.toISOString(),
      now.toISOString(),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("UNIQUE constraint failed")) throw error;
    created = false;
  }
  const row = db.prepare(`SELECT * FROM notifications WHERE idempotency_key = ?`).get(input.idempotencyKey) as NotificationRow;
  return { row, created };
}

/** Queue one reminder per confirmed booking inside the lead window. A second run does not send again. */
export function processReminders(db: Db, studioId: string, now: Date): { sent: number; skipped: number } {
  const studio = getStudio(db, studioId);
  const leadMs = studio.reminder_lead_hours * 60 * 60 * 1000;
  const horizon = new Date(now.getTime() + leadMs).toISOString();
  const rows = db
    .prepare(
      `SELECT b.id, b.guest_email, b.guest_name, s.starts_at, c.name AS class_name
       FROM bookings b
       JOIN class_sessions s ON s.id = b.session_id
       JOIN class_types c ON c.id = s.class_type_id
       WHERE b.studio_id = ? AND b.status = 'confirmed' AND s.starts_at > ? AND s.starts_at <= ?`,
    )
    .all(studioId, now.toISOString(), horizon) as Array<{
    id: string;
    guest_email: string;
    guest_name: string;
    starts_at: string;
    class_name: string;
  }>;

  let sent = 0;
  let skipped = 0;
  for (const row of rows) {
    const before = db.prepare(`SELECT id FROM notifications WHERE idempotency_key = ?`).get(`reminder:${row.id}`) as
      | { id: string }
      | undefined;
    if (before) continue;
    const note = enqueueNotification(
      db,
      {
        studioId,
        email: row.guest_email,
        template: "class_reminder",
        payload: {
          name: row.guest_name,
          className: row.class_name,
          startsAt: row.starts_at,
        },
        idempotencyKey: `reminder:${row.id}`,
        scheduledFor: now.toISOString(),
      },
      now,
    );
    if (!note.created) continue;
    if (note.row.status === "sent") sent += 1;
    if (note.row.status === "skipped_opt_out") skipped += 1;
  }
  return { sent, skipped };
}
