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
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  return db;
}

let singleton: Db | null = null;

export function getDb(): Db {
  if (singleton) return singleton;
  const file = process.env.STUDIOFLAT_DB ?? path.join(process.cwd(), "data", "studioflat.db");
  singleton = openDatabase(file);
  return singleton;
}

export function resetDbForTests(): void {
  if (singleton) {
    singleton.close();
    singleton = null;
  }
}
