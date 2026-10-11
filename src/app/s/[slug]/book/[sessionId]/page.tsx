import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, User } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { GuestFields } from "@/components/guest-fields";
import { MemberHeader } from "@/components/member-chrome";
import { sessionState } from "@/components/week-board";
import { getActiveBookingForEmail, holdingCount, remainingSpots } from "@/lib/booking";
import { memberByEmail } from "@/lib/credits";
import { getDb } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { policySummary } from "@/lib/policy";
import { getSession } from "@/lib/schedule";
import { formatDay } from "@/lib/time";
import { waitlistForEmail } from "@/lib/waitlist";
import { formatTime, zonedYmd } from "@/lib/week";
import { bookAction, waitlistAction } from "@/server/actions";
import { guestEmail } from "@/server/guest";
import { studioBySlug } from "@/server/request";
import { currentStaff } from "@/server/session";

export const metadata: Metadata = { title: "Reserve a spot" };

export default async function BookPage({ params }: { params: Promise<{ slug: string; sessionId: string }> }) {
  const { slug, sessionId } = await params;
  const db = getDb();
  const studio = studioBySlug(slug);
  const session = getSession(db, sessionId);
  if (!studio || !session || session.studio_id !== studio.id) notFound();
  const now = new Date();
  const left = remainingSpots(session.capacity, holdingCount(db, session.id));
  const state = sessionState({ startsAt: session.starts_at, endsAt: session.ends_at, left }, now);
  const price = session.drop_in_price_cents;
  const cardReady = Boolean(process.env.STRIPE_SECRET_KEY) && price >= 50;
  const backHref = `/s/${slug}?week=${zonedYmd(new Date(session.starts_at), studio.timezone)}`;
  const [freeCancel] = policySummary(studio);
  const staff = await currentStaff();
  const email = await guestEmail();
  const existing = email ? getActiveBookingForEmail(db, session.id, email) : null;
  const waiting = email ? waitlistForEmail(db, studio.id, session.id, email) : null;
  const member = email ? memberByEmail(db, studio.id, email) : null;
  const hidden = (
    <>
      <input type="hidden" name="studioId" value={studio.id} />
      <input type="hidden" name="sessionId" value={session.id} />
      <input type="hidden" name="slug" value={slug} />
    </>
  );

  let body: React.ReactNode;
  if (session.status === "cancelled") {
    body = <p className="banner">The studio cancelled this class. Pick another time from the week.</p>;
  } else if (state === "started" || state === "ended") {
    body = <p className="banner">This class has already {state === "started" ? "started" : "ended"}. Pick another time from the week.</p>;
  } else if (existing) {
    body = (
      <div className="already-in stack-sm">
        <p className="ok" role="status">
          You’re already in this class{existing.guest_name ? ` as ${existing.guest_name}` : ""}.
        </p>
        <Link className="btn btn-primary" href={`/b/${existing.manage_token}`}>
          Open your confirmation
        </Link>
      </div>
    );
  } else if (waiting && state === "full") {
    body = (
      <div className="already-in stack-sm">
        <p className="ok" role="status">
          You’re number {waiting.position} on the waitlist. If a spot opens, we’ll email you a link to claim it.
        </p>
        <Link className="btn btn-secondary" href={backHref}>
          Back to the week
        </Link>
      </div>
    );
  } else if (state === "full") {
    body = (
      <ActionForm action={waitlistAction} className="grid-form" label="Join the waitlist">
        {hidden}
        <p className="muted">
          If someone cancels, the first person on the list gets an email with a link to claim the spot.
        </p>
        <GuestFields defaultName={member?.name ?? ""} defaultEmail={email ?? ""} />
        <SubmitButton className="btn btn-primary btn-lg" pendingLabel="Joining…">
          Join the waitlist
        </SubmitButton>
      </ActionForm>
    );
  } else {
    body = (
      <ActionForm action={bookAction} className="grid-form" label="Reserve a spot">
        {hidden}
        <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
        <GuestFields defaultName={member?.name ?? ""} defaultEmail={email ?? ""} />
        {price === 0 ? (
          <SubmitButton className="btn btn-primary btn-lg" name="intent" value="reserve" pendingLabel="Reserving…">
            Reserve spot
          </SubmitButton>
        ) : cardReady ? (
          <div className="stack-sm">
            <SubmitButton className="btn btn-primary btn-lg" name="intent" value="card" pendingLabel="Paying…">
              Pay {formatMoney(price)} and reserve
            </SubmitButton>
            <SubmitButton className="btn btn-secondary" name="intent" value="reserve" pendingLabel="Checking your pass…">
              Use my class pass
            </SubmitButton>
          </div>
        ) : (
          <div className="stack-sm">
            <SubmitButton className="btn btn-primary btn-lg" name="intent" value="reserve" pendingLabel="Checking your pass…">
              Reserve with my pass
            </SubmitButton>
            <p className="help">This studio isn’t taking card payments online yet. A pass on your email is used automatically.</p>
          </div>
        )}
        <p className="help">{freeCancel}</p>
      </ActionForm>
    );
  }

  return (
    <>
      <MemberHeader studioName={studio.name} href={`/s/${slug}`} studioHref={staff?.slug === slug ? "/studio" : undefined} />
      <main id="main" className="wrap-narrow page stack">
        <Link className="back-link" href={backHref}>
          <ArrowLeft size={16} aria-hidden />
          Back to the week
        </Link>
        <article className="card stack">
          <div className="stack-sm">
            <p className="feature-kicker">{formatDay(session.starts_at, studio.timezone)}</p>
            <h1 className="page-title">{session.class_name}</h1>
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
          <div className="class-tags">
            {state === "open" || state === "tight" || state === "full" ? (
              <span className="spot" data-tight={state !== "open" || undefined}>
                {left === 0 ? "Full" : left === 1 ? "1 spot left" : `${left} spots left`}
              </span>
            ) : null}
            <span className="tag">{price > 0 ? `Drop-in ${formatMoney(price)}` : "Free to reserve"}</span>
          </div>
          {session.description ? <p className="muted">{session.description}</p> : null}
          <hr className="divider" />
          {body}
        </article>
      </main>
    </>
  );
}
