import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/forms";
import { MemberGrantFields } from "@/components/member-grant";
import { EmptyState, Field, PageHeader } from "@/components/ui";
import { listMembers, listProducts, type ProductKind } from "@/lib/credits";
import { getDb } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { createPassAction, grantPassAction } from "@/server/actions";
import { currentStaff } from "@/server/session";

export const metadata: Metadata = { title: "Passes" };

const KIND: Record<ProductKind, string> = { drop_in: "Single visit", pack: "Class pack", membership: "Membership" };

export default async function OfferingsPage() {
  const staff = await currentStaff();
  if (!staff) return null;
  const db = getDb();
  const now = new Date();
  const products = listProducts(db, staff.studioId);
  const members = listMembers(db, staff.studioId, now);
  const holders = new Map(
    (
      db
        .prepare(
          `SELECT product_id, COUNT(*) AS c FROM entitlements
           WHERE studio_id = ? AND expires_at > ? AND (unlimited = 1 OR credits_remaining > 0)
           GROUP BY product_id`,
        )
        .all(staff.studioId, now.toISOString()) as Array<{ product_id: string; c: number }>
    ).map((row) => [row.product_id, row.c]),
  );

  return (
    <div className="stack">
      <PageHeader
        title="Passes"
        description="Sell visits ahead of time. When a member books with the same email, their pass is used automatically, soonest-expiring first."
      />

      <div className="split">
        <section className="card stack-sm" aria-labelledby="new-pass">
          <h2 className="card-title" id="new-pass">
            New pass
          </h2>
          <ActionForm action={createPassAction} className="grid-form pass-form">
            <label className="field">
              <span>Kind</span>
              <select name="kind" defaultValue="pack">
                <option value="pack">Class pack: a set number of visits</option>
                <option value="membership">Membership: unlimited visits until it ends</option>
                <option value="drop_in">Single visit: one class</option>
              </select>
            </label>
            <Field label="Name" name="name" required minLength={2} maxLength={60} placeholder="e.g. 10-class pack" />
            <div className="grid-2">
              <Field label="Price" name="price" inputMode="decimal" prefix="$" placeholder="0.00" />
              <Field label="Valid for" name="days" type="number" min={1} max={730} defaultValue={90} suffix="days" required />
            </div>
            <Field className="only-pack" label="Visits in the pack" name="credits" type="number" min={1} max={200} defaultValue={10} />
            <div>
              <SubmitButton pendingLabel="Saving…">Save pass</SubmitButton>
            </div>
          </ActionForm>
        </section>

        <section className="card stack-sm" aria-labelledby="give-pass">
          <h2 className="card-title" id="give-pass">
            Give a pass to a member
          </h2>
          {products.length === 0 ? (
            <p className="muted">Save a pass first. Then you can give it to anyone by email.</p>
          ) : (
            <ActionForm action={grantPassAction} className="grid-form">
              <label className="field">
                <span>Pass</span>
                <select name="productId" required>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} · {formatMoney(product.price_cents)}
                    </option>
                  ))}
                </select>
              </label>
              <MemberGrantFields members={members.map((member) => ({ id: member.id, name: member.name, email: member.email }))} />
              <div>
                <SubmitButton className="btn btn-secondary" pendingLabel="Adding…">
                  Give pass
                </SubmitButton>
              </div>
            </ActionForm>
          )}
        </section>
      </div>

      <section className="stack-sm" aria-labelledby="pass-list">
        <h2 className="section-title" id="pass-list">
          Your passes
        </h2>
        {products.length === 0 ? (
          <EmptyState title="No passes yet">A 10-class pack and a monthly membership cover most small studios.</EmptyState>
        ) : (
          <ul className="list-card">
            {products.map((product) => (
              <li key={product.id}>
                <div className="list-row">
                  <span className="list-main">
                    <strong>{product.name}</strong>
                    <span className="muted">
                      {KIND[product.kind]} · {product.kind === "membership" ? "unlimited visits" : `${product.credit_count} visit${product.credit_count === 1 ? "" : "s"}`} · valid {product.validity_days} days
                    </span>
                  </span>
                  <span className="list-end">
                    <span className="tag">{formatMoney(product.price_cents)}</span>
                    <span className="muted">{holders.get(product.id) ?? 0} active</span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
