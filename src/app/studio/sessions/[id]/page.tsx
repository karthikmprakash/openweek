import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, ExternalLink, User } from "lucide-react";
import { ActionForm, ConfirmSubmit, CopyButton } from "@/components/forms";
import { RosterList } from "@/components/roster-list";
import { PageHeader } from "@/components/ui";
import { getDb } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { rosterFor, sessionSummary, waitlistFor } from "@/lib/sessions";
import { formatDay, formatInZone } from "@/lib/time";
import { formatTime, zonedYmd } from "@/lib/week";
import { cancelSessionAction } from "@/server/actions";
import { currentStaff } from "@/server/session";

export const metadata: Metadata = { title: "Class" };

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await currentStaff();
  if (!staff) return null;
  const db = getDb();
  const session = sessionSummary(db, staff.studioId, id);
  if (!session) notFound();
  const now = new Date();
  const rows = rosterFor(db, staff.studioId, [session.id]);
  const waiting = waitlistFor(db, staff.studioId, session.id);
  const ended = session.ends_at <= now.toISOString();
  const cancelled = session.status === "cancelled";
  const bookPath = `/s/${staff.slug}/book/${session.id}`;
  const holders = rows.filter((row) => row.status === "confirmed" || row.status === "offer_pending").length;

  return (
    <div className="stack">
      <Link className="back-link" href={`/studio/schedule?week=${zonedYmd(new Date(session.starts_at), staff.timezone)}`}>
        <ArrowLeft size={16} aria-hidden />
        Back to the schedule
      </Link>
      <PageHeader
        kicker={formatDay(session.starts_at, staff.timezone)}
        title={session.class_name}
        actions={
          !cancelled && !ended ? (
            <>
              <CopyButton text={bookPath} label="Copy booking link" />
              <a className="btn btn-secondary btn-sm" href={bookPath} target="_blank" rel="noreferrer">
                <ExternalLink size={16} aria-hidden />
                Member view
              </a>
            </>
          ) : null
        }
      />
      {cancelled ? <p className="banner">This class was cancelled. Members were told and pass visits were returned.</p> : null}
      <div className="stat-row">
        <div className="stat">
          <p className="stat-label">Booked</p>
          <p className="stat-value">
            {session.booked}
            <span className="stat-unit">/{session.capacity}</span>
          </p>
        </div>
        <div className="stat">
          <p className="stat-label">Checked in</p>
          <p className="stat-value">{session.checkedIn}</p>
        </div>
        <div className="stat">
          <p className="stat-label">Waitlist</p>
          <p className="stat-value">{session.waiting}</p>
        </div>
      </div>
      <ul className="facts">
        <li>
          <Clock size={16} aria-hidden />
          {formatTime(session.starts_at, staff.timezone)} – {formatTime(session.ends_at, staff.timezone)} · {session.duration_min} min
        </li>
        {session.instructor_name ? (
          <li>
            <User size={16} aria-hidden />
            {session.instructor_name}
          </li>
        ) : null}
        <li>{session.drop_in_price_cents > 0 ? `Drop-in ${formatMoney(session.drop_in_price_cents)}` : "Free to reserve"}</li>
      </ul>

      <section className="card stack-sm" aria-labelledby="roster-title">
        <h2 className="card-title" id="roster-title">
          Roster
        </h2>
        <RosterList rows={rows} canCheckIn={!cancelled} />
      </section>

      {waiting.length > 0 ? (
        <section className="card stack-sm" aria-labelledby="waitlist-title">
          <h2 className="card-title" id="waitlist-title">
            Waitlist
          </h2>
          <ol className="plain-list">
            {waiting.map((row) => (
              <li key={row.id}>
                <strong>{row.guest_name}</strong> <span className="muted">· {row.guest_email}</span>
                {row.status === "offered" && row.offer_expires_at ? (
                  <span className="pill">Offer open until {formatInZone(row.offer_expires_at, staff.timezone)}</span>
                ) : null}
              </li>
            ))}
          </ol>
          <p className="help">When a spot opens, the next person is emailed a link and has your claim window to take it.</p>
        </section>
      ) : null}

      {!cancelled && !ended ? (
        <section className="card stack-sm danger-zone" aria-labelledby="cancel-title">
          <h2 className="card-title" id="cancel-title">
            Cancel this class
          </h2>
          <p className="muted">
            Everyone booked is emailed, pass visits go back on their passes, and the waitlist closes. No late-cancel fees apply.
          </p>
          <ActionForm action={cancelSessionAction}>
            <input type="hidden" name="sessionId" value={session.id} />
            <ConfirmSubmit
              trigger="Cancel class"
              triggerClassName="btn btn-danger-outline"
              confirmLabel="Yes, cancel the class"
              pendingLabel="Cancelling…"
              message={
                <p>
                  {holders === 0
                    ? "No one is booked yet. The class comes off the member schedule."
                    : `${holders} ${holders === 1 ? "person is" : "people are"} booked and will be emailed.`}
                </p>
              }
            />
          </ActionForm>
        </section>
      ) : null}
    </div>
  );
}
