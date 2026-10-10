import Link from "next/link";
import { spotsLeft } from "@/lib/booking";
import { getDb } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { listClassTypes, listSessions } from "@/lib/schedule";
import { addSessionAction, publishClassAction } from "@/server/actions";
import { Flash, Field } from "@/components/ui";
import { formatInZone } from "@/lib/time";
import { currentStaff } from "@/server/session";

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const staff = await currentStaff();
  if (!staff) return null;
  const query = await searchParams;
  const db = getDb();
  const now = new Date();
  const sessions = listSessions(
    db,
    staff.studioId,
    new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
    new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(),
  );
  const types = listClassTypes(db, staff.studioId);
  return (
    <div className="stack">
      <h1>Schedule</h1>
      <p className="muted">
        Members book at <Link href={`/s/${staff.slug}`}>/s/{staff.slug}</Link>
      </p>
      <Flash message={query.error} />
      <form className="card grid-form" action={publishClassAction}>
        <h2>Publish a class</h2>
        <Field label="Class name" name="name" required placeholder="Dawn reformer" />
        <div className="grid-2">
          <Field label="Minutes" name="minutes" type="number" min={10} max={240} defaultValue={50} required />
          <Field label="Spots" name="spots" type="number" min={1} max={40} defaultValue={8} required />
        </div>
        <Field label="Drop-in price" name="price" inputMode="decimal" hint="Dollars. Leave empty to let people reserve without a card." placeholder="0" />
        <Field label="First session" name="startsAt" type="datetime-local" required />
        <Field label="Instructor" name="instructor" defaultValue={staff.name} />
        <button className="btn btn-primary" type="submit">
          Publish class
        </button>
      </form>
      {types.length > 0 ? (
        <form className="card grid-form" action={addSessionAction}>
          <h2>Add another session</h2>
          <label className="field">
            <span>Class</span>
            <select name="classTypeId" required>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>
          <Field label="Starts" name="startsAt" type="datetime-local" required />
          <button className="btn btn-secondary" type="submit">
            Add session
          </button>
        </form>
      ) : null}
      <section className="stack">
        <h2>On the books</h2>
        {sessions.length === 0 ? <p className="muted">Nothing published in the next three weeks.</p> : null}
        {sessions.map((session) => (
          <article className="card" key={session.id}>
            <h3>{session.class_name}</h3>
            <p>
              {formatInZone(session.starts_at, staff.timezone)} · {spotsLeft(db, session.id)} spots left ·{" "}
              {session.drop_in_price_cents > 0 ? formatMoney(session.drop_in_price_cents) : "No card required"}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
