import type { Metadata } from "next";
import Link from "next/link";
import { RosterList } from "@/components/roster-list";
import { EmptyState, PageHeader } from "@/components/ui";
import { getDb } from "@/lib/db";
import { rosterFor, sessionSummaries, type SessionSummary } from "@/lib/sessions";
import { localDaysToUtcRange, shiftYmd, ymdInZone } from "@/lib/time";
import { formatDayShort, formatTime } from "@/lib/week";
import { currentStaff } from "@/server/session";

export const metadata: Metadata = { title: "Roster" };

export default async function CheckInPage() {
  const staff = await currentStaff();
  if (!staff) return null;
  const db = getDb();
  const now = new Date();
  const today = ymdInZone(now, staff.timezone);
  const range = localDaysToUtcRange(today, shiftYmd(today, 7), staff.timezone);
  const sessions = sessionSummaries(db, staff.studioId, range.from.toISOString(), range.to.toISOString()).filter(
    (session) => session.ends_at > new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
  );
  const rows = rosterFor(db, staff.studioId, sessions.map((session) => session.id));
  const todays = sessions.filter((session) => ymdInZone(new Date(session.starts_at), staff.timezone) === today);
  const later = sessions.filter((session) => ymdInZone(new Date(session.starts_at), staff.timezone) !== today);

  const block = (session: SessionSummary) => {
    const people = rows.filter((row) => row.session_id === session.id);
    const day = formatDayShort(session.starts_at, staff.timezone);
    return (
      <section className="card roster-card" key={session.id} aria-labelledby={`roster-${session.id}`}>
        <header className="roster-head">
          <div>
            <p className="class-time">
              {day.weekday} {day.date} · {formatTime(session.starts_at, staff.timezone)}
            </p>
            <h3 id={`roster-${session.id}`}>
              <Link href={`/studio/sessions/${session.id}`}>{session.class_name}</Link>
            </h3>
            {session.instructor_name ? <p className="class-meta">{session.instructor_name}</p> : null}
          </div>
          <p className="roster-count">
            <strong>{session.checkedIn}</strong>/{session.booked} in
            <span className="muted"> · {session.capacity} spots</span>
          </p>
        </header>
        <RosterList rows={people} canCheckIn />
      </section>
    );
  };

  return (
    <div className="stack">
      <PageHeader title="Roster" description="Check people in as they arrive. Members can also tap “I’m here” on their confirmation page." />
      <section className="stack" aria-labelledby="roster-today">
        <h2 className="section-title" id="roster-today">
          Today
        </h2>
        {todays.length === 0 ? (
          <EmptyState title="No more classes today">Classes from the next seven days are below.</EmptyState>
        ) : (
          todays.map(block)
        )}
      </section>
      {later.length > 0 ? (
        <section className="stack" aria-labelledby="roster-later">
          <h2 className="section-title" id="roster-later">
            Next 7 days
          </h2>
          {later.map(block)}
        </section>
      ) : null}
    </div>
  );
}
