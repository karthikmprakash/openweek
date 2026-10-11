import Link from "next/link";
import { Brand } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="site-shell">
      <header className="marketing-nav">
        <Brand />
        <nav className="row" aria-label="Account" style={{ gap: 8 }}>
          <Link className="btn btn-ghost btn-sm" href="/login">
            Log in
          </Link>
          <Link className="btn btn-primary btn-sm" href="/signup">
            Open a studio
          </Link>
        </nav>
      </header>

      <main id="main">
        <section className="hero-morph" aria-label="Openweek">
          <div className="hero-copy">
            <p className="brand-mark">Openweek</p>
            <h1>Book the class. Keep the payment.</h1>
            <p className="lede">
              Schedule, packs, waitlists, and reminders for a reformer room, a yoga shala, or a small box. Your Stripe
              account. Our cut is $0.
            </p>
            <div className="row">
              <Link className="btn btn-primary btn-lg" href="/signup">
                Start on the Micro plan
              </Link>
              <Link className="btn btn-secondary btn-lg" href="/s/northline">
                Try a live week
              </Link>
            </div>
          </div>

          <div className="hero-preview" aria-hidden="true">
            <div className="preview-panel">
              <div className="preview-meta">
                <span>Northline Room</span>
                <span>This week</span>
              </div>
              <h3>Member schedule</h3>
              <div className="preview-rows">
                <div className="preview-row">
                  <span>7:00 AM</span>
                  <strong>Reformer foundations</strong>
                  <span className="preview-chip">8 left</span>
                </div>
                <div className="preview-row">
                  <span>9:00 AM</span>
                  <strong>Mat flow</strong>
                  <span className="preview-chip">12 left</span>
                </div>
                <div className="preview-row">
                  <span>5:30 PM</span>
                  <strong>Barre strength</strong>
                  <span className="preview-chip">9 left</span>
                </div>
              </div>
            </div>
            <div className="preview-panel preview-panel-offset">
              <div className="preview-meta">
                <span>Guest drop-in</span>
                <span>No account</span>
              </div>
              <h3>Reserve in one screen</h3>
              <p className="preview-copy">Name, email, confirm. Passes apply automatically when the email matches.</p>
            </div>
          </div>
        </section>

        <div className="wrap">
          <section className="section" aria-label="Pricing">
            <div className="section-head">
              <h2>One monthly price</h2>
              <p className="lede">Two plans. Same product. No percentage on your drop-ins.</p>
            </div>
            <div className="price-morph">
              <article className="price-panel glass-strong featured">
                <p className="feature-kicker">Most studios</p>
                <h3>Studio</h3>
                <p className="price">
                  $49<span className="price-unit">/mo</span>
                </p>
                <p className="muted">Unlimited members and classes, one location. Two months free on annual.</p>
                <div>
                  <Link className="btn btn-light" href="/signup">
                    Start on Studio
                  </Link>
                </div>
              </article>
              <article className="price-panel glass">
                <p className="feature-kicker">Start here</p>
                <h3>Micro</h3>
                <p className="price">
                  $29<span className="price-unit">/mo</span>
                </p>
                <p className="muted">One instructor, under 50 members. Same annual break.</p>
                <div>
                  <Link className="btn btn-secondary" href="/signup">
                    Start on Micro
                  </Link>
                </div>
              </article>
            </div>
          </section>

          <section className="section">
            <div className="fee-band glass-strong">
              <div>
                <p className="feature-kicker">Platform cut</p>
                <p className="fee-stat">$0</p>
              </div>
              <div>
                <h2>The fee, counted honestly</h2>
                <p className="lede" style={{ margin: "12px 0 0" }}>
                  A studio that runs $8,000 a month through cards still pays its processor. A typical extra platform cut
                  of about one percent is $80 on that volume. At $25,000 it is about $250. Openweek’s cut is $0. The
                  subscription is the only price we charge.
                </p>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <h2>What owners open every morning</h2>
              <p className="lede" style={{ margin: 0 }}>
                The same tools, without the cluttered dashboard tax.
              </p>
            </div>
            <div className="feature-morph">
              <article className="glass">
                <p className="feature-kicker">Schedule</p>
                <h3>Publish a week</h3>
                <p className="muted" style={{ margin: 0 }}>
                  Members open a link, see the spots left, and reserve a drop-in without making an account.
                </p>
              </article>
              <article className="glass">
                <p className="feature-kicker">Passes</p>
                <h3>Passes that expire</h3>
                <p className="muted" style={{ margin: 0 }}>
                  Packs, memberships, and single credits. An expired visit cannot be spent.
                </p>
              </article>
              <article className="glass">
                <p className="feature-kicker">Policies</p>
                <h3>Policies that run themselves</h3>
                <p className="muted" style={{ margin: 0 }}>
                  Set the cancellation window. A late cancel applies the fee or the credit rule you chose.
                </p>
              </article>
              <article className="glass">
                <p className="feature-kicker">Migration</p>
                <h3>Bring the roster with you</h3>
                <p className="muted" style={{ margin: 0 }}>
                  Import members and remaining balances from a CSV. Bad rows are listed, never dropped quietly.
                </p>
              </article>
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <h2>Questions owners actually ask</h2>
            </div>
            <div className="faq">
              <details>
                <summary>Do I have to create a member account to sell a drop-in?</summary>
                <p>No. Name and email are enough. A pass is there later if they want one.</p>
              </details>
              <details>
                <summary>Can people install it on a phone?</summary>
                <p>Yes. The member schedule installs from the browser. There is no separate branded app store product in this version.</p>
              </details>
              <details>
                <summary>Who charges the card?</summary>
                <p>Your Stripe account does. We never set a platform fee on the payment.</p>
              </details>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
