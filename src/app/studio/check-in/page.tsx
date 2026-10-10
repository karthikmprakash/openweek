import { Flash } from "@/components/ui";
import { roster } from "@/lib/attendance";
import { getDb } from "@/lib/db";
import { staffCheckInAction } from "@/server/actions";
import { formatInZone } from "@/lib/time";
import { currentStaff } from "@/server/session";

export default async function CheckInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const staff = await currentStaff();
  if (!staff) return null;
  const query = await searchParams;
  const rows = roster(getDb(), staff.studioId, new Date());
  return (
    <div className="stack">
      <h1>Roster</h1>
      <p className="muted">Staff check-in is here. Members can also tap “I’m here” on their confirmation.</p>
      <Flash message={query.error} />
      {rows.length === 0 ? <p className="muted">Nobody is booked in this window.</p> : null}
      <ul className="stack" style={{ listStyle: "none", padding: 0 }}>
        {rows.map((row) => (
          <li className="card" key={row.id}>
            <h2>{row.guest_name}</h2>
            <p className="muted">
              {row.class_name} · {formatInZone(row.starts_at, staff.timezone)}
            </p>
            {row.attendance_id ? (
              <p>Checked in · {row.method}</p>
            ) : (
              <form action={staffCheckInAction}>
                <input type="hidden" name="bookingId" value={row.id} />
                <button className="btn btn-primary" type="submit">
                  Check in {row.guest_name}
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
