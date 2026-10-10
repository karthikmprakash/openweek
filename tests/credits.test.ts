import { afterEach, describe, expect, it } from "vitest";
import { bookGuest } from "../src/lib/booking";
import { createProduct, creditsRemaining, grantEntitlement, spendCredit, upsertMember, usableEntitlements } from "../src/lib/credits";
import { DomainError } from "../src/lib/errors";
import { classOn, studioFixture, tempDb } from "./helpers";

const open: Array<{ close: () => void }> = [];
afterEach(() => open.pop()?.close());

const now = new Date("2026-06-01T15:00:00.000Z");

function setup() {
  const handle = tempDb();
  open.push(handle);
  const studio = studioFixture(handle.db, now);
  return { db: handle.db, studioId: studio.studioId };
}

describe("passes", () => {
  it("deducts a drop-in, a pack, and leaves a membership unlimited", () => {
    const { db, studioId } = setup();
    const memberId = upsertMember(db, studioId, "Avery Lane", "avery@example.test", now);
    const dropIn = createProduct(db, { studioId, kind: "drop_in", name: "Single visit", priceCents: 4000, creditCount: 1, validityDays: 30 }, now);
    const pack = createProduct(db, { studioId, kind: "pack", name: "Eight visit card", priceCents: 28000, creditCount: 8, validityDays: 120 }, now);
    const membership = createProduct(db, { studioId, kind: "membership", name: "Monthly mat", priceCents: 16000, creditCount: null, validityDays: 30 }, now);

    const dropEnt = grantEntitlement(db, { studioId, memberId, productId: dropIn }, now);
    const packEnt = grantEntitlement(db, { studioId, memberId, productId: pack }, now);
    const memberEnt = grantEntitlement(db, { studioId, memberId, productId: membership }, now);

    spendCredit(db, dropEnt, now);
    expect(creditsRemaining(db, dropEnt)).toBe(0);
    expect(() => spendCredit(db, dropEnt, now)).toThrow(/No visits left/);

    spendCredit(db, packEnt, now);
    expect(creditsRemaining(db, packEnt)).toBe(7);

    spendCredit(db, memberEnt, now);
    expect(creditsRemaining(db, memberEnt)).toBeNull();
    const still = usableEntitlements(db, memberId, now).map((row) => row.id);
    expect(still).toContain(memberEnt);
    expect(still).not.toContain(dropEnt);
  });

  it("rejects a credit at the exact expiry instant and accepts one millisecond before", () => {
    const { db, studioId } = setup();
    const memberId = upsertMember(db, studioId, "Avery Lane", "avery@example.test", now);
    const pack = createProduct(db, { studioId, kind: "pack", name: "Card", priceCents: 1000, creditCount: 2, validityDays: 10 }, now);
    const expires = new Date("2026-06-15T00:00:00.000Z");
    const entitlementId = grantEntitlement(db, { studioId, memberId, productId: pack, expiresAt: expires }, now);
    const justBefore = new Date(expires.getTime() - 1);
    expect(usableEntitlements(db, memberId, justBefore).map((row) => row.id)).toContain(entitlementId);
    spendCredit(db, entitlementId, justBefore);
    expect(creditsRemaining(db, entitlementId)).toBe(1);
    expect(usableEntitlements(db, memberId, expires)).toHaveLength(0);
    expect(() => spendCredit(db, entitlementId, expires)).toThrow(DomainError);
  });

  it("spends a pack credit when that email books", () => {
    const { db, studioId } = setup();
    const memberId = upsertMember(db, studioId, "Avery Lane", "avery@example.test", now);
    const pack = createProduct(db, { studioId, kind: "pack", name: "Card", priceCents: 1000, creditCount: 2, validityDays: 30 }, now);
    const entitlementId = grantEntitlement(db, { studioId, memberId, productId: pack }, now);
    const { sessionId } = classOn(db, studioId, new Date("2026-06-03T16:00:00.000Z"), { priceCents: 4000 }, now);
    const booked = bookGuest(db, { studioId, sessionId, guestName: "Avery Lane", guestEmail: "avery@example.test" }, now);
    expect(booked.usedEntitlementId).toBe(entitlementId);
    expect(creditsRemaining(db, entitlementId)).toBe(1);
  });
});
