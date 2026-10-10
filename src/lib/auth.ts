import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { Db } from "./db";
import { DomainError } from "./errors";

export type StaffContext = {
  staffId: string;
  studioId: string;
  email: string;
  name: string;
  role: "owner" | "instructor";
  studioName: string;
  slug: string;
  timezone: string;
};

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [kind, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const actual = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

function newToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

export function createStudioAccount(
  db: Db,
  input: {
    studioName: string;
    slug: string;
    ownerName: string;
    email: string;
    password: string;
    timezone: string;
  },
  now: Date,
): { token: string; studioId: string; staffId: string } {
  const slug = input.slug.trim().toLowerCase();
  const email = input.email.trim().toLowerCase();
  if (!SLUG.test(slug) || slug.length < 3 || slug.length > 40) {
    throw new DomainError("Use 3–40 letters, numbers, and dashes for the web address.", "slug");
  }
  if (input.password.length < 8) {
    throw new DomainError("Use at least 8 characters.", "password");
  }
  if (input.studioName.trim().length < 2) {
    throw new DomainError("Add the studio name.", "name");
  }
  const studioId = crypto.randomUUID();
  const staffId = crypto.randomUUID();
  const iso = now.toISOString();
  const passwordHash = hashPassword(input.password);
  try {
    db.transaction(() => {
      db.prepare(
        `INSERT INTO studios (
          id, name, slug, timezone, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(studioId, input.studioName.trim(), slug, input.timezone || "America/Los_Angeles", iso, iso);
      db.prepare(
        `INSERT INTO staff (id, studio_id, email, name, password_hash, role, created_at)
         VALUES (?, ?, ?, ?, ?, 'owner', ?)`,
      ).run(staffId, studioId, email, input.ownerName.trim(), passwordHash, iso);
    })();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("studios.slug")) throw new DomainError("That web address is taken.", "slug");
    if (message.includes("staff.email")) throw new DomainError("That email already has a studio.", "email");
    throw error;
  }
  const token = openSession(db, staffId, now);
  return { token, studioId, staffId };
}

export function login(
  db: Db,
  email: string,
  password: string,
  now: Date,
): { token: string; studioId: string } {
  const staff = db
    .prepare(`SELECT id, studio_id, password_hash FROM staff WHERE email = ?`)
    .get(email.trim().toLowerCase()) as { id: string; studio_id: string; password_hash: string } | undefined;
  if (!staff || !verifyPassword(password, staff.password_hash)) {
    throw new DomainError("Email or password does not match.", "auth");
  }
  return { token: openSession(db, staff.id, now), studioId: staff.studio_id };
}

function openSession(db: Db, staffId: string, now: Date): string {
  const { token, hash } = newToken();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    `INSERT INTO auth_sessions (id, staff_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`,
  ).run(crypto.randomUUID(), staffId, hash, expires, now.toISOString());
  return token;
}

export function staffFromToken(db: Db, token: string, now: Date): StaffContext | null {
  const hash = createHash("sha256").update(token).digest("hex");
  const row = db
    .prepare(
      `SELECT s.id AS staff_id, s.studio_id, s.email, s.name, s.role,
              st.name AS studio_name, st.slug, st.timezone, a.expires_at
       FROM auth_sessions a
       JOIN staff s ON s.id = a.staff_id
       JOIN studios st ON st.id = s.studio_id
       WHERE a.token_hash = ?`,
    )
    .get(hash) as
    | {
        staff_id: string;
        studio_id: string;
        email: string;
        name: string;
        role: "owner" | "instructor";
        studio_name: string;
        slug: string;
        timezone: string;
        expires_at: string;
      }
    | undefined;
  if (!row) return null;
  if (row.expires_at <= now.toISOString()) return null;
  return {
    staffId: row.staff_id,
    studioId: row.studio_id,
    email: row.email,
    name: row.name,
    role: row.role,
    studioName: row.studio_name,
    slug: row.slug,
    timezone: row.timezone,
  };
}

export function revokeSession(db: Db, token: string): void {
  const hash = createHash("sha256").update(token).digest("hex");
  db.prepare(`DELETE FROM auth_sessions WHERE token_hash = ?`).run(hash);
}

export function deleteStudio(db: Db, studioId: string): void {
  db.transaction(() => {
    db.prepare(`DELETE FROM attendance WHERE studio_id = ?`).run(studioId);
    db.prepare(`DELETE FROM policy_outcomes WHERE studio_id = ?`).run(studioId);
    db.prepare(`DELETE FROM notifications WHERE studio_id = ?`).run(studioId);
    db.prepare(`DELETE FROM payments WHERE studio_id = ?`).run(studioId);
    db.prepare(`DELETE FROM waitlist WHERE studio_id = ?`).run(studioId);
    db.prepare(`DELETE FROM bookings WHERE studio_id = ?`).run(studioId);
    db.prepare(`DELETE FROM entitlements WHERE studio_id = ?`).run(studioId);
    db.prepare(`DELETE FROM class_sessions WHERE studio_id = ?`).run(studioId);
    db.prepare(`DELETE FROM class_types WHERE studio_id = ?`).run(studioId);
    db.prepare(`DELETE FROM products WHERE studio_id = ?`).run(studioId);
    db.prepare(`DELETE FROM members WHERE studio_id = ?`).run(studioId);
    db.prepare(`DELETE FROM auth_sessions WHERE staff_id IN (SELECT id FROM staff WHERE studio_id = ?)`).run(studioId);
    db.prepare(`DELETE FROM staff WHERE studio_id = ?`).run(studioId);
    db.prepare(`DELETE FROM import_runs WHERE studio_id = ?`).run(studioId);
    db.prepare(`DELETE FROM studios WHERE id = ?`).run(studioId);
  })();
}

export function consumeRateLimit(db: Db, key: string, limit: number, windowMs: number, now: Date): void {
  const since = new Date(now.getTime() - windowMs).toISOString();
  db.prepare(`DELETE FROM rate_limits WHERE at < ?`).run(since);
  const row = db.prepare(`SELECT COUNT(*) AS c FROM rate_limits WHERE key = ? AND at >= ?`).get(key, since) as {
    c: number;
  };
  if (row.c >= limit) {
    throw new DomainError("Too many attempts. Wait a few minutes and try again.", "rate");
  }
  db.prepare(`INSERT INTO rate_limits (key, at) VALUES (?, ?)`).run(key, now.toISOString());
}
