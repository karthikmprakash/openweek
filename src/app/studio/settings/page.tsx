import { Field, Flash } from "@/components/ui";
import { getDb } from "@/lib/db";
import { getStudio } from "@/lib/schedule";
import { deleteStudioAction, saveStripeAction } from "@/server/actions";
import { currentStaff } from "@/server/session";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const staff = await currentStaff();
  if (!staff) return null;
  const query = await searchParams;
  const studio = getStudio(getDb(), staff.studioId);
  const connected = Boolean(process.env.STRIPE_SECRET_KEY);
  return (
    <div className="stack">
      <h1>Settings</h1>
      <Flash message={query.error} />
      {query.saved ? <p className="ok">Stripe account saved.</p> : null}
      <section className="card stack">
        <h2>Your Stripe account</h2>
        <p className="muted">
          Charges are created as direct charges on this account. StudioFlat does not add a platform fee.
          {connected ? " A test secret is configured on the server." : " Add STRIPE_SECRET_KEY on the server before a card can be taken."}
        </p>
        <form className="grid-form" action={saveStripeAction}>
          <Field
            label="Connected account id"
            name="stripeAccount"
            defaultValue={studio.stripe_account_id ?? ""}
            placeholder="acct_"
            hint="From your Stripe dashboard. Leave blank to charge the platform test account with a zero fee."
          />
          <button className="btn btn-primary" type="submit">
            Save Stripe account
          </button>
        </form>
      </section>
      <section className="card stack">
        <h2>Close the studio</h2>
        <p className="muted">Deletes the schedule, members, passes, and payments stored here. This cannot be undone.</p>
        <form action={deleteStudioAction}>
          <button className="btn btn-danger" type="submit">
            Delete studio
          </button>
        </form>
      </section>
    </div>
  );
}
