import { Flash, Field } from "@/components/ui";
import { listProducts } from "@/lib/credits";
import { getDb } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { createPassAction, grantPassAction } from "@/server/actions";
import { currentStaff } from "@/server/session";

export default async function OfferingsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const staff = await currentStaff();
  if (!staff) return null;
  const query = await searchParams;
  const products = listProducts(getDb(), staff.studioId);
  return (
    <div className="stack">
      <h1>Passes</h1>
      <p className="muted">A drop-in is one visit. A pack is a set number. A membership is unlimited until it expires.</p>
      <Flash message={query.error} />
      <form className="card grid-form" action={createPassAction}>
        <label className="field">
          <span>Kind</span>
          <select name="kind" defaultValue="pack">
            <option value="drop_in">Drop-in</option>
            <option value="pack">Class pack</option>
            <option value="membership">Membership</option>
          </select>
        </label>
        <Field label="Name" name="name" required />
        <Field label="Price" name="price" inputMode="decimal" placeholder="160" />
        <Field label="Visits in a pack" name="credits" type="number" min={1} defaultValue={8} hint="Ignored for memberships and drop-ins." />
        <Field label="Valid for days" name="days" type="number" min={1} defaultValue={90} required />
        <button className="btn btn-primary" type="submit">
          Save pass
        </button>
      </form>
      {products.length === 0 ? <p className="muted">No passes yet.</p> : null}
      {products.map((product) => (
        <article className="card" key={product.id}>
          <h2>{product.name}</h2>
          <p className="muted">
            {product.kind} · {formatMoney(product.price_cents)} ·{" "}
            {product.kind === "membership" ? "unlimited" : `${product.credit_count} visits`} · {product.validity_days} days
          </p>
          <form className="grid-form" action={grantPassAction}>
            <input type="hidden" name="productId" value={product.id} />
            <Field label="Member name" name="guestName" required />
            <Field label="Email" name="email" type="email" required />
            <button className="btn btn-secondary" type="submit">
              Give this pass
            </button>
          </form>
        </article>
      ))}
    </div>
  );
}
