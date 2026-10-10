import { Flash, Field } from "@/components/ui";
import { getDb } from "@/lib/db";
import { getStudio } from "@/lib/schedule";
import { savePoliciesAction } from "@/server/actions";
import { currentStaff } from "@/server/session";

export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const staff = await currentStaff();
  if (!staff) return null;
  const query = await searchParams;
  const studio = getStudio(getDb(), staff.studioId);
  return (
    <div className="stack">
      <h1>Policies</h1>
      <Flash message={query.error} />
      {query.saved ? <p className="ok">Saved. The next cancel uses these rules.</p> : null}
      <form className="card grid-form" action={savePoliciesAction}>
        <Field label="Free cancellation window (hours)" name="windowHours" type="number" min={0} defaultValue={studio.cancellation_window_hours} required />
        <label className="field">
          <span>Late cancel</span>
          <select name="lateMode" defaultValue={studio.late_cancel_mode}>
            <option value="forfeit">Keep the visit, no fee</option>
            <option value="fee">Charge a fee and return the visit</option>
            <option value="credit">Take an extra visit</option>
          </select>
        </label>
        <Field label="Late fee" name="lateFee" defaultValue={(studio.late_cancel_fee_cents / 100).toFixed(2)} />
        <label className="field">
          <span>No-show</span>
          <select name="noShowMode" defaultValue={studio.no_show_mode}>
            <option value="forfeit">Keep the visit, no fee</option>
            <option value="fee">Charge a fee and return the visit</option>
            <option value="credit">Take an extra visit</option>
          </select>
        </label>
        <Field label="No-show fee" name="noShowFee" defaultValue={(studio.no_show_fee_cents / 100).toFixed(2)} />
        <Field label="Waitlist claim window (minutes)" name="claimMinutes" type="number" min={5} defaultValue={studio.waitlist_claim_minutes} required />
        <Field label="Reminder lead time (hours)" name="leadHours" type="number" min={0} defaultValue={studio.reminder_lead_hours} required />
        <Field label="Timezone" name="timezone" defaultValue={studio.timezone} required />
        <button className="btn btn-primary" type="submit">
          Save policies
        </button>
      </form>
    </div>
  );
}
