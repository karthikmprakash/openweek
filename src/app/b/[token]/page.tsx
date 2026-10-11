import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, CircleCheck, Clock, Info, User } from "lucide-react";
import { ActionForm, ConfirmSubmit, CopyButton, SubmitButton } from "@/components/forms";
import { MemberHeader, PoweredBy } from "@/components/member-chrome";
import { RememberGuest } from "@/components/remember-guest";
import { attendanceForBooking, SELF_CHECK_IN_OPENS_MIN, selfCheckInWindow } from "@/lib/attendance";
import { getBookingByToken } from "@/lib/booking";
import { creditsRemaining, memberByEmail } from "@/lib/credits";
import { getDb } from "@/lib/db";
import { cancellationTerms, latestOutcome } from "@/lib/policy";
import { getSession, getStudio } from "@/lib/schedule";
import { formatDay, formatInZone } from "@/lib/time";
import { formatTime } from "@/lib/week";
import { cancelBookingAction, claimOfferAction, optOutAction, selfCheckInAction } from "@/server/actions";
import { currentStaff } from "@/server/session";

export const metadata: Metadata = { title: "Your booking", robots: { index: false } };

export default async function ConfirmationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();
  const booking = getBookingByToken(db, token);
  if (!booking) notFound();
  const session = getSession(db, booking.session_id);
  if (!session) notFound();
  const studio = getStudio(db, booking.studio_id);
  const attendance = attendanceForBooking(db, booking.id);
  const outcome = latestOutcome(db, booking.id);
  const member = memberByEmail(db, booking.studio_id, booking.guest_email);
  const staff = await currentStaff();
  const now = new Date();
  const classCancelled = session.status === "cancelled";
  const inClass = booking.status === "confirmed" || booking.status === "attended";
  const ended = session.ends_at <= now.toISOString();
  const checkInWindow = selfCheckInWindow(session);
  const checkInOpen = now >= checkInWindow.opensAt && now <= checkInWindow.closesAt;
  const terms = cancellationTerms(studio, session.starts_at, now);
  const offer = booking.status === "offer_pending"
    ? (db.prepare(`SELECT offer_expires_at FROM waitlist WHERE booking_id = ?`).get(booking.id) as { offer_expires_at: string | null } | undefined)
    : undefined;
  const pass = booking.entitlement_id
    ? (db
        .prepare(`SELECT p.name FROM entitlements e JOIN products p ON p.id = e.product_id WHERE e.id = ?`)
        .get(booking.entitlement_id) as { name: string } | undefined)
    : undefined;
  const passLeft = booking.entitlement_id ? creditsRemaining(db, booking.entitlement_id) : null;

  const title = classCancelled
    ? "Class cancelled"
    : inClass
      ? "You’re in"
      : booking.status === "offer_pending"
        ? "A spot opened for you"
        : booking.status === "no_show"
          ? "Marked as a no-show"
          : "Booking cancelled";

  return (
    <>
      <MemberHeader
        studioName={studio.name}
        href={`/s/${studio.slug}`}
        studioHref={staff?.studioId === booking.studio_id ? "/studio" : undefined}
      />
      <main id="main" className="wrap-narrow page stack">
        <RememberGuest token={token} />
        <section className="confirm-hero" data-tone={inClass && !classCancelled ? "ok" : booking.status === "offer_pending" ? "offer" : "muted"}>
          {inClass && !classCancelled ? <CircleCheck size={28} aria-hidden /> : <Info size={28} aria-hidden />}
          <div>
            <h1 className="page-title">{title}</h1>
            <p className="muted">
              {inClass && !classCancelled
                ? `We’ve saved a spot for ${booking.guest_name}.`
                : booking.status === "offer_pending"
                  ? "Claim it before the offer runs out, or let it go to the next person."
                  : "This spot is no longer held."}
            </p>
          </div>
        </section>

        {outcome ? (
          <p className="ok" role="status">
            {outcome.message}
          </p>
        ) : null}

        <article className="card stack">
          <div className="stack-sm">
            <p className="feature-kicker">{formatDay(session.starts_at, studio.timezone)}</p>
            <h2 className="card-title">{session.class_name}</h2>
          </div>
          <ul className="facts">
            <li>
              <Clock size={16} aria-hidden />
              {formatTime(session.starts_at, studio.timezone)} · {session.duration_min} min
            </li>
            {session.instructor_name ? (
              <li>
                <User size={16} aria-hidden />
                {session.instructor_name}
              </li>
            ) : null}
          </ul>
          <dl className="details">
            <div>
              <dt>Booked for</dt>
              <dd>
                {booking.guest_name} · {booking.guest_email}
              </dd>
            </div>
            {pass ? (
              <div>
                <dt>Paid with</dt>
                <dd>
                  {pass.name}
                  {passLeft !== null ? ` · ${passLeft} visit${passLeft === 1 ? "" : "s"} left` : ""}
                </dd>
              </div>
            ) : null}
          </dl>

          {booking.status === "offer_pending" && !classCancelled ? (
            <div className="stack-sm">
              {offer?.offer_expires_at ? (
                <p className="help">Hold expires {formatInZone(offer.offer_expires_at, studio.timezone)}.</p>
              ) : null}
              <div className="row">
                <ActionForm action={claimOfferAction}>
                  <input type="hidden" name="token" value={token} />
                  <SubmitButton className="btn btn-primary btn-lg" pendingLabel="Claiming…">
                    Claim this spot
                  </SubmitButton>
                </ActionForm>
                <ActionForm action={cancelBookingAction}>
                  <input type="hidden" name="token" value={token} />
                  <SubmitButton className="btn btn-ghost" pendingLabel="Letting it go…">
                    No thanks
                  </SubmitButton>
                </ActionForm>
              </div>
            </div>
          ) : null}

          {inClass && !classCancelled ? (
            <div className="stack-sm">
              {attendance ? (
                <p className="checked-in">
                  <CircleCheck size={18} aria-hidden />
                  Checked in · {attendance.method === "self" ? "self" : "staff"} at {formatTime(attendance.checked_in_at, studio.timezone)}
                </p>
              ) : checkInOpen ? (
                <ActionForm action={selfCheckInAction}>
                  <input type="hidden" name="token" value={token} />
                  <SubmitButton className="btn btn-primary btn-lg btn-block" pendingLabel="Checking in…">
                    I’m here
                  </SubmitButton>
                </ActionForm>
              ) : !ended ? (
                <p className="help">
                  Check-in opens {SELF_CHECK_IN_OPENS_MIN} minutes before class, at {formatTime(checkInWindow.opensAt.toISOString(), studio.timezone)}.
                </p>
              ) : null}
              {!ended ? (
                <a className="btn btn-secondary" href={`/b/${token}/calendar`} download>
                  <CalendarPlus size={18} aria-hidden />
                  Add to calendar
                </a>
              ) : null}
            </div>
          ) : null}
        </article>

        {booking.status === "confirmed" && !attendance && !classCancelled && session.starts_at > now.toISOString() ? (
          <section className="card stack-sm">
            <h2 className="card-title">Can’t make it?</h2>
            <p className="muted">{terms.text}</p>
            <ActionForm action={cancelBookingAction}>
              <input type="hidden" name="token" value={token} />
              <ConfirmSubmit
                trigger="Cancel booking"
                confirmLabel={terms.free ? "Yes, cancel" : "Cancel anyway"}
                pendingLabel="Cancelling…"
                message={<p>{terms.free ? "Your spot goes to the next person. This can’t be undone." : terms.text}</p>}
              />
            </ActionForm>
          </section>
        ) : null}

        <section className="stack-sm fine-print">
          <p className="help">
            {inClass && !classCancelled
              ? "Keep this page. It’s how you check in, add the class to your calendar, or cancel."
              : booking.status === "offer_pending"
                ? "This page is the only way to claim the spot before it goes to the next person."
                : booking.status === "cancelled" || booking.status === "late_cancelled"
                  ? "This booking is closed. You can reserve again from the week if the class is still open."
                  : "This booking is closed."}
          </p>
          <CopyButton text={`/b/${token}`} label="Copy this page" />
          <ActionForm action={optOutAction}>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="optOut" value={member?.email_opt_out ? "0" : "1"} />
            <SubmitButton className="link-btn">{member?.email_opt_out ? "Email me class reminders again" : "Stop reminder emails"}</SubmitButton>
          </ActionForm>
          {booking.status === "cancelled" && !classCancelled && session.starts_at > now.toISOString() ? (
            <p>
              <Link href={`/s/${studio.slug}/book/${session.id}`}>Reserve this class again</Link>
            </p>
          ) : null}
          <p>
            <Link href={`/s/${studio.slug}`}>See the full week at {studio.name}</Link>
          </p>
        </section>
      </main>
      <PoweredBy />
    </>
  );
}
