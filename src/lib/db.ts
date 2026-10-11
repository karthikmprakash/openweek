import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { SCHEMA_SQL } from "./schema";

export type Db = Database.Database;

export function openDatabase(filename: string): Db {
  if (filename !== ":memory:") {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }
  const db = new Database(filename);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("temp_store = MEMORY");
  db.pragma("cache_size = -64000");
  db.pragma("mmap_size = 268435456");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  return db;
}

let singleton: Db | null = null;

export function getDb(): Db {
  if (singleton) return singleton;
  const fromEnv = process.env.OPENWEEK_DB ?? process.env.STUDIOFLAT_DB;
  const next = path.join(process.cwd(), "data", "openweek.db");
  const previous = path.join(process.cwd(), "data", "studioflat.db");
  const file = fromEnv ?? (!fs.existsSync(next) && fs.existsSync(previous) ? previous : next);
  singleton = openDatabase(file);
  return singleton;
}

export function resetDbForTests(): void {
  if (singleton) {
    singleton.close();
    singleton = null;
  }
}
