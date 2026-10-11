import crypto from "crypto";
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const root = path.resolve(import.meta.dirname, "..");
const file = process.env.STUDIOFLAT_DB || path.join(root, "data", "studioflat.db");
const schemaFile = path.join(root, "src", "lib", "schema.ts");
const schema = fs.readFileSync(schemaFile, "utf8").match(/`([\s\S]*)`/)[1];

fs.mkdirSync(path.dirname(file), { recursive: true });
const db = new Database(file);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(schema);

const existing = db.prepare("SELECT id FROM studios WHERE slug = ?").get("northline");
const reset = process.argv.includes("--reset");
const password = reset || !existing ? "local-demo-northline" : null;
if (existing && !reset) {
  console.log("Demo studio already exists at /s/northline");
  console.log("Owner login: owner@northline.test");
  console.log("Password: local-demo-northline (use --reset if login fails)");
  process.exit(0);
}

if (existing && reset) {
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = `scrypt$${salt}$${crypto.scryptSync(password, salt, 32).toString("hex")}`;
  db.prepare("UPDATE staff SET password_hash = ? WHERE email = ?").run(passwordHash, "owner@northline.test");
  console.log("Demo password reset.");
  console.log("Demo schedule: http://localhost:3000/s/northline");
  console.log("Owner login: owner@northline.test");
  console.log(`Password: ${password}`);
  db.close();
  process.exit(0);
}
const salt = crypto.randomBytes(16).toString("hex");
const passwordHash = `scrypt$${salt}$${crypto.scryptSync(password, salt, 32).toString("hex")}`;
const now = new Date().toISOString();
const studioId = crypto.randomUUID();
const staffId = crypto.randomUUID();

function ist(dayOffset, hour, minute) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month, day] = today.split("-").map(Number);
  const stamp = new Date(Date.UTC(year, month - 1, day + dayOffset));
  const ymd = stamp.toISOString().slice(0, 10);
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return new Date(`${ymd}T${hh}:${mm}:00+05:30`);
}

db.transaction(() => {
  db.prepare(
    `INSERT INTO studios (id, name, slug, timezone, created_at, updated_at)
     VALUES (?, 'Northline Room', 'northline', 'Asia/Kolkata', ?, ?)`,
  ).run(studioId, now, now);
  db.prepare(
    `INSERT INTO staff (id, studio_id, email, name, password_hash, role, created_at)
     VALUES (?, ?, 'owner@northline.test', 'Casey Owner', ?, 'owner', ?)`,
  ).run(staffId, studioId, passwordHash, now);

  const classes = [
    ["Reformer foundations", 50, 8, 0, "Slow work on the carriage. Mats stay in the cupboard."],
    ["Mat flow", 60, 12, 0, "A full-body hour on the mat. Bring your own if you have one."],
    ["Barre strength", 45, 10, 0, "Small pulses, a barre, and a playlist that stays in the room."],
  ].map(([name, duration, capacity, price, description]) => {
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO class_types (
        id, studio_id, name, duration_min, default_capacity, drop_in_price_cents, description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, studioId, name, duration, capacity, price, description, now, now);
    return { id, name, duration, capacity, price };
  });

  const plan = [
    [0, 7, 0, 0, "Jules Park"],
    [0, 18, 0, 1, "Noor Shah"],
    [1, 9, 0, 0, "Jules Park"],
    [1, 17, 30, 2, "Casey Owner"],
    [2, 6, 30, 1, "Noor Shah"],
    [2, 12, 0, 0, "Jules Park"],
    [3, 9, 0, 2, "Casey Owner"],
    [3, 18, 30, 1, "Noor Shah"],
    [4, 7, 30, 0, "Jules Park"],
    [5, 10, 0, 2, "Casey Owner"],
    [6, 9, 0, 1, "Noor Shah"],
  ];
  const sessionIds = [];
  for (const [offset, hour, minute, classIndex, instructor] of plan) {
    const type = classes[classIndex];
    const start = ist(offset, hour, minute);
    const end = new Date(start.getTime() + type.duration * 60 * 1000);
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO class_sessions (
        id, studio_id, class_type_id, starts_at, ends_at, capacity, instructor_name, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)`,
    ).run(id, studioId, type.id, start.toISOString(), end.toISOString(), type.capacity, instructor, now);
    sessionIds.push(id);
  }

  const guests = [
    ["Avery Lane", "avery@example.test"],
    ["Blair Chen", "blair@example.test"],
  ];
  for (const [name, email] of guests) {
    const memberId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO members (id, studio_id, name, email, phone, email_opt_out, sms_opt_out, created_at)
       VALUES (?, ?, ?, ?, NULL, 0, 0, ?)`,
    ).run(memberId, studioId, name, email, now);
    db.prepare(
      `INSERT INTO bookings (
        id, studio_id, session_id, member_id, guest_name, guest_email, status, entitlement_id, manage_token, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'confirmed', NULL, ?, ?)`,
    ).run(crypto.randomUUID(), studioId, sessionIds[2], memberId, name, email, crypto.randomUUID().replaceAll("-", ""), now);
  }
})();

console.log("Demo schedule: http://localhost:3000/s/northline");
console.log("Owner login: owner@northline.test");
console.log(`Password: ${password}`);
db.close();
