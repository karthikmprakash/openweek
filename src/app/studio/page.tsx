import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Circle, CircleCheck } from "lucide-react";
import { CopyButton } from "@/components/forms";
import { EmptyState, PageHeader } from "@/components/ui";
import { getDb } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { expiringCredits, revenueReport } from "@/lib/reports";
import { sessionSummaries } from "@/lib/sessions";
import { formatDay, formatInZone, formatRelativeTo, localDaysToUtcRange, monthYmds, shiftYmd, ymdInZone } from "@/lib/time";
import { formatDayShort, formatTime } from "@/lib/week";
import { currentStaff } from "@/server/session";

export const metadata: Metadata = { title: "Home" };

export default async function StudioHome() {
  const staff = await currentStaff();
  if (!staff) return null;
  const db = getDb();
  const now = new Date();
  const tz = staff.timezone;
  const today = ymdInZone(now, tz);
  const month = monthYmds(now, tz);
  const monthRange = localDaysToUtcRange(month.first, month.last, tz);
  const report = revenueReport(db, staff.studioId, monthRange.from.toISOString(), monthRange.to.toISOString());
  const expiring = expiringCredits(db, staff.studioId, now, 14);
  const todayRange = localDaysToUtcRange(today, today, tz);
  const week = localDaysToUtcRange(today, shiftYmd(today, 6), tz);
  const todayFrom = todayRange.from.toISOString();
  const todayTo = todayRange.to.toISOString();
  const nowIso = now.toISOString();
  const horizon = sessionSummaries(db, staff.studioId, todayFrom, week.to.toISOString());
  const todays = horizon.filter((row) => row.starts_at >= todayFrom && row.starts_at < todayTo);
  const weekSessions = horizon.filter((row) => row.starts_at >= nowIso);
  const weekBooked = weekSessions.reduce((sum, row) => sum + row.booked, 0);
  const weekCapacity = weekSessions.reduce((sum, row) => sum + row.capacity, 0);
  const setup = db
    .prepare(
      `SELECT s.created_at, s.updated_at, s.stripe_account_id,
         (SELECT COUNT(*) FROM class_types WHERE studio_id = s.id) AS class_types,
         (SELECT COUNT(*) FROM bookings WHERE studio_id = s.id) AS bookings,
         (SELECT COUNT(*) FROM products WHERE studio_id = s.id) AS products
       FROM studios s WHERE s.id = ?`,
    )
    .get(staff.studioId) as {
    created_at: string;
    updated_at: string;
    stripe_account_id: string | null;
    class_types: number;
    bookings: number;
    products: number;
  };
  if (!setup) return null;
  const recent = db
    .prepare(
      `SELECT b.id, b.guest_name, b.member_id, b.created_at, c.name AS class_name, s.starts_at, s.id AS session_id
       FROM bookings b JOIN class_sessions s ON s.id = b.session_id JOIN class_types c ON c.id = s.class_type_id
       WHERE b.studio_id = ? AND b.status IN ('confirmed','attended')
       ORDER BY b.created_at DESC LIMIT 6`,
    )
    .all(staff.studioId) as Array<{ id: string; guest_name: string; member_id: string | null; created_at: string; class_name: string; starts_at: string; session_id: string }>;
  const memberPath = `/s/${staff.slug}`;

  const steps = [
    { done: setup.class_types > 0, label: "Publish your first class", href: "/studio/schedule?new=1" },
    { done: setup.bookings > 0, label: "Share your member link and take a first booking", copy: true },
    { done: setup.products > 0, label: "Create a class pack or membership", href: "/studio/offerings" },
    { done: setup.updated_at !== setup.created_at, label: "Review cancellation and no-show rules", href: "/studio/policies" },
    { done: Boolean(setup.stripe_account_id), label: "Connect Stripe to take cards (optional)", href: "/studio/settings" },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  const showSetup = steps.slice(0, 4).some((step) => !step.done);

  return (
    <div className="stack-lg">
      <PageHeader kicker={formatDay(now.toISOString(), tz)} title="Today" description={staff.studioName} actions={<CopyButton text={memberPath} label="Copy member link" />} />

      {showSetup ? (
        <section className="card stack-sm" aria-labelledby="setup-title">
          <div className="row-between">
            <h2 className="card-title" id="setup-title">
              Get your studio ready
            </h2>
            <p className="muted">
              {doneCount} of {steps.length} done
            </p>
          </div>
          <div className="progress" aria-hidden="true">
            <span style={{ width: `${(doneCount / steps.length) * 100}%` }} />
          </div>
          <ul className="checklist">
            {steps.map((step) => (
              <li key={step.label} data-done={step.done || undefined}>
                {step.done ? <CircleCheck size={20} aria-hidden /> : <Circle size={20} aria-hidden />}
                <span className="checklist-label">
                  {step.label}
                  <span className="visually-hidden">{step.done ? " (done)" : ""}</span>
                </span>
                {!step.done && step.href ? (
                  <Link className="btn btn-secondary btn-sm" href={step.href}>
                    Start
                  </Link>
                ) : null}
                {!step.done && step.copy ? <CopyButton text={memberPath} label="Copy link" /> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="stat-row">
        <Link className="stat stat-link" href="/studio/reports">
          <p className="stat-label">Collected this month</p>
          <p className="stat-value">{formatMoney(report.ledgerTotalCents)}</p>
          <p className="stat-foot">
            Open reports <ArrowRight size={14} aria-hidden />
          </p>
        </Link>
        <Link className="stat stat-link" href="/studio/schedule">
          <p className="stat-label">Booked in the next 7 days</p>
          <p className="stat-value">
            {weekBooked}
            {weekCapacity > 0 ? <span className="stat-unit">/{weekCapacity} spots</span> : null}
          </p>
          <p className="stat-foot">
            {weekSessions.length} class{weekSessions.length === 1 ? "" : "es"} <ArrowRight size={14} aria-hidden />
          </p>
        </Link>
        <Link className="stat stat-link" href="/studio/reports#expiring">
          <p className="stat-label">Passes ending in 14 days</p>
          <p className="stat-value">{expiring.length}</p>
          <p className="stat-foot">
            {expiring.length > 0 ? "Send a renewal email" : "Nothing to chase"} <ArrowRight size={14} aria-hidden />
          </p>
        </Link>
      </div>

      <section className="stack-sm" aria-labelledby="today-title">
        <div className="row-between">
          <h2 className="section-title" id="today-title">
            Classes today
          </h2>
          <Link href="/studio/check-in">Open roster</Link>
        </div>
        {todays.length === 0 ? (
          <EmptyState title="No classes today" action={<Link className="btn btn-secondary btn-sm" href="/studio/schedule">Open the schedule</Link>} />
        ) : (
          <ul className="list-card">
            {todays.map((session) => {
              const ended = session.ends_at <= now.toISOString();
              return (
                <li key={session.id} data-muted={ended || undefined}>
                  <Link href={`/studio/sessions/${session.id}`} className="list-row">
                    <span className="list-time">{formatTime(session.starts_at, tz)}</span>
                    <span className="list-main">
                      <strong>{session.class_name}</strong>
                      <span className="muted">{session.instructor_name || "No instructor set"}</span>
                    </span>
                    <span className="list-end">
                      <span className="spot" data-tight={session.booked >= session.capacity || undefined}>
                        {session.booked}/{session.capacity}
                      </span>
                      {session.booked > 0 ? <span className="muted">{session.checkedIn} in</span> : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="stack-sm" aria-labelledby="recent-title">
        <h2 className="section-title" id="recent-title">
          Latest bookings
        </h2>
        {recent.length === 0 ? (
          <EmptyState title="No bookings yet">Share your member link. Bookings show up here as they come in.</EmptyState>
        ) : (
          <ul className="booking-grid">
            {recent.map((row) => {
              const day = formatDayShort(row.starts_at, tz);
              const sessionYmd = ymdInZone(new Date(row.starts_at), tz);
              const when =
                sessionYmd === today ? "Today" : sessionYmd === shiftYmd(today, 1) ? "Tomorrow" : `${day.weekday} ${day.date}`;
              return (
                <li key={row.id}>
                  <Link href={`/studio/sessions/${row.session_id}`} className="booking-card">
                    <span className="avatar" aria-hidden="true">
                      {row.guest_name.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="booking-card-who">
                      <strong title={row.guest_name}>{row.guest_name}</strong>
                      <span className="pill" title={row.class_name}>
                        {row.class_name}
                      </span>
                    </span>
                    <span className="booking-card-when">
                      <span className="booking-card-time">{formatTime(row.starts_at, tz)}</span>
                      <span className="booking-card-meta muted" title={formatInZone(row.created_at, tz)}>
                        {when} · {formatRelativeTo(row.created_at, now, true)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
