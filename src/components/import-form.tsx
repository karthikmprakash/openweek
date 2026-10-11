"use client";

import { useActionState, useMemo, useState } from "react";
import { Download, FileUp } from "lucide-react";
import { SubmitButton } from "@/components/forms";
import { importAction, type ImportState } from "@/server/actions";

const FIELDS = [
  { key: "name", label: "Member name", required: true, aliases: ["name", "full name", "client name", "member", "member name"] },
  { key: "email", label: "Email", required: true, aliases: ["email", "e-mail", "email address", "client email"] },
  { key: "phone", label: "Phone", required: false, aliases: ["phone", "mobile", "phone number", "cell"] },
  { key: "product_kind", label: "Pass kind", required: true, aliases: ["product_kind", "kind", "type", "pass type", "product type"] },
  { key: "product_name", label: "Pass name", required: true, aliases: ["product_name", "pass", "pass name", "product", "membership", "plan"] },
  { key: "credits_remaining", label: "Visits left", required: false, aliases: ["credits_remaining", "credits", "classes remaining", "remaining", "visits left", "visits"] },
  { key: "expires_at", label: "Expires on", required: true, aliases: ["expires_at", "expiry", "expires", "expiration", "expiration date", "end date"] },
] as const;

const TEMPLATE = [
  "name,email,phone,product_kind,product_name,credits_remaining,expires_at",
  "Avery Lane,avery@example.com,,pack,10-class pack,6,2026-12-31",
  "Blair Chen,blair@example.com,555-0102,membership,Monthly unlimited,,2026-11-30",
].join("\n");

function headerCells(csv: string): string[] {
  const line = csv.replace(/^\uFEFF/, "").split(/\r?\n/).find((row) => row.trim() !== "") ?? "";
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      cells.push(cell.trim());
      cell = "";
    } else cell += char;
  }
  if (line) cells.push(cell.trim());
  return cells.filter(Boolean);
}

function guess(headers: string[]): Record<string, string> {
  const lower = headers.map((header) => header.toLowerCase());
  return Object.fromEntries(
    FIELDS.map((field) => {
      const at = lower.findIndex((header) => (field.aliases as readonly string[]).includes(header));
      return [field.key, at >= 0 ? headers[at] : ""];
    }),
  );
}

export function ImportForm() {
  const [state, formAction] = useActionState<ImportState, FormData>(importAction, null);
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const headers = useMemo(() => headerCells(csv), [csv]);
  const mapping = { ...guess(headers), ...overrides };
  const rows = Math.max(0, csv.split(/\r?\n/).filter((row) => row.trim() !== "").length - 1);
  const missing = FIELDS.filter((field) => field.required && !mapping[field.key]);
  const result = state?.result;

  return (
    <form action={formAction} className="stack">
      {state?.error ? (
        <p className="banner" role="alert">
          {state.error}
        </p>
      ) : null}

      <section className="card stack-sm" aria-labelledby="step-file">
        <h2 className="card-title" id="step-file">
          1. Add your file
        </h2>
        <p className="muted">
          Export members and their remaining passes from your current tool as CSV. One row per pass.{" "}
          <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`} download="openweek-import-template.csv">
            <Download size={14} aria-hidden /> Download a template
          </a>
        </p>
        <label className="file-drop">
          <FileUp size={22} aria-hidden />
          <span>
            <strong>{fileName || "Choose a CSV file"}</strong>
            <span className="muted">{fileName ? `${rows} row${rows === 1 ? "" : "s"} found` : "Up to 1 MB"}</span>
          </span>
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            className="visually-hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setFileName(file.name);
              setOverrides({});
              setCsv(await file.text());
            }}
          />
        </label>
        <details className="quiet-details">
          <summary>Or paste rows instead</summary>
          <label className="field">
            <span className="visually-hidden">CSV rows</span>
            <textarea
              name="csv"
              value={csv}
              onChange={(event) => {
                setCsv(event.target.value);
                setFileName("");
              }}
              rows={6}
              spellCheck={false}
              placeholder={TEMPLATE}
            />
          </label>
        </details>
      </section>

      {headers.length > 0 ? (
        <section className="card stack-sm" aria-labelledby="step-map">
          <h2 className="card-title" id="step-map">
            2. Match your columns
          </h2>
          <p className="muted">We matched what we could. Pass kind must be pack, membership, or drop_in. Dates like 2026-12-31 work best.</p>
          <div className="map-grid">
            {FIELDS.map((field) => (
              <label className="field" key={field.key}>
                <span>
                  {field.label}
                  {field.required ? "" : " (optional)"}
                </span>
                <select
                  name={`map_${field.key}`}
                  value={mapping[field.key]}
                  onChange={(event) => setOverrides((current) => ({ ...current, [field.key]: event.target.value }))}
                  aria-invalid={field.required && !mapping[field.key] ? true : undefined}
                >
                  <option value="">{field.required ? "Choose a column…" : "Not in my file"}</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </section>
      ) : null}

      {headers.length > 0 ? (
        <section className="card stack-sm" aria-labelledby="step-run">
          <h2 className="card-title" id="step-run">
            3. Preview, then import
          </h2>
          {missing.length > 0 ? (
            <p className="help">Match {missing.map((field) => field.label.toLowerCase()).join(", ")} to continue.</p>
          ) : (
            <p className="help">Preview checks every row and changes nothing. Import adds members and their passes. Rows with problems are skipped and listed.</p>
          )}
          <div className="row">
            <SubmitButton className="btn btn-secondary" name="intent" value="preview" disabled={missing.length > 0} pendingLabel="Checking…">
              Preview {rows} row{rows === 1 ? "" : "s"}
            </SubmitButton>
            <SubmitButton name="intent" value="import" disabled={missing.length > 0} pendingLabel="Importing…">
              Import
            </SubmitButton>
          </div>
        </section>
      ) : null}

      {state?.notice ? (
        <p className="ok" role="status">
          {state.notice}
        </p>
      ) : null}

      {result && result.badRows.length > 0 ? (
        <section className="card stack-sm" aria-labelledby="bad-rows">
          <h2 className="card-title" id="bad-rows">
            Rows that need a fix
          </h2>
          <ul className="plain-list">
            {result.badRows.map((row) => (
              <li key={`${row.line}-${row.reason}`}>
                <strong>Line {row.line}:</strong> {row.reason}
                {row.raw ? <code className="raw">{row.raw}</code> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {result && result.dryRun && result.preview.length > 0 ? (
        <section className="card stack-sm" aria-labelledby="ready-rows">
          <h2 className="card-title" id="ready-rows">
            Ready to import
          </h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Line</th>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Visits</th>
                  <th scope="col">Expires</th>
                </tr>
              </thead>
              <tbody>
                {result.preview.slice(0, 25).map((row) => (
                  <tr key={row.line}>
                    <td>{row.line}</td>
                    <td>{row.name}</td>
                    <td>{row.email}</td>
                    <td>{row.credits === null ? "Unlimited" : row.credits}</td>
                    <td>{row.expiresAt.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.preview.length > 25 ? <p className="help">And {result.preview.length - 25} more.</p> : null}
        </section>
      ) : null}
    </form>
  );
}
