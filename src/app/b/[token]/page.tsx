import Link from "next/link";
import { notFound } from "next/navigation";
import { Flash } from "@/components/ui";
import { attendanceForBooking } from "@/lib/attendance";
import { getBookingByToken, spotsLeft } from "@/lib/booking";
import { memberByEmail } from "@/lib/credits";
import { getDb } from "@/lib/db";
import { latestOutcome } from "@/lib/policy";
import { getSession, getStudio } from "@/lib/schedule";
import { cancelBookingAction, claimOfferAction, optOutAction, selfCheckInAction } from "@/server/actions";
import { formatInZone } from "@/lib/time";

export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const db = getDb();
  const booking = getBookingByToken(db, token);
  if (!booking) notFound();
  const session = getSession(db, booking.session_id);
  const studio = getStudio(db, booking.studio_id);
  const attendance = attendanceForBooking(db, booking.id);
  const outcome = latestOutcome(db, booking.id);
  const member = memberByEmail(db, booking.studio_id, booking.guest_email);
  if (!session) notFound();
  const inClass = booking.status === "confirmed" || booking.status === "attended";
  return (
    <main id="main" className="wrap page stack" style={{ maxWidth: 560 }}>
      <p>
        <Link href={`/s/${studio.slug}`}>Week schedule</Link>
      </p>
      <h1>{inClass ? "You’re in" : booking.status === "offer_pending" ? "A spot opened" : "Booking update"}</h1>
      <Flash message={query.error} />
      {outcome ? <p className="ok">{outcome.message}</p> : null}
      <article className="card stack">
        <h2>{session.class_name}</h2>
        <p>
          {formatInZone(session.starts_at, studio.timezone)} · {studio.name}
        </p>
        <p>
          {booking.guest_name} · {spotsLeft(db, session.id)} spots left
        </p>
        {booking.status === "offer_pending" ? (
          <form action={claimOfferAction}>
            <input type="hidden" name="token" value={token} />
            <button className="btn btn-primary btn-lg" type="submit">
              Claim this spot
            </button>
          </form>
        ) : null}
        {booking.status === "confirmed" && !attendance ? (
          <form action={selfCheckInAction}>
            <input type="hidden" name="token" value={token} />
            <button className="btn btn-primary" type="submit">
              I’m here
            </button>
          </form>
        ) : null}
        {attendance ? <p>Checked in · {attendance.method}</p> : null}
        {booking.status === "confirmed" || booking.status === "offer_pending" ? (
          <form action={cancelBookingAction}>
            <input type="hidden" name="token" value={token} />
            <button className="btn btn-secondary" type="submit">
              Cancel
            </button>
          </form>
        ) : null}
      </article>
      <form action={optOutAction}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="optOut" value={member?.email_opt_out ? "0" : "1"} />
        <button className="btn btn-ghost" type="submit">
          {member?.email_opt_out ? "Email me reminders again" : "Don’t email me reminders"}
        </button>
      </form>
    </main>
  );
}
