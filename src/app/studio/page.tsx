import Link from "next/link";
import { listUpcomingBookings } from "@/lib/booking";
import { getDb } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { expiringCredits, revenueReport } from "@/lib/reports";
import { formatInZone } from "@/lib/time";
import { currentStaff } from "@/server/session";

export default async function StudioHome() {
  const staff = await currentStaff();
  if (!staff) return null;
  const db = getDb();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
  const report = revenueReport(db, staff.studioId, monthStart, nextMonth);
  const expiring = expiringCredits(db, staff.studioId, now, 14);
  const upcoming = listUpcomingBookings(db, staff.studioId, now).slice(0, 8);
  return (
    <div className="stack">
      <h1>Today at {staff.studioName}</h1>
      <div className="grid-2">
        <article className="card">
          <p className="muted">Collected this month</p>
          <p className="price">{formatMoney(report.ledgerTotalCents)}</p>
          <Link href="/studio/reports">Open the report</Link>
        </article>
        <article className="card">
          <p className="muted">Passes ending in 14 days</p>
          <p className="price">{expiring.length}</p>
          <Link href="/studio/reports">Email them</Link>
        </article>
      </div>
      <section className="card">
        <h2>Coming up</h2>
        {upcoming.length === 0 ? (
          <p className="muted">No reservations yet. Publish a class and share the member link.</p>
        ) : (
          <ul>
            {upcoming.map((row) => (
              <li key={row.id}>
                {row.guest_name} · {row.class_name} · {formatInZone(row.starts_at, staff.timezone)}
              </li>
            ))}
          </ul>
        )}
        <p>
          <Link href={`/s/${staff.slug}`}>Member schedule</Link>
        </p>
      </section>
    </div>
  );
}
