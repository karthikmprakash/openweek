import fs from "fs";
import os from "os";
import path from "path";
import { createStudioAccount } from "../src/lib/auth";
import { openDatabase, type Db } from "../src/lib/db";
import { addSession, createClassType, updatePolicies } from "../src/lib/schedule";

export function tempDb(): { db: Db; file: string; close: () => void } {
  const file = path.join(os.tmpdir(), `openweek-${crypto.randomUUID()}.db`);
  const db = openDatabase(file);
  return {
    db,
    file,
    close() {
      db.close();
      for (const suffix of ["", "-wal", "-shm"]) {
        fs.rmSync(file + suffix, { force: true });
      }
    },
  };
}

export function studioFixture(db: Db, now = new Date("2026-06-01T15:00:00.000Z")) {
  const password = `local-${crypto.randomUUID()}`;
  const slug = `studio-${crypto.randomUUID().slice(0, 8)}`;
  const created = createStudioAccount(
    db,
    {
      studioName: "Northline Room",
      slug,
      ownerName: "Casey Owner",
      email: `${slug}@example.test`,
      password,
      timezone: "America/Los_Angeles",
    },
    now,
  );
  return { ...created, password, slug, now };
}

export function classOn(
  db: Db,
  studioId: string,
  startsAt: Date,
  options: { capacity?: number; priceCents?: number; name?: string } = {},
  now = new Date("2026-06-01T15:00:00.000Z"),
) {
  const classTypeId = createClassType(
    db,
    {
      studioId,
      name: options.name ?? "Reformer foundations",
      durationMin: 50,
      capacity: options.capacity ?? 4,
      dropInPriceCents: options.priceCents ?? 0,
    },
    now,
  );
  const sessionId = addSession(db, { studioId, classTypeId, startsAt }, now);
  return { classTypeId, sessionId };
}

export function setWindow(db: Db, studioId: string, hours: number, now: Date) {
  updatePolicies(
    db,
    studioId,
    {
      cancellationWindowHours: hours,
      lateCancelMode: "forfeit",
      lateCancelFeeCents: 0,
      noShowMode: "forfeit",
      noShowFeeCents: 0,
      waitlistClaimMinutes: 30,
      reminderLeadHours: 24,
      timezone: "America/Los_Angeles",
    },
    now,
  );
}
