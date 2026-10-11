import { afterEach, describe, expect, it } from "vitest";
import { checkIn } from "../src/lib/attendance";
import { bookGuest } from "../src/lib/booking";
import { classOn, studioFixture, tempDb } from "./helpers";

const open: Array<{ close: () => void }> = [];
afterEach(() => open.pop()?.close());

describe("check-in", () => {
  it("records self and staff check-in once each", () => {
    const handle = tempDb();
    open.push(handle);
    const now = new Date("2026-06-01T15:00:00.000Z");
    const studio = studioFixture(handle.db, now);
    const { sessionId } = classOn(handle.db, studio.studioId, new Date("2026-06-01T15:30:00.000Z"), { capacity: 4 }, now);
    const self = bookGuest(handle.db, { studioId: studio.studioId, sessionId, guestName: "Avery Lane", guestEmail: "avery@example.test" }, now);
    const staff = bookGuest(handle.db, { studioId: studio.studioId, sessionId, guestName: "Blair Chen", guestEmail: "blair@example.test" }, now);

    const selfRow = checkIn(handle.db, { bookingId: self.booking.id, studioId: studio.studioId, method: "self", token: self.booking.manage_token }, now);
    const selfAgain = checkIn(handle.db, { bookingId: self.booking.id, studioId: studio.studioId, method: "self", token: self.booking.manage_token }, now);
    const staffRow = checkIn(handle.db, { bookingId: staff.booking.id, studioId: studio.studioId, method: "staff" }, now);
    const staffAgain = checkIn(handle.db, { bookingId: staff.booking.id, studioId: studio.studioId, method: "staff" }, now);

    expect(selfAgain.id).toBe(selfRow.id);
    expect(staffAgain.id).toBe(staffRow.id);
    expect(selfRow.method).toBe("self");
    expect(staffRow.method).toBe("staff");
    const count = handle.db.prepare(`SELECT COUNT(*) AS c FROM attendance WHERE session_id = ?`).get(sessionId) as { c: number };
    expect(count.c).toBe(2);
  });
});
