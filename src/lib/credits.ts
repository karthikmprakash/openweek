import type { Db } from "./db";
import { DomainError } from "./errors";
import { addDays } from "./time";

export type ProductKind = "drop_in" | "pack" | "membership";

export type Entitlement = {
  id: string;
  studio_id: string;
  member_id: string;
  product_id: string;
  credits_remaining: number | null;
  unlimited: number;
  expires_at: string;
  product_name: string;
  kind: ProductKind;
};

export function createProduct(
  db: Db,
  input: {
    studioId: string;
    kind: ProductKind;
    name: string;
    priceCents: number;
    creditCount: number | null;
    validityDays: number;
  },
  now: Date,
): string {
  if (input.name.trim().length < 2) throw new DomainError("Name the pass.", "name");
  if (input.validityDays < 1) throw new DomainError("Set how many days the pass stays valid.", "validity");
  let creditCount = input.creditCount;
  if (input.kind === "membership") creditCount = null;
  if (input.kind === "drop_in") creditCount = 1;
  if (input.kind === "pack" && (!creditCount || creditCount < 1)) {
    throw new DomainError("A class pack needs at least one credit.", "credits");
  }
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO products (id, studio_id, kind, name, price_cents, currency, credit_count, validity_days, created_at)
     VALUES (?, ?, ?, ?, ?, 'usd', ?, ?, ?)`,
  ).run(id, input.studioId, input.kind, input.name.trim(), input.priceCents, creditCount, input.validityDays, now.toISOString());
  return id;
}

export function listProducts(db: Db, studioId: string) {
  return db
    .prepare(
      `SELECT id, kind, name, price_cents, credit_count, validity_days
       FROM products WHERE studio_id = ? ORDER BY name`,
    )
    .all(studioId) as Array<{
    id: string;
    kind: ProductKind;
    name: string;
    price_cents: number;
    credit_count: number | null;
    validity_days: number;
  }>;
}

export function upsertMember(
  db: Db,
  studioId: string,
  name: string,
  email: string,
  now: Date,
  phone?: string | null,
): string {
  const normalised = email.trim().toLowerCase();
  const existing = db
    .prepare(`SELECT id FROM members WHERE studio_id = ? AND email = ?`)
    .get(studioId, normalised) as { id: string } | undefined;
  if (existing) {
    db.prepare(`UPDATE members SET name = ? WHERE id = ?`).run(name.trim() || normalised, existing.id);
    return existing.id;
  }
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO members (id, studio_id, name, email, phone, email_opt_out, sms_opt_out, created_at)
     VALUES (?, ?, ?, ?, ?, 0, 0, ?)`,
  ).run(id, studioId, name.trim() || normalised, normalised, phone ?? null, now.toISOString());
  return id;
}

export function grantEntitlement(
  db: Db,
  input: {
    studioId: string;
    memberId: string;
    productId: string;
    expiresAt?: Date;
  },
  now: Date,
): string {
  const product = db
    .prepare(`SELECT * FROM products WHERE id = ? AND studio_id = ?`)
    .get(input.productId, input.studioId) as
    | { kind: ProductKind; credit_count: number | null; validity_days: number }
    | undefined;
  if (!product) throw new DomainError("That pass does not belong to this studio.", "not_found");
  const expires = input.expiresAt ?? addDays(now, product.validity_days);
  const unlimited = product.kind === "membership" ? 1 : 0;
  const credits = unlimited ? null : product.credit_count;
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO entitlements (
      id, studio_id, member_id, product_id, credits_remaining, unlimited, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, input.studioId, input.memberId, input.productId, credits, unlimited, expires.toISOString(), now.toISOString());
  return id;
}

export function usableEntitlements(db: Db, memberId: string, now: Date): Entitlement[] {
  return db
    .prepare(
      `SELECT e.id, e.studio_id, e.member_id, e.product_id, e.credits_remaining, e.unlimited, e.expires_at,
              p.name AS product_name, p.kind
       FROM entitlements e
       JOIN products p ON p.id = e.product_id
       WHERE e.member_id = ?
         AND e.expires_at > ?
         AND (e.unlimited = 1 OR e.credits_remaining > 0)
       ORDER BY e.expires_at ASC`,
    )
    .all(memberId, now.toISOString()) as Entitlement[];
}

/** Spend one visit. Expired and empty balances are rejected, including the exact expiry instant. */
export function spendCredit(db: Db, entitlementId: string, now: Date): void {
  const row = db.prepare(`SELECT * FROM entitlements WHERE id = ?`).get(entitlementId) as
    | { unlimited: number; credits_remaining: number | null; expires_at: string }
    | undefined;
  if (!row) throw new DomainError("That credit no longer exists.", "credit");
  if (row.expires_at <= now.toISOString()) {
    throw new DomainError("This credit expired and cannot be used.", "expired");
  }
  if (row.unlimited === 1) return;
  const result = db
    .prepare(
      `UPDATE entitlements
       SET credits_remaining = credits_remaining - 1
       WHERE id = ? AND unlimited = 0 AND credits_remaining > 0 AND expires_at > ?`,
    )
    .run(entitlementId, now.toISOString());
  if (result.changes !== 1) {
    throw new DomainError("No visits left on this pass.", "exhausted");
  }
}

export function restoreCredit(db: Db, entitlementId: string): number {
  const row = db.prepare(`SELECT unlimited FROM entitlements WHERE id = ?`).get(entitlementId) as
    | { unlimited: number }
    | undefined;
  if (!row || row.unlimited === 1) return 0;
  db.prepare(`UPDATE entitlements SET credits_remaining = credits_remaining + 1 WHERE id = ?`).run(entitlementId);
  return 1;
}

export function memberByEmail(db: Db, studioId: string, email: string) {
  return (
    (db.prepare(`SELECT * FROM members WHERE studio_id = ? AND email = ?`).get(studioId, email.trim().toLowerCase()) as
      | {
          id: string;
          name: string;
          email: string;
          email_opt_out: number;
          sms_opt_out: number;
          phone: string | null;
        }
      | undefined) ?? null
  );
}

export function setEmailOptOut(db: Db, studioId: string, email: string, optOut: boolean): void {
  db.prepare(`UPDATE members SET email_opt_out = ? WHERE studio_id = ? AND email = ?`).run(
    optOut ? 1 : 0,
    studioId,
    email.trim().toLowerCase(),
  );
}

export function listMembers(db: Db, studioId: string, now: Date) {
  return db
    .prepare(
      `SELECT m.id, m.name, m.email, m.email_opt_out, m.phone,
              COUNT(e.id) AS active_passes
       FROM members m
       LEFT JOIN entitlements e
         ON e.member_id = m.id AND e.expires_at > ?
         AND (e.unlimited = 1 OR e.credits_remaining > 0)
       WHERE m.studio_id = ?
       GROUP BY m.id
       ORDER BY m.name`,
    )
    .all(now.toISOString(), studioId) as Array<{
    id: string;
    name: string;
    email: string;
    email_opt_out: number;
    phone: string | null;
    active_passes: number;
  }>;
}

export function creditsRemaining(db: Db, entitlementId: string): number | null {
  const row = db.prepare(`SELECT credits_remaining, unlimited FROM entitlements WHERE id = ?`).get(entitlementId) as
    | { credits_remaining: number | null; unlimited: number }
    | undefined;
  if (!row) return null;
  if (row.unlimited === 1) return null;
  return row.credits_remaining;
}
