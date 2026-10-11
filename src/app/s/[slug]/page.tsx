import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { ForgetGuest } from "@/components/forget-guest";
import { MemberHeader, PoweredBy } from "@/components/member-chrome";
import { Field } from "@/components/ui";
import { WeekBoard, WeekPager, type BoardItem } from "@/components/week-board";
import { remainingSpots, listUpcomingBookingsForEmail } from "@/lib/booking";
import { getDb } from "@/lib/db";
import { sessionSummaries } from "@/lib/sessions";
import { formatInZone } from "@/lib/time";
import { listActiveWaitlistForEmail } from "@/lib/waitlist";
import { sevenDays, weekLinks } from "@/lib/week";
import { findBookingAction } from "@/server/actions";
import { guestEmail } from "@/server/guest";
import { studioBySlug } from "@/server/request";
import { currentStaff } from "@/server/session";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const studio = studioBySlug(slug);
  return { title: studio ? `${studio.name} schedule` : "Schedule" };
}

export default async function PublicSchedule({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ wait?: string; week?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const db = getDb();
  const studio = studioBySlug(slug);
  if (!studio) notFound();
  const now = new Date();
  const span = sevenDays(query.week, now, studio.timezone);
  const end = new Date(span.days[6].getTime() + 24 * 60 * 60 * 1000);
  const staff = await currentStaff();
  const email = await guestEmail();
  const mine = email ? listUpcomingBookingsForEmail(db, studio.id, email, now) : [];
  const waiting = email ? listActiveWaitlistForEmail(db, studio.id, email) : [];
  const mineBySession = new Map(mine.map((row) => [row.session_id, row]));
  const waitBySession = new Map(waiting.map((row) => [row.session_id, row]));
  const items: BoardItem[] = sessionSummaries(db, studio.id, span.start.toISOString(), end.toISOString()).map((session) => {
    const booking = mineBySession.get(session.id);
    return {
      id: session.id,
      className: session.class_name,
      startsAt: session.starts_at,
      endsAt: session.ends_at,
      durationMin: session.duration_min,
      instructor: session.instructor_name,
      priceCents: session.drop_in_price_cents,
      capacity: session.capacity,
      left: remainingSpots(session.capacity, session.booked),
      manageHref: booking ? `/b/${booking.manage_token}` : undefined,
      waitlisted: !booking && waitBySession.has(session.id),
    };
  });
  const pager = weekLinks(`/s/${slug}`, span.days, studio.timezone, now);
  const waitPosition = Number(query.wait);
  return (
    <>
      <MemberHeader
        studioName={studio.name}
        href={`/s/${slug}`}
        findHref={mine.length > 0 || waiting.length > 0 ? "#your-classes" : "#find-booking"}
        findLabel={mine.length > 0 || waiting.length > 0 ? "Your bookings" : "Find my booking"}
        studioHref={staff?.slug === slug ? "/studio" : undefined}
      />
      <main id="main" className="wrap-wide page stack">
        <section className="schedule-hero">
          <p className="feature-kicker">Class schedule</p>
          <h1 className="schedule-title">{studio.name}</h1>
          <p className="muted">Tap a class to reserve. Your name and email are enough. No account needed.</p>
        </section>
        {Number.isInteger(waitPosition) && waitPosition > 0 ? (
          <p className="ok" role="status">
            You’re number {waitPosition} on the waitlist. If a spot opens, we’ll email you a link to claim it.
          </p>
        ) : null}
        {mine.length > 0 || waiting.length > 0 ? (
          <section className="card stack-sm" id="your-classes" aria-labelledby="your-classes-title">
            <div className="row-between">
              <h2 className="card-title" id="your-classes-title">
                Your upcoming classes
              </h2>
              <ForgetGuest />
            </div>
            {mine.length > 0 ? (
              <ul className="mine-list">
                {mine.map((row) => (
                  <li key={row.id}>
                    <Link className="mine-row" href={`/b/${row.manage_token}`}>
                      <strong>{row.class_name}</strong>
                      <span className="muted">{formatInZone(row.starts_at, studio.timezone)}</span>
                      <span className="pill">{row.status === "offer_pending" ? "Claim this spot" : "Manage"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            {waiting.length > 0 && mine.length === 0 ? (
              <p className="muted">You’re on a waitlist. We’ll email you if a spot opens.</p>
            ) : null}
          </section>
        ) : null}
        <WeekPager links={pager} />
        {items.length === 0 ? (
          <div className="card empty">
            <p className="empty-title">No classes in these seven days</p>
            <p className="muted">Try the next week, or check back once the studio publishes its schedule.</p>
          </div>
        ) : (
          <WeekBoard days={span.days} items={items} timeZone={studio.timezone} now={now} mode={{ kind: "member", slug }} />
        )}
        {mine.length > 0 || waiting.length > 0 ? (
          <p className="help">
            Booked on another device? <ForgetGuest label="Clear this email" /> and search again.
          </p>
        ) : (
          <section className="card stack-sm" id="find-booking" aria-labelledby="find-booking-title">
            <h2 className="card-title" id="find-booking-title">
              Already booked?
            </h2>
            <p className="muted">Lost the confirmation link? Enter the email you used and we’ll put your spots back on this week.</p>
            <ActionForm action={findBookingAction} className="find-booking" label="Find my bookings">
              <input type="hidden" name="slug" value={slug} />
              <div className="find-booking-row">
                <Field label="Email" name="email" type="email" required autoComplete="email" inputMode="email" />
                <SubmitButton className="btn btn-secondary" pendingLabel="Looking…">
                  Find my bookings
                </SubmitButton>
              </div>
            </ActionForm>
          </section>
        )}
      </main>
      <PoweredBy />
    </>
  );
}
