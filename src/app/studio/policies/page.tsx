import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/forms";
import { TimezoneSelect } from "@/components/timezone-select";
import { Field, Notice, PageHeader } from "@/components/ui";
import { getDb } from "@/lib/db";
import { policySummary } from "@/lib/policy";
import { getStudio } from "@/lib/schedule";
import { savePoliciesAction } from "@/server/actions";
import { currentStaff } from "@/server/session";

export const metadata: Metadata = { title: "Policies" };

function ModeSelect({ name, defaultValue }: { name: string; defaultValue: string }) {
  return (
    <select name={name} id={name} defaultValue={defaultValue}>
      <option value="forfeit">The visit is used. No fee.</option>
      <option value="fee">Charge a fee. The visit goes back on the pass.</option>
      <option value="credit">Take one extra visit from the pass as a penalty.</option>
    </select>
  );
}

export default async function PoliciesPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const staff = await currentStaff();
  if (!staff) return null;
  const query = await searchParams;
  const studio = getStudio(getDb(), staff.studioId);
  const dollars = (cents: number) => (cents / 100).toFixed(2);

  return (
    <div className="stack">
      <PageHeader
        title="Policies"
        description="These rules run on their own. Members see the cancellation rule before they cancel. The defaults already apply — save once so your home checklist knows you’ve reviewed them."
      />
      <Notice message={query.saved ? "Saved. The next cancel or no-show uses these rules." : undefined} />

      <section className="card summary-card" aria-labelledby="rules-now">
        <h2 className="card-title" id="rules-now">
          What members get right now
        </h2>
        <ul className="plain-list">
          {policySummary(studio).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <ActionForm action={savePoliciesAction} className="stack">
        <fieldset className="card grid-form policy-group">
          <legend className="card-title">Cancellations</legend>
          <Field
            label="Free cancellation window"
            name="windowHours"
            type="number"
            min={0}
            max={168}
            suffix="hours before class"
            defaultValue={studio.cancellation_window_hours}
            required
            hint="Cancelling earlier than this is always free and returns the visit."
          />
          <label className="field" htmlFor="lateMode">
            <span>If someone cancels later</span>
            <ModeSelect name="lateMode" defaultValue={studio.late_cancel_mode} />
          </label>
          <Field className="fee-field" label="Late cancel fee" name="lateFee" inputMode="decimal" prefix="$" defaultValue={dollars(studio.late_cancel_fee_cents)} />
        </fieldset>

        <fieldset className="card grid-form policy-group">
          <legend className="card-title">No-shows</legend>
          <label className="field" htmlFor="noShowMode">
            <span>If someone books and doesn’t come</span>
            <ModeSelect name="noShowMode" defaultValue={studio.no_show_mode} />
          </label>
          <Field className="fee-field" label="No-show fee" name="noShowFee" inputMode="decimal" prefix="$" defaultValue={dollars(studio.no_show_fee_cents)} />
        </fieldset>

        <fieldset className="card grid-form">
          <legend className="card-title">Waitlist and reminders</legend>
          <div className="grid-2">
            <Field
              label="Time to claim an open spot"
              name="claimMinutes"
              type="number"
              min={5}
              max={1440}
              suffix="minutes"
              defaultValue={studio.waitlist_claim_minutes}
              required
              hint="After this, the spot goes to the next person."
            />
            <Field
              label="Send the reminder"
              name="leadHours"
              type="number"
              min={0}
              max={168}
              suffix="hours before"
              defaultValue={studio.reminder_lead_hours}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="timezone">Studio time zone</label>
            <TimezoneSelect defaultValue={studio.timezone} />
            <p className="help">Class times, reminders, and reports use this zone.</p>
          </div>
        </fieldset>

        <div className="sticky-actions">
          <SubmitButton pendingLabel="Saving…">Save and confirm these rules</SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}
