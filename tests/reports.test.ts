import { afterEach, describe, expect, it } from "vitest";
import { createProduct, grantEntitlement, upsertMember } from "../src/lib/credits";
import { insertPayment } from "../src/lib/payments";
import { emailExpiring, expiringCredits, revenueReport } from "../src/lib/reports";
import { classOn, studioFixture, tempDb } from "./helpers";
import { bookGuest } from "../src/lib/booking";

const open: Array<{ close: () => void }> = [];
afterEach(() => open.pop()?.close());

describe("revenue", () => {
  it("matches the ledger exactly and lists credits expiring within 14 days", () => {
    const handle = tempDb();
    open.push(handle);
    const now = new Date("2026-06-01T12:00:00.000Z");
    const studio = studioFixture(handle.db, now);
    const reformer = classOn(handle.db, studio.studioId, new Date("2026-06-10T16:00:00.000Z"), { name: "Reformer", priceCents: 0 }, now);
    const mat = classOn(handle.db, studio.studioId, new Date("2026-06-11T16:00:00.000Z"), { name: "Mat", priceCents: 0 }, now);
    const a = bookGuest(handle.db, { studioId: studio.studioId, sessionId: reformer.sessionId, guestName: "Avery Lane", guestEmail: "avery@example.test" }, now);
    const b = bookGuest(handle.db, { studioId: studio.studioId, sessionId: mat.sessionId, guestName: "Blair Chen", guestEmail: "blair@example.test" }, now);
    insertPayment(handle.db, { studioId: studio.studioId, bookingId: a.booking.id, amountCents: 4000, applicationFeeCents: null, status: "succeeded", kind: "drop_in" }, now);
    insertPayment(handle.db, { studioId: studio.studioId, bookingId: b.booking.id, amountCents: 2500, applicationFeeCents: null, status: "succeeded", kind: "drop_in" }, now);

    const memberId = upsertMember(handle.db, studio.studioId, "Casey Diaz", "casey@example.test", now);
    const productId = createProduct(handle.db, { studioId: studio.studioId, kind: "membership", name: "Monthly mat", priceCents: 12000, creditCount: null, validityDays: 30 }, now);
    insertPayment(handle.db, { studioId: studio.studioId, memberId, productId, amountCents: 12000, applicationFeeCents: null, status: "succeeded", kind: "membership" }, now);
    grantEntitlement(handle.db, { studioId: studio.studioId, memberId, productId, expiresAt: new Date("2026-06-10T12:00:00.000Z") }, now);

    const laterMember = upsertMember(handle.db, studio.studioId, "Drew Ellis", "drew@example.test", now);
    grantEntitlement(handle.db, { studioId: studio.studioId, memberId: laterMember, productId, expiresAt: new Date("2026-07-01T12:00:00.000Z") }, now);
    const edgeMember = upsertMember(handle.db, studio.studioId, "Eden Fox", "eden@example.test", now);
    grantEntitlement(handle.db, { studioId: studio.studioId, memberId: edgeMember, productId, expiresAt: new Date("2026-06-15T12:00:00.000Z") }, now);

    const from = "2026-06-01T00:00:00.000Z";
    const to = "2026-07-01T00:00:00.000Z";
    const report = revenueReport(handle.db, studio.studioId, from, to);
    const ledger = handle.db.prepare(`SELECT COALESCE(SUM(amount_cents), 0) AS total FROM payments WHERE studio_id = ? AND status = 'succeeded'`).get(studio.studioId) as { total: number };

    expect(report.ledgerTotalCents).toBe(ledger.total);
    expect(report.groupedTotalCents).toBe(report.ledgerTotalCents);
    expect(report.ledgerTotalCents).toBe(18500);
    expect(report.byClass.find((row) => row.name === "Reformer")?.amountCents).toBe(4000);
    expect(report.byClass.find((row) => row.name === "Mat")?.amountCents).toBe(2500);
    expect(report.byMembership).toEqual([{ id: productId, name: "Monthly mat", amountCents: 12000 }]);

    const expiring = expiringCredits(handle.db, studio.studioId, now, 14).map((row) => row.email);
    expect(expiring).toEqual(["casey@example.test", "eden@example.test"]);
    const mailed = emailExpiring(handle.db, studio.studioId, now);
    expect(mailed.queued).toBe(2);
    const again = emailExpiring(handle.db, studio.studioId, now);
    expect(again.queued).toBe(0);
  });
});
