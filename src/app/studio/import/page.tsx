import { Field, Flash } from "@/components/ui";
import { importAction } from "@/server/actions";

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; bad?: string }>;
}) {
  const query = await searchParams;
  return (
    <div className="stack">
      <h1>Import</h1>
      <p className="muted">
        Paste a CSV or choose a file. Map each column. A dry run changes nothing. Rows that fail are listed with a line number.
      </p>
      <Flash message={query.error} />
      {query.notice ? <p className="ok">{query.notice}</p> : null}
      {query.bad ? (
        <pre className="card" style={{ whiteSpace: "pre-wrap" }}>
          {query.bad}
        </pre>
      ) : null}
      <form className="card grid-form" action={importAction}>
        <label className="field">
          <span>CSV file</span>
          <input name="file" type="file" accept=".csv,text/csv,text/plain" />
        </label>
        <label className="field">
          <span>Or paste rows</span>
          <textarea name="csv" placeholder={"name,email,product_kind,product_name,credits_remaining,expires_at"} />
        </label>
        {["name", "email", "phone", "product_kind", "product_name", "credits_remaining", "expires_at"].map((field) => (
          <Field key={field} label={`Column for ${field}`} name={`map_${field}`} defaultValue={field} />
        ))}
        <label className="row">
          <input type="checkbox" name="dryRun" value="1" defaultChecked style={{ width: "auto" }} />
          <span>Dry run</span>
        </label>
        <button className="btn btn-primary" type="submit">
          Run import
        </button>
      </form>
    </div>
  );
}
