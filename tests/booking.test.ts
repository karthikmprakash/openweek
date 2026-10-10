import { afterEach, describe, expect, it } from "vitest";
import { bookGuest, spotsLeft } from "../src/lib/booking";
import { DomainError } from "../src/lib/errors";
import { zonedLocalToUtc } from "../src/lib/time";
import { classOn, studioFixture, tempDb } from "./helpers";

const open: Array<{ close: () => void }> = [];
afterEach(() => {
  while (open.length) open.pop()?.close();
});

describe("guest booking", () => {
  it("records a drop-in without an account and decrements capacity", () => {
    const handle = tempDb();
    open.push(handle);
    const now = new Date("2026-06-01T15:00:00.000Z");
    const studio = studioFixture(handle.db, now);
    const starts = new Date("2026-06-02T16:00:00.000Z");
    const { sessionId } = classOn(handle.db, studio.studioId, starts, { capacity: 3 }, now);
    expect(spotsLeft(handle.db, sessionId)).toBe(3);

    const booked = bookGuest(
      handle.db,
      { studioId: studio.studioId, sessionId, guestName: "Avery Lane", guestEmail: "avery@example.test" },
      now,
    );
    expect(booked.booking.status).toBe("confirmed");
    expect(booked.booking.guest_email).toBe("avery@example.test");
    expect(booked.spotsLeft).toBe(2);
    expect(spotsLeft(handle.db, sessionId)).toBe(2);

    const staff = handle.db.prepare(`SELECT COUNT(*) AS c FROM staff WHERE email = ?`).get("avery@example.test") as {
      c: number;
    };
    expect(staff.c).toBe(0);
  });

  it("refuses a second active spot for the same email", () => {
    const handle = tempDb();
    open.push(handle);
    const now = new Date("2026-06-01T15:00:00.000Z");
    const studio = studioFixture(handle.db, now);
    const { sessionId } = classOn(handle.db, studio.studioId, new Date("2026-06-02T16:00:00.000Z"), {}, now);
    bookGuest(handle.db, { studioId: studio.studioId, sessionId, guestName: "Avery Lane", guestEmail: "avery@example.test" }, now);
    expect(() =>
      bookGuest(handle.db, { studioId: studio.studioId, sessionId, guestName: "Avery Lane", guestEmail: "avery@example.test" }, now),
    ).toThrow(DomainError);
  });

  it("hides another studio's sessions", () => {
    const handle = tempDb();
    open.push(handle);
    const now = new Date("2026-06-01T15:00:00.000Z");
    const a = studioFixture(handle.db, now);
    const b = studioFixture(handle.db, now);
    const { sessionId } = classOn(handle.db, a.studioId, new Date("2026-06-02T16:00:00.000Z"), {}, now);
    const row = handle.db.prepare(`SELECT id FROM class_sessions WHERE id = ? AND studio_id = ?`).get(sessionId, b.studioId);
    expect(row).toBeUndefined();
  });
});

describe("studio timezone", () => {
  it("converts winter and summer wall times to UTC", () => {
    expect(zonedLocalToUtc("2026-01-15T09:00", "America/Los_Angeles").toISOString()).toBe("2026-01-15T17:00:00.000Z");
    expect(zonedLocalToUtc("2026-07-15T09:00", "America/Los_Angeles").toISOString()).toBe("2026-07-15T16:00:00.000Z");
  });
});
