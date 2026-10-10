import Link from "next/link";
import { notFound } from "next/navigation";
import { Field, Flash } from "@/components/ui";
import { spotsLeft } from "@/lib/booking";
import { getDb } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getSession, getStudioBySlug } from "@/lib/schedule";
import { payAndReserveAction, reserveAction, waitlistAction } from "@/server/actions";
import { formatInZone } from "@/lib/time";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; sessionId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug, sessionId } = await params;
  const query = await searchParams;
  const db = getDb();
  const studio = getStudioBySlug(db, slug);
  const session = getSession(db, sessionId);
  if (!studio || !session || session.studio_id !== studio.id) notFound();
  const left = spotsLeft(db, session.id);
  const idempotencyKey = crypto.randomUUID();
  return (
    <main id="main" className="wrap page stack" style={{ maxWidth: 560 }}>
      <p>
        <Link href={`/s/${slug}`}>Back to the week</Link>
      </p>
      <h1>{session.class_name}</h1>
      <p>
        {formatInZone(session.starts_at, studio.timezone)} · {left === 1 ? "1 spot left" : `${left} spots left`}
      </p>
      {session.drop_in_price_cents > 0 ? <p>Drop-in {formatMoney(session.drop_in_price_cents)}. A pass on this email is used first.</p> : null}
      <Flash message={query.error} />
      {left > 0 ? (
        <form className="card grid-form" action={reserveAction}>
          <input type="hidden" name="studioId" value={studio.id} />
          <input type="hidden" name="sessionId" value={session.id} />
          <input type="hidden" name="slug" value={slug} />
          <Field label="Name" name="guestName" required autoComplete="name" />
          <Field label="Email" name="email" type="email" required autoComplete="email" />
          <button className="btn btn-primary btn-lg" type="submit">
            Reserve spot
          </button>
        </form>
      ) : (
        <form className="card grid-form" action={waitlistAction}>
          <input type="hidden" name="studioId" value={studio.id} />
          <input type="hidden" name="sessionId" value={session.id} />
          <input type="hidden" name="slug" value={slug} />
          <Field label="Name" name="guestName" required />
          <Field label="Email" name="email" type="email" required />
          <button className="btn btn-primary btn-lg" type="submit">
            Join the waitlist
          </button>
        </form>
      )}
      {left > 0 && session.drop_in_price_cents >= 50 ? (
        <form className="card grid-form" action={payAndReserveAction}>
          <input type="hidden" name="studioId" value={studio.id} />
          <input type="hidden" name="sessionId" value={session.id} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <h2>Pay with the studio’s card account</h2>
          <Field label="Name" name="guestName" required />
          <Field label="Email" name="email" type="email" required />
          <button className="btn btn-secondary" type="submit">
            Pay and reserve
          </button>
        </form>
      ) : null}
    </main>
  );
}
