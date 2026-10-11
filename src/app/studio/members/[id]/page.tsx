import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { EmptyState, Notice, PageHeader } from "@/components/ui";
import { listProducts } from "@/lib/credits";
import { getDb } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { memberDetail } from "@/lib/sessions";
import { formatInZone } from "@/lib/time";
import { grantPassAction } from "@/server/actions";
import { currentStaff } from "@/server/session";

export const metadata: Metadata = { title: "Member" };

const STATUS: Record<string, string> = {
  confirmed: "Booked",
  attended: "Attended",
  offer_pending: "Waitlist offer",
  cancelled: "Cancelled",
  late_cancelled: "Late cancel",
  no_show: "No-show",
};

export default async function MemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const staff = await currentStaff();
  if (!staff) return null;
  const db = getDb();
  const detail = memberDetail(db, staff.studioId, id, new Date());
  if (!detail) notFound();
  const { member } = detail;
  const products = listProducts(db, staff.studioId);
  const tz = staff.timezone;
  const balance = (pass: { unlimited: number; credits_remaining: number | null }) =>
    pass.unlimited === 1 ? "Unlimited" : `${pass.credits_remaining ?? 0} visit${pass.credits_remaining === 1 ? "" : "s"} left`;

  return (
    <div className="stack">
      <Link className="back-link" href="/studio/members">
        <ArrowLeft size={16} aria-hidden />
        All members
      </Link>
      <PageHeader
        title={member.name}
        description={
          <>
            <a href={`mailto:${member.email}`}>{member.email}</a>
            {member.phone ? ` · ${member.phone}` : ""} · {member.email_opt_out ? "Reminder emails off" : "Gets reminder emails"}
          </>
        }
      />
      <Notice message={notice} />

      <div className="split">
        <section className="card stack-sm" aria-labelledby="passes-title">
          <h2 className="card-title" id="passes-title">
            Passes
          </h2>
          {detail.activePasses.length === 0 ? (
            <p className="muted">No active pass. Bookings are drop-ins.</p>
          ) : (
            <ul className="plain-list">
              {detail.activePasses.map((pass) => (
                <li key={pass.id} className="row-between">
                  <span>
                    <strong>{pass.name}</strong>
                    <span className="muted"> · ends {formatInZone(pass.expires_at, tz)}</span>
                  </span>
                  <span className="pill pill-ok">{balance(pass)}</span>
                </li>
              ))}
            </ul>
          )}
          {detail.pastPasses.length > 0 ? (
            <details className="quiet-details">
              <summary>
                {detail.pastPasses.length} used or expired pass{detail.pastPasses.length === 1 ? "" : "es"}
              </summary>
              <ul className="plain-list">
                {detail.pastPasses.map((pass) => (
                  <li key={pass.id} className="muted">
                    {pass.name} · {balance(pass)} · ended {formatInZone(pass.expires_at, tz)}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>

        <section className="card stack-sm" aria-labelledby="give-title">
          <h2 className="card-title" id="give-title">
            Give a pass
          </h2>
          {products.length === 0 ? (
            <p className="muted">
              <Link href="/studio/offerings">Create a pass</Link> first, then give it here.
            </p>
          ) : (
            <ActionForm action={grantPassAction} className="grid-form">
              <input type="hidden" name="guestName" value={member.name} />
              <input type="hidden" name="email" value={member.email} />
              <label className="field">
                <span>Pass</span>
                <select name="productId" required>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} · {formatMoney(product.price_cents)}
                    </option>
                  ))}
                </select>
              </label>
              <p className="help">Record the payment however you took it. This adds the visits straight away.</p>
              <div>
                <SubmitButton pendingLabel="Adding…">Give pass</SubmitButton>
              </div>
            </ActionForm>
          )}
        </section>
      </div>

      <section className="stack-sm" aria-labelledby="upcoming-title">
        <h2 className="section-title" id="upcoming-title">
          Upcoming
        </h2>
        {detail.upcoming.length === 0 ? (
          <EmptyState
            title="Nothing booked"
            action={
              <Link className="btn btn-secondary btn-sm" href="/studio/schedule">
                Open the schedule
              </Link>
            }
          >
            Book them from a class roster, or share the member link.
          </EmptyState>
        ) : (
          <ul className="list-card">
            {detail.upcoming.map((row) => (
              <li key={row.id}>
                <Link className="list-row" href={`/studio/sessions/${row.session_id}`}>
                  <span className="list-main">
                    <strong>{row.class_name}</strong>
                    <span className="muted">{formatInZone(row.starts_at, tz)}</span>
                  </span>
                  <span className="pill">{STATUS[row.status] ?? row.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {detail.history.length > 0 ? (
        <section className="stack-sm" aria-labelledby="history-title">
          <h2 className="section-title" id="history-title">
            History
          </h2>
          <ul className="list-card">
            {detail.history.map((row) => (
              <li key={row.id}>
                <Link className="list-row" href={`/studio/sessions/${row.session_id}`}>
                  <span className="list-main">
                    <strong>{row.class_name}</strong>
                    <span className="muted">{formatInZone(row.starts_at, tz)}</span>
                  </span>
                  <span className={`pill${row.status === "no_show" || row.status === "late_cancelled" ? " pill-warn" : row.status === "attended" ? " pill-ok" : ""}`}>
                    {STATUS[row.status] ?? row.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
