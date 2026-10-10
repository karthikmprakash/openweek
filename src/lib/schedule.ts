import type { Db } from "./db";
import { DomainError } from "./errors";
import { addMinutes } from "./time";

export type Studio = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  cancellation_window_hours: number;
  late_cancel_mode: "fee" | "credit" | "forfeit";
  late_cancel_fee_cents: number;
  no_show_mode: "fee" | "credit" | "forfeit";
  no_show_fee_cents: number;
  waitlist_claim_minutes: number;
  reminder_lead_hours: number;
  stripe_account_id: string | null;
};

export type ClassSession = {
  id: string;
  studio_id: string;
  class_type_id: string;
  class_name: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  instructor_name: string;
  status: string;
  drop_in_price_cents: number;
  duration_min: number;
  description: string;
};

export function getStudio(db: Db, studioId: string): Studio {
  const row = db.prepare(`SELECT * FROM studios WHERE id = ?`).get(studioId) as Studio | undefined;
  if (!row) throw new DomainError("Studio not found.", "not_found");
  return row;
}

export function getStudioBySlug(db: Db, slug: string): Studio | null {
  return (db.prepare(`SELECT * FROM studios WHERE slug = ?`).get(slug) as Studio | undefined) ?? null;
}

export function updatePolicies(
  db: Db,
  studioId: string,
  input: {
    cancellationWindowHours: number;
    lateCancelMode: "fee" | "credit" | "forfeit";
    lateCancelFeeCents: number;
    noShowMode: "fee" | "credit" | "forfeit";
    noShowFeeCents: number;
    waitlistClaimMinutes: number;
    reminderLeadHours: number;
    timezone: string;
  },
  now: Date,
): void {
  if (!Number.isFinite(input.cancellationWindowHours) || input.cancellationWindowHours < 0) {
    throw new DomainError("Cancellation window must be zero or more hours.", "policy");
  }
  db.prepare(
    `UPDATE studios SET
      cancellation_window_hours = ?,
      late_cancel_mode = ?,
      late_cancel_fee_cents = ?,
      no_show_mode = ?,
      no_show_fee_cents = ?,
      waitlist_claim_minutes = ?,
      reminder_lead_hours = ?,
      timezone = ?,
      updated_at = ?
     WHERE id = ?`,
  ).run(
    input.cancellationWindowHours,
    input.lateCancelMode,
    input.lateCancelFeeCents,
    input.noShowMode,
    input.noShowFeeCents,
    input.waitlistClaimMinutes,
    input.reminderLeadHours,
    input.timezone,
    now.toISOString(),
    studioId,
  );
}

export function setStripeAccount(db: Db, studioId: string, accountId: string | null, now: Date): void {
  if (accountId && !/^acct_[A-Za-z0-9]+$/.test(accountId)) {
    throw new DomainError("Stripe account ids look like acct_ followed by letters and numbers.", "stripe");
  }
  db.prepare(`UPDATE studios SET stripe_account_id = ?, updated_at = ? WHERE id = ?`).run(
    accountId,
    now.toISOString(),
    studioId,
  );
}

export function createClassType(
  db: Db,
  input: {
    studioId: string;
    name: string;
    durationMin: number;
    capacity: number;
    dropInPriceCents: number;
    description?: string;
  },
  now: Date,
): string {
  if (input.name.trim().length < 2) throw new DomainError("Name the class.", "name");
  if (input.durationMin < 10 || input.durationMin > 240) {
    throw new DomainError("Class length should be between 10 and 240 minutes.", "duration");
  }
  if (input.capacity < 1 || input.capacity > 40) {
    throw new DomainError("Spot count should be between 1 and 40.", "capacity");
  }
  const id = crypto.randomUUID();
  const iso = now.toISOString();
  db.prepare(
    `INSERT INTO class_types (
      id, studio_id, name, duration_min, default_capacity, drop_in_price_cents, description, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.studioId,
    input.name.trim(),
    input.durationMin,
    input.capacity,
    input.dropInPriceCents,
    input.description?.trim() ?? "",
    iso,
    iso,
  );
  return id;
}

export function addSession(
  db: Db,
  input: {
    studioId: string;
    classTypeId: string;
    startsAt: Date;
    capacity?: number;
    instructorName?: string;
  },
  now: Date,
): string {
  const classType = db
    .prepare(`SELECT * FROM class_types WHERE id = ? AND studio_id = ?`)
    .get(input.classTypeId, input.studioId) as
    | { duration_min: number; default_capacity: number }
    | undefined;
  if (!classType) throw new DomainError("That class does not belong to this studio.", "not_found");
  const ends = addMinutes(input.startsAt, classType.duration_min);
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO class_sessions (
      id, studio_id, class_type_id, starts_at, ends_at, capacity, instructor_name, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)`,
  ).run(
    id,
    input.studioId,
    input.classTypeId,
    input.startsAt.toISOString(),
    ends.toISOString(),
    input.capacity ?? classType.default_capacity,
    input.instructorName?.trim() ?? "",
    now.toISOString(),
  );
  return id;
}

export function listSessions(db: Db, studioId: string, fromIso: string, toIso: string): ClassSession[] {
  return db
    .prepare(
      `SELECT s.id, s.studio_id, s.class_type_id, c.name AS class_name, s.starts_at, s.ends_at,
              s.capacity, s.instructor_name, s.status, c.drop_in_price_cents, c.duration_min, c.description
       FROM class_sessions s
       JOIN class_types c ON c.id = s.class_type_id
       WHERE s.studio_id = ? AND s.starts_at >= ? AND s.starts_at < ? AND s.status = 'scheduled'
       ORDER BY s.starts_at ASC`,
    )
    .all(studioId, fromIso, toIso) as ClassSession[];
}

export function getSession(db: Db, sessionId: string): ClassSession | null {
  return (
    (db
      .prepare(
        `SELECT s.id, s.studio_id, s.class_type_id, c.name AS class_name, s.starts_at, s.ends_at,
                s.capacity, s.instructor_name, s.status, c.drop_in_price_cents, c.duration_min, c.description
         FROM class_sessions s
         JOIN class_types c ON c.id = s.class_type_id
         WHERE s.id = ?`,
      )
      .get(sessionId) as ClassSession | undefined) ?? null
  );
}

export function listClassTypes(db: Db, studioId: string) {
  return db
    .prepare(
      `SELECT id, name, duration_min, default_capacity, drop_in_price_cents, description
       FROM class_types WHERE studio_id = ? ORDER BY name`,
    )
    .all(studioId) as Array<{
    id: string;
    name: string;
    duration_min: number;
    default_capacity: number;
    drop_in_price_cents: number;
    description: string;
  }>;
}
