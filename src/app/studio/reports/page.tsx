import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { EmptyState, PageHeader } from "@/components/ui";
import { getDb } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { expiringCredits, revenueReport } from "@/lib/reports";
import { formatInZone, localDaysToUtcRange, monthYmds, shiftYmd, ymdInZone } from "@/lib/time";
import { emailExpiringAction } from "@/server/actions";
import { currentStaff } from "@/server/session";

export const metadata: Metadata = { title: "Reports" };

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function readable(ymd: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }).format(new Date(`${ymd}T00:00:00Z`));
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const staff = await currentStaff();
  if (!staff) return null;
  const query = await searchParams;
  const tz = staff.timezone;
  const now = new Date();
  const today = ymdInZone(now, tz);
  const thisMonth = monthYmds(now, tz);
  const lastMonth = monthYmds(now, tz, -1);
  const valid = (value?: string) => (value && YMD.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ? value : undefined);
  let from = valid(query.from) ?? thisMonth.first;
  let to = valid(query.to) ?? thisMonth.last;
  if (from > to) [from, to] = [to, from];
  const range = localDaysToUtcRange(from, to, tz);
  const db = getDb();
  const report = revenueReport(db, staff.studioId, range.from.toISOString(), range.to.toISOString());
  const expiring = expiringCredits(db, staff.studioId, now, 14);
  const classTotal = report.byClass.reduce((sum, row) => sum + row.amountCents, 0);
  const membershipTotal = report.byMembership.reduce((sum, row) => sum + row.amountCents, 0);
  const presets = [
    { label: "This month", from: thisMonth.first, to: thisMonth.last },
    { label: "Last month", from: lastMonth.first, to: lastMonth.last },
    { label: "Last 30 days", from: shiftYmd(today, -29), to: today },
  ];
  const share = (cents: number) => (report.ledgerTotalCents > 0 ? `${Math.round((cents / report.ledgerTotalCents) * 100)}%` : "–");

  return (
    <div className="stack">
      <PageHeader title="Reports" description={`Money collected from ${readable(from)} to ${readable(to)}, in ${tz.replaceAll("_", " ")} time.`} />

      <div className="range-bar">
        <nav className="segmented" aria-label="Date range">
          {presets.map((preset) => (
            <Link
              key={preset.label}
              href={`/studio/reports?from=${preset.from}&to=${preset.to}`}
              aria-current={preset.from === from && preset.to === to ? "page" : undefined}
            >
              {preset.label}
            </Link>
          ))}
        </nav>
        <form className="range-form" method="get">
          <label className="field field-inline">
            <span>From</span>
            <input type="date" name="from" defaultValue={from} max={today} />
          </label>
          <label className="field field-inline">
            <span>To</span>
            <input type="date" name="to" defaultValue={to} />
          </label>
          <button className="btn btn-secondary btn-sm" type="submit">
            Apply
          </button>
        </form>
      </div>

      <div className="stat-row stat-row-4">
        <div className="stat stat-strong">
          <p className="stat-label">Total collected</p>
          <p className="stat-value">{formatMoney(report.ledgerTotalCents)}</p>
        </div>
        <div className="stat">
          <p className="stat-label">Class drop-ins</p>
          <p className="stat-value">{formatMoney(classTotal)}</p>
          <p className="stat-foot">{share(classTotal)} of total</p>
        </div>
        <div className="stat">
          <p className="stat-label">Memberships</p>
          <p className="stat-value">{formatMoney(membershipTotal)}</p>
          <p className="stat-foot">{share(membershipTotal)} of total</p>
        </div>
        <div className="stat">
          <p className="stat-label">Packs, fees, other</p>
          <p className="stat-value">{formatMoney(report.otherCents)}</p>
          <p className="stat-foot">{share(report.otherCents)} of total</p>
        </div>
      </div>
      {report.groupedTotalCents !== report.ledgerTotalCents ? (
        <p className="banner">Some payments in this range couldn’t be grouped. The total above is still exact.</p>
      ) : null}

      <div className="split">
        <section className="card stack-sm" aria-labelledby="by-class">
          <h2 className="card-title" id="by-class">
            By class
          </h2>
          {report.byClass.length === 0 ? (
            <p className="muted">No drop-in payments in this range.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th scope="col">Class</th>
                  <th scope="col" className="num">
                    Collected
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.byClass.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td className="num">{formatMoney(row.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="card stack-sm" aria-labelledby="by-membership">
          <h2 className="card-title" id="by-membership">
            By membership
          </h2>
          {report.byMembership.length === 0 ? (
            <p className="muted">No membership payments in this range.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th scope="col">Membership</th>
                  <th scope="col" className="num">
                    Collected
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.byMembership.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td className="num">{formatMoney(row.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section className="card stack-sm" id="expiring" aria-labelledby="expiring-title">
        <div className="row-between">
          <h2 className="card-title" id="expiring-title">
            Passes ending in the next 14 days
          </h2>
          {expiring.length > 0 ? <span className="pill pill-warn">{expiring.length} to renew</span> : null}
        </div>
        {expiring.length === 0 ? (
          <EmptyState title="Nothing is about to expire">Members with a pass ending soon show up here so you can nudge them to renew.</EmptyState>
        ) : (
          <>
            <ul className="list-card">
              {expiring.map((row) => (
                <li key={row.entitlementId}>
                  <Link className="list-row" href={`/studio/members/${row.memberId}`}>
                    <span className="list-main">
                      <strong>{row.memberName}</strong>
                      <span className="muted">
                        {row.productName} · {row.unlimited ? "unlimited" : `${row.creditsRemaining} left`}
                      </span>
                    </span>
                    <span className="list-end">
                      <span className="muted">ends {formatInZone(row.expiresAt, tz)}</span>
                      {row.emailOptOut ? <span className="pill">Emails off</span> : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <ActionForm action={emailExpiringAction}>
              <SubmitButton pendingLabel="Sending…">Email them a renewal reminder</SubmitButton>
            </ActionForm>
            <p className="help">Each pass is only emailed once. Members who turned reminders off are skipped.</p>
          </>
        )}
      </section>
    </div>
  );
}
