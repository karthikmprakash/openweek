import { Flash } from "@/components/ui";
import { getDb } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { expiringCredits, revenueReport } from "@/lib/reports";
import { emailExpiringAction } from "@/server/actions";
import { formatInZone } from "@/lib/time";
import { currentStaff } from "@/server/session";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; notice?: string; error?: string }>;
}) {
  const staff = await currentStaff();
  if (!staff) return null;
  const query = await searchParams;
  const now = new Date();
  const from = query.from ? new Date(query.from).toISOString() : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const to = query.to ? new Date(query.to).toISOString() : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
  const db = getDb();
  const report = revenueReport(db, staff.studioId, from, to);
  const expiring = expiringCredits(db, staff.studioId, now, 14);
  const balanced = report.groupedTotalCents === report.ledgerTotalCents;
  return (
    <div className="stack">
      <h1>Reports</h1>
      <Flash message={query.error} />
      {query.notice ? <p className="ok">{query.notice}</p> : null}
      <form className="row" method="get">
        <label className="field">
          <span>From</span>
          <input type="date" name="from" defaultValue={from.slice(0, 10)} />
        </label>
        <label className="field">
          <span>To</span>
          <input type="date" name="to" defaultValue={to.slice(0, 10)} />
        </label>
        <button className="btn btn-secondary" type="submit">
          Update range
        </button>
      </form>
      <p className={balanced ? "ok" : "banner"}>
        Ledger {formatMoney(report.ledgerTotalCents)} · grouped {formatMoney(report.groupedTotalCents)}
      </p>
      <section className="card">
        <h2>By class</h2>
        {report.byClass.length === 0 ? <p className="muted">No class payments in this range.</p> : null}
        <table>
          <thead>
            <tr>
              <th>Class</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {report.byClass.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{formatMoney(row.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="card">
        <h2>By membership</h2>
        {report.byMembership.length === 0 ? <p className="muted">No membership payments in this range.</p> : null}
        <table>
          <tbody>
            {report.byMembership.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{formatMoney(row.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="card stack">
        <h2>Ending within 14 days</h2>
        {expiring.length === 0 ? <p className="muted">Nothing is about to expire.</p> : null}
        <ul>
          {expiring.map((row) => (
            <li key={row.entitlementId}>
              {row.memberName} · {row.productName} · {formatInZone(row.expiresAt, staff.timezone)}
              {row.emailOptOut ? " · opted out" : ""}
            </li>
          ))}
        </ul>
        <form action={emailExpiringAction}>
          <button className="btn btn-primary" type="submit">
            Email them
          </button>
        </form>
      </section>
    </div>
  );
}
