import type { Metadata } from "next";
import { ActionForm, CopyButton, SubmitButton, TypeToConfirm } from "@/components/forms";
import { Field, Notice, PageHeader } from "@/components/ui";
import { getDb } from "@/lib/db";
import { getStudio } from "@/lib/schedule";
import { deleteStudioAction, saveStripeAction } from "@/server/actions";
import { currentStaff } from "@/server/session";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const staff = await currentStaff();
  if (!staff) return null;
  const query = await searchParams;
  const studio = getStudio(getDb(), staff.studioId);
  const serverReady = Boolean(process.env.STRIPE_SECRET_KEY);

  return (
    <div className="stack">
      <PageHeader title="Settings" />
      <Notice message={query.saved ? "Stripe account saved." : undefined} />

      <section className="card stack-sm" aria-labelledby="stripe-title">
        <div className="row-between">
          <h2 className="card-title" id="stripe-title">
            Card payments with your Stripe
          </h2>
          <span className={`pill ${studio.stripe_account_id && serverReady ? "pill-ok" : "pill-warn"}`}>
            {studio.stripe_account_id && serverReady ? "Connected" : "Not connected"}
          </span>
        </div>
        <p className="muted">
          Members pay straight into your own Stripe account. Openweek never adds a platform fee. You pay only Stripe’s normal processing.
        </p>
        {!serverReady ? (
          <p className="help">Card payments also need a Stripe secret key on the server. Until then, members can still reserve free classes and use passes.</p>
        ) : null}
        <ActionForm action={saveStripeAction} className="grid-form">
          <Field
            label="Stripe account ID"
            name="stripeAccount"
            defaultValue={studio.stripe_account_id ?? ""}
            placeholder="acct_…"
            autoComplete="off"
            spellCheck={false}
            hint="Find it in your Stripe dashboard under Settings → Account details. It starts with acct_."
          />
          <div>
            <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
          </div>
        </ActionForm>
      </section>

      <section className="card stack-sm" aria-labelledby="studio-title">
        <h2 className="card-title" id="studio-title">
          Studio
        </h2>
        <dl className="details">
          <div>
            <dt>Name</dt>
            <dd>{studio.name}</dd>
          </div>
          <div>
            <dt>Member link</dt>
            <dd className="settings-link">
              <span>/s/{studio.slug}</span>
              <CopyButton text={`/s/${studio.slug}`} label="Copy" />
            </dd>
          </div>
          <div>
            <dt>Owner login</dt>
            <dd>{staff.email}</dd>
          </div>
        </dl>
      </section>

      {staff.role === "owner" ? (
        <section className="card stack-sm danger-zone" aria-labelledby="close-title">
          <h2 className="card-title" id="close-title">
            Close the studio
          </h2>
          <p className="muted">
            Permanently deletes the schedule, members, passes, bookings, and payment records stored here. Your Stripe account is not touched. This can’t be undone.
          </p>
          <ActionForm action={deleteStudioAction} className="grid-form">
            <TypeToConfirm expected={studio.slug} label={`Type ${studio.slug} to confirm`} button="Delete studio forever" />
          </ActionForm>
        </section>
      ) : null}
    </div>
  );
}
