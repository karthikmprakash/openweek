import { grantEntitlement, upsertMember } from "./credits";
import type { Db } from "./db";
import { createProduct, type ProductKind } from "./credits";

export const IMPORT_FIELDS = [
  "name",
  "email",
  "phone",
  "product_kind",
  "product_name",
  "credits_remaining",
  "expires_at",
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number];

export type BadRow = { line: number; reason: string; raw: string };

export type ImportResult = {
  dryRun: boolean;
  preview: Array<{ line: number; email: string; name: string; credits: number | null; expiresAt: string }>;
  badRows: BadRow[];
  imported: number;
};

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i += 1) {
    const char = src[i];
    if (inQuotes) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else inQuotes = false;
      } else cell += char;
    } else if (char === '"') inQuotes = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && src[i + 1] === "\n") i += 1;
      row.push(cell);
      cell = "";
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value.trim() !== "")) rows.push(row);
  }
  return rows;
}

function parseExpiry(value: string): string | null {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed}T23:59:59.999Z`;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function importMembers(
  db: Db,
  studioId: string,
  csvText: string,
  mapping: Partial<Record<ImportField, string>>,
  options: { dryRun: boolean },
  now: Date,
): ImportResult {
  const table = parseCsv(csvText);
  if (table.length === 0) {
    return { dryRun: options.dryRun, preview: [], badRows: [{ line: 1, reason: "The file is empty.", raw: "" }], imported: 0 };
  }
  const header = table[0].map((cell) => cell.trim());
  const index = new Map<ImportField, number>();
  for (const field of IMPORT_FIELDS) {
    const headerName = (mapping[field] ?? field).trim();
    const at = header.findIndex((cell) => cell.toLowerCase() === headerName.toLowerCase());
    if (at >= 0) index.set(field, at);
  }
  const missing = (["name", "email", "product_kind", "product_name", "expires_at"] as ImportField[]).filter(
    (field) => !index.has(field),
  );
  if (missing.length > 0) {
    return {
      dryRun: options.dryRun,
      preview: [],
      badRows: [{ line: 1, reason: `Map these columns: ${missing.join(", ")}.`, raw: header.join(",") }],
      imported: 0,
    };
  }

  const preview: ImportResult["preview"] = [];
  const badRows: BadRow[] = [];
  const pending: Array<{
    line: number;
    name: string;
    email: string;
    phone: string | null;
    kind: ProductKind;
    productName: string;
    credits: number | null;
    expiresAt: string;
  }> = [];

  for (let i = 1; i < table.length; i += 1) {
    const cells = table[i];
    const line = i + 1;
    const raw = cells.join(",");
    const read = (field: ImportField) => {
      const at = index.get(field);
      return at === undefined ? "" : (cells[at] ?? "").trim();
    };
    const name = read("name");
    const email = read("email").toLowerCase();
    const kindRaw = read("product_kind");
    const productName = read("product_name");
    const creditsRaw = read("credits_remaining");
    const expiresRaw = read("expires_at");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      badRows.push({ line, reason: "Email is missing or not usable.", raw });
      continue;
    }
    if (name.length < 1) {
      badRows.push({ line, reason: "Name is empty.", raw });
      continue;
    }
    if (kindRaw !== "drop_in" && kindRaw !== "pack" && kindRaw !== "membership") {
      badRows.push({ line, reason: "product_kind must be drop_in, pack, or membership.", raw });
      continue;
    }
    if (productName.length < 1) {
      badRows.push({ line, reason: "product_name is empty.", raw });
      continue;
    }
    const expiresAt = parseExpiry(expiresRaw);
    if (!expiresAt) {
      badRows.push({ line, reason: "expires_at is not a date.", raw });
      continue;
    }
    let credits: number | null = null;
    if (kindRaw === "membership") {
      credits = null;
    } else if (creditsRaw === "") {
      badRows.push({ line, reason: "credits_remaining is required for this pass.", raw });
      continue;
    } else if (!/^\d+$/.test(creditsRaw)) {
      badRows.push({ line, reason: "credits_remaining must be a whole number, zero or more.", raw });
      continue;
    } else {
      credits = Number(creditsRaw);
    }
    pending.push({
      line,
      name,
      email,
      phone: read("phone") || null,
      kind: kindRaw,
      productName,
      credits,
      expiresAt,
    });
    preview.push({ line, email, name, credits, expiresAt });
  }

  if (!options.dryRun) {
    db.transaction(() => {
      for (const row of pending) {
        const memberId = upsertMember(db, studioId, row.name, row.email, now, row.phone);
        const existing = db
          .prepare(`SELECT id FROM products WHERE studio_id = ? AND name = ? AND kind = ?`)
          .get(studioId, row.productName, row.kind) as { id: string } | undefined;
        const productId =
          existing?.id ??
          createProduct(
            db,
            {
              studioId,
              kind: row.kind,
              name: row.productName,
              priceCents: 0,
              creditCount: row.kind === "membership" ? null : row.kind === "drop_in" ? 1 : Math.max(row.credits ?? 1, 1),
              validityDays: 365,
            },
            now,
          );
        const entitlementId = grantEntitlement(
          db,
          { studioId, memberId, productId, expiresAt: new Date(row.expiresAt) },
          now,
        );
        if (row.kind !== "membership") {
          db.prepare(`UPDATE entitlements SET credits_remaining = ?, unlimited = 0 WHERE id = ?`).run(row.credits, entitlementId);
        }
      }
      db.prepare(
        `INSERT INTO import_runs (id, studio_id, dry_run, good_rows, bad_rows, created_at) VALUES (?, ?, 0, ?, ?, ?)`,
      ).run(crypto.randomUUID(), studioId, pending.length, badRows.length, now.toISOString());
    })();
  }

  return { dryRun: options.dryRun, preview, badRows, imported: options.dryRun ? 0 : pending.length };
}
