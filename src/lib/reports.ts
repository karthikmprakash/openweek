import type { Db } from "./db";
import { enqueueNotification } from "./reminders";
import { addDays } from "./time";

export type MoneyRow = { id: string; name: string; amountCents: number };

export type RevenueReport = {
  byClass: MoneyRow[];
  byMembership: MoneyRow[];
  otherCents: number;
  groupedTotalCents: number;
  ledgerTotalCents: number;
};

type PaymentJoin = {
  id: string;
  amount_cents: number;
  product_id: string | null;
  product_name: string | null;
  product_kind: string | null;
  class_type_id: string | null;
  class_name: string | null;
};

/**
 * Each ledger row is counted once: membership product, otherwise the class on the booking, otherwise other.
 * groupedTotalCents is the sum of those buckets and must equal the ledger sum.
 */
export function revenueReport(db: Db, studioId: string, fromIso: string, toIso: string): RevenueReport {
  const rows = db
    .prepare(
      `SELECT p.id, p.amount_cents, p.product_id,
              pr.name AS product_name, pr.kind AS product_kind,
              ct.id AS class_type_id, ct.name AS class_name
       FROM payments p
       LEFT JOIN products pr ON pr.id = p.product_id
       LEFT JOIN bookings b ON b.id = p.booking_id
       LEFT JOIN class_sessions s ON s.id = b.session_id
       LEFT JOIN class_types ct ON ct.id = s.class_type_id
       WHERE p.studio_id = ?
         AND p.created_at >= ?
         AND p.created_at < ?
         AND p.status IN ('succeeded', 'refunded')`,
    )
    .all(studioId, fromIso, toIso) as PaymentJoin[];

  const ledger = db
    .prepare(
      `SELECT COALESCE(SUM(amount_cents), 0) AS total
       FROM payments
       WHERE studio_id = ? AND created_at >= ? AND created_at < ? AND status IN ('succeeded', 'refunded')`,
    )
    .get(studioId, fromIso, toIso) as { total: number };

  const classes = new Map<string, MoneyRow>();
  const memberships = new Map<string, MoneyRow>();
  let other = 0;
  for (const row of rows) {
    if (row.product_kind === "membership" && row.product_id) {
      const current = memberships.get(row.product_id) ?? { id: row.product_id, name: row.product_name ?? "Membership", amountCents: 0 };
      current.amountCents += row.amount_cents;
      memberships.set(row.product_id, current);
    } else if (row.class_type_id) {
      const current = classes.get(row.class_type_id) ?? { id: row.class_type_id, name: row.class_name ?? "Class", amountCents: 0 };
      current.amountCents += row.amount_cents;
      classes.set(row.class_type_id, current);
    } else {
      other += row.amount_cents;
    }
  }
  const byClass = [...classes.values()].sort((a, b) => a.name.localeCompare(b.name));
  const byMembership = [...memberships.values()].sort((a, b) => a.name.localeCompare(b.name));
  const grouped =
    byClass.reduce((sum, row) => sum + row.amountCents, 0) +
    byMembership.reduce((sum, row) => sum + row.amountCents, 0) +
    other;
  return {
    byClass,
    byMembership,
    otherCents: other,
    groupedTotalCents: grouped,
    ledgerTotalCents: ledger.total,
  };
}

export type ExpiringCredit = {
  entitlementId: string;
  memberId: string;
  memberName: string;
  email: string;
  productName: string;
  creditsRemaining: number | null;
  unlimited: number;
  expiresAt: string;
  emailOptOut: number;
};

export function expiringCredits(db: Db, studioId: string, now: Date, withinDays = 14): ExpiringCredit[] {
  const start = now.toISOString();
  const end = addDays(now, withinDays).toISOString();
  return db
    .prepare(
      `SELECT e.id AS entitlementId, m.id AS memberId, m.name AS memberName, m.email,
              p.name AS productName, e.credits_remaining AS creditsRemaining, e.unlimited,
              e.expires_at AS expiresAt, m.email_opt_out AS emailOptOut
       FROM entitlements e
       JOIN members m ON m.id = e.member_id
       JOIN products p ON p.id = e.product_id
       WHERE e.studio_id = ?
         AND e.expires_at > ?
         AND e.expires_at <= ?
         AND (e.unlimited = 1 OR e.credits_remaining > 0)
       ORDER BY e.expires_at ASC`,
    )
    .all(studioId, start, end) as ExpiringCredit[];
}

export function emailExpiring(db: Db, studioId: string, now: Date): { queued: number; skipped: number } {
  const rows = expiringCredits(db, studioId, now, 14);
  let queued = 0;
  let skipped = 0;
  for (const row of rows) {
    const note = enqueueNotification(
      db,
      {
        studioId,
        email: row.email,
        template: "credit_expiring",
        payload: { productName: row.productName, expiresAt: row.expiresAt, name: row.memberName },
        idempotencyKey: `expiring:${row.entitlementId}:${row.expiresAt}`,
      },
      now,
    );
    if (!note.created) continue;
    if (note.row.status === "sent") queued += 1;
    if (note.row.status === "skipped_opt_out") skipped += 1;
  }
  return { queued, skipped };
}
