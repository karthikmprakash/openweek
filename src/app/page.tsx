import Link from "next/link";
import { Brand } from "@/components/ui";

export default function HomePage() {
  return (
    <>
      <header className="topbar">
        <div className="wrap" style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
          <Brand />
          <nav className="nav" aria-label="Account">
            <Link href="/login">Log in</Link>
            <Link className="btn btn-primary" href="/signup">
              Open a studio
            </Link>
          </nav>
        </div>
      </header>
      <main id="main" className="wrap hero">
        <p className="muted" style={{ fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", fontSize: 12 }}>
          For studios under 150 members
        </p>
        <h1>Book the class. Keep the payment.</h1>
        <p className="lede">
          Schedule, packs, waitlists, and reminders for a reformer room, a yoga shala, a barre studio, or a small box.
          You bring your own Stripe account. StudioFlat adds $0 on top.
        </p>
        <div className="row">
          <Link className="btn btn-primary btn-lg" href="/signup">
            Start on the Micro plan
          </Link>
          <Link className="btn btn-secondary btn-lg" href="/design">
            See the interface
          </Link>
        </div>
        <section className="grid-2" aria-label="Pricing">
          <article className="card">
            <h2>Micro</h2>
            <p className="price">$29</p>
            <p className="muted">per month, for one instructor and under 50 members. Two months free on an annual plan.</p>
          </article>
          <article className="card">
            <h2>Studio</h2>
            <p className="price">$49</p>
            <p className="muted">per month, unlimited members and classes, still one location. Same annual break.</p>
          </article>
        </section>
        <section className="card stack">
          <h2>The fee, counted honestly</h2>
          <p>
            A studio that runs $8,000 a month through cards still pays its processor. A typical extra platform cut of about
            one percent is $80 on that volume, not the whole processor bill. At $25,000 it is about $250. StudioFlat’s
            cut is $0. The subscription is the only price we charge.
          </p>
        </section>
        <section className="grid-2">
          <article className="card">
            <h3>Publish a week</h3>
            <p className="muted">Members open a link, see the spots left, and reserve a drop-in without making an account.</p>
          </article>
          <article className="card">
            <h3>Passes that expire</h3>
            <p className="muted">Packs, memberships, and single credits. An expired visit cannot be spent.</p>
          </article>
          <article className="card">
            <h3>Policies that run themselves</h3>
            <p className="muted">Set the cancellation window. A late cancel applies the fee or the credit rule you chose.</p>
          </article>
          <article className="card">
            <h3>Bring the roster with you</h3>
            <p className="muted">Import members and remaining balances from a CSV. Bad rows are listed, never dropped quietly.</p>
          </article>
        </section>
        <section className="stack">
          <h2>Questions owners actually ask</h2>
          <h3>Do I have to create a member account to sell a drop-in?</h3>
          <p className="muted">No. Name and email are enough. A pass is there later if they want one.</p>
          <h3>Can people install it on a phone?</h3>
          <p className="muted">Yes. The member schedule installs from the browser. There is no separate branded app store product in this version.</p>
          <h3>Who charges the card?</h3>
          <p className="muted">Your Stripe account does. We never set a platform fee on the payment.</p>
        </section>
      </main>
    </>
  );
}
