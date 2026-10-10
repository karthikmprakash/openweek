import { afterEach, describe, expect, it } from "vitest";
import { creditsRemaining } from "../src/lib/credits";
import { importMembers } from "../src/lib/importer";
import { studioFixture, tempDb } from "./helpers";

const open: Array<{ close: () => void }> = [];
afterEach(() => open.pop()?.close());

const csv = `name,email,phone,product_kind,product_name,credits_remaining,expires_at
Avery Lane,avery@example.test,5550100,pack,Eight visit card,5,2026-12-01T00:00:00.000Z
Blair Chen,not-an-email,,drop_in,Single visit,1,2026-12-01
Casey Diaz,casey@example.test,,membership,Monthly mat,,2026-08-01
"Drew Ellis",drew@example.test,,pack,Eight visit card,-2,2026-12-01
Eden Fox,eden@example.test,,subscription,Mystery,,sometime
`;

describe("csv import", () => {
  it("previews, imports balances, and reports every bad row", () => {
    const handle = tempDb();
    open.push(handle);
    const now = new Date("2026-06-01T12:00:00.000Z");
    const studio = studioFixture(handle.db, now);
    const mapping = {
      name: "name",
      email: "email",
      phone: "phone",
      product_kind: "product_kind",
      product_name: "product_name",
      credits_remaining: "credits_remaining",
      expires_at: "expires_at",
    };
    const preview = importMembers(handle.db, studio.studioId, csv, mapping, { dryRun: true }, now);
    expect(preview.imported).toBe(0);
    expect(preview.preview.map((row) => row.email)).toEqual(["avery@example.test", "casey@example.test"]);
    expect(preview.badRows.map((row) => row.line).sort()).toEqual([3, 5, 6]);
    const membersBefore = handle.db.prepare(`SELECT COUNT(*) AS c FROM members`).get() as { c: number };
    expect(membersBefore.c).toBe(0);

    const result = importMembers(handle.db, studio.studioId, csv, mapping, { dryRun: false }, now);
    expect(result.imported).toBe(2);
    expect(result.badRows).toHaveLength(3);
    expect(result.badRows.map((row) => row.reason).join(" ")).toMatch(/Email/);
    const dataLines = csv.trim().split("\n").length - 1;
    expect(result.imported + result.badRows.length).toBe(dataLines);

    const avery = handle.db.prepare(`SELECT id FROM members WHERE email = ?`).get("avery@example.test") as { id: string };
    const ent = handle.db.prepare(`SELECT id, credits_remaining FROM entitlements WHERE member_id = ?`).get(avery.id) as {
      id: string;
      credits_remaining: number;
    };
    expect(ent.credits_remaining).toBe(5);
    expect(creditsRemaining(handle.db, ent.id)).toBe(5);
    const casey = handle.db.prepare(
      `SELECT e.unlimited FROM entitlements e JOIN members m ON m.id = e.member_id WHERE m.email = ?`,
    ).get("casey@example.test") as { unlimited: number };
    expect(casey.unlimited).toBe(1);
    expect(handle.db.prepare(`SELECT id FROM members WHERE email = ?`).get("drew@example.test")).toBeUndefined();
    expect(handle.db.prepare(`SELECT id FROM members WHERE email = ?`).get("eden@example.test")).toBeUndefined();
  });
});
