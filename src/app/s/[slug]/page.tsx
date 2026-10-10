import Link from "next/link";
import { notFound } from "next/navigation";
import { Brand } from "@/components/ui";
import { spotsLeft } from "@/lib/booking";
import { getDb } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getStudioBySlug, listSessions } from "@/lib/schedule";
import { formatDay, formatInZone } from "@/lib/time";

export default async function PublicSchedule({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ wait?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const db = getDb();
  const studio = getStudioBySlug(db, slug);
  if (!studio) notFound();
  const now = new Date();
  const sessions = listSessions(
    db,
    studio.id,
    new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
    new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString(),
  );
  const groups = new Map<string, typeof sessions>();
  for (const session of sessions) {
    const day = formatDay(session.starts_at, studio.timezone);
    groups.set(day, [...(groups.get(day) ?? []), session]);
  }
  return (
    <>
      <header className="topbar">
        <div className="wrap" style={{ width: "100%" }}>
          <Brand href={`/s/${slug}`} />
        </div>
      </header>
      <main id="main" className="wrap page stack">
        <h1>{studio.name}</h1>
        <p className="lede">This week’s classes. Reserve a spot from your phone. A drop-in does not need an account.</p>
        {query.wait ? <p className="ok">You’re on the waitlist at position {query.wait}.</p> : null}
        {sessions.length === 0 ? (
          <p className="card">Nothing is scheduled this week. Check back after the studio publishes the next one.</p>
        ) : null}
        {[...groups.entries()].map(([day, rows]) => (
          <section key={day} className="stack">
            <h2>{day}</h2>
            {rows.map((session) => {
              const left = spotsLeft(db, session.id);
              return (
                <article className="card" key={session.id}>
                  <h3>{session.class_name}</h3>
                  <p>
                    {formatInZone(session.starts_at, studio.timezone)}
                    {session.instructor_name ? ` · ${session.instructor_name}` : ""}
                  </p>
                  <p className="row">
                    <span className="spot">{left === 1 ? "1 spot left" : `${left} spots left`}</span>
                    <span className="muted">
                      {session.drop_in_price_cents > 0 ? formatMoney(session.drop_in_price_cents) : "Reserve without a card"}
                    </span>
                  </p>
                  <Link className="btn btn-primary" href={`/s/${slug}/book/${session.id}`}>
                    {left > 0 ? "Reserve" : "Join the waitlist"}
                  </Link>
                </article>
              );
            })}
          </section>
        ))}
      </main>
    </>
  );
}
