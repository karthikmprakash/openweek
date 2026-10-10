import { afterEach, describe, expect, it } from "vitest";
import { consumeRateLimit, deleteStudio, login, staffFromToken } from "../src/lib/auth";
import { DomainError } from "../src/lib/errors";
import { studioFixture, tempDb } from "./helpers";

const open: Array<{ close: () => void }> = [];
afterEach(() => open.pop()?.close());

describe("auth", () => {
  it("opens a session and locks a studio after repeated failures", () => {
    const handle = tempDb();
    open.push(handle);
    const now = new Date("2026-06-01T12:00:00.000Z");
    const studio = studioFixture(handle.db, now);
    const session = login(handle.db, `${studio.slug}@example.test`, studio.password, now);
    const staff = staffFromToken(handle.db, session.token, now);
    expect(staff?.studioId).toBe(studio.studioId);
    expect(() => login(handle.db, `${studio.slug}@example.test`, "wrong-password", now)).toThrow(/does not match/);
    for (let i = 0; i < 8; i += 1) consumeRateLimit(handle.db, "login:test", 8, 60_000, now);
    expect(() => consumeRateLimit(handle.db, "login:test", 8, 60_000, now)).toThrow(DomainError);
    deleteStudio(handle.db, studio.studioId);
    expect(handle.db.prepare(`SELECT id FROM studios WHERE id = ?`).get(studio.studioId)).toBeUndefined();
    expect(staffFromToken(handle.db, session.token, now)).toBeNull();
  });
});
