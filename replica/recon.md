# Recon map — class booking for a small studio

Reference observed: the market leader's public business pricing page (fetched 2026-10-10) and the public jobs in `PRD.md`. Secondary products were not logged into. No private APIs, bundles, or accounts were used. Layout screenshots of the reference were not saved; their pixels are not an input to this product.

This file is also `replica/recon.md`.

## Sources

| source | what it gave | url | read on |
| --- | --- | --- | --- |
| Business pricing page | Entry price stated as $79 USD/month in North America and Asia. Self-serve booking, reminders, late-cancel and no-show fees, membership renewal, and a consumer marketplace are sold as the package. Processing is described as a rate plus $0.10–$0.30, not as "we take nothing". | https://www.mindbodyonline.com/business/pricing | 2026-10-10 |
| PRD competitor table | Published prices and the ~1% fee gap. Used as the scope fence, not as copy. | `PRD.md` | 2026-10-10 |
| App Store review RSS | What members and staff complain about. See `replica/reviews.csv`. | https://itunes.apple.com/us/rss/customerreviews/id=689501356/sortBy=mostRecent/json and id=599125654 | 2026-10-10 |

Hacker News comments for the product name were mostly unrelated (mind/body as a phrase). They were not treated as reviews. Reddit, G2, and Play were not collected: no public feed was read in this session.

## Slice

Owner-operator, one location, under 150 members. The loop they pay for: publish a week, let a person reserve and pay without an account, apply the studio's own cancel rule, and see the money.

Out of the slice, on purpose: consumer marketplace, branded native app, payroll, retail, door hardware, multi-location, marketing funnels.

## Screens

| ID | screen | route | purpose | states |
| --- | --- | --- | --- | --- |
| S01 | Landing | `/` | Price and the fee story | filled |
| S02 | Sign up | `/signup` | Create the studio and owner | empty, error |
| S03 | Log in | `/login` | Owner session | empty, error |
| S04 | Home | `/studio` | Month revenue, expiring passes, next bookings | empty, filled |
| S05 | Schedule | `/studio/schedule` | Publish a class and add sessions | empty, filled, error |
| S06 | Passes | `/studio/offerings` | Drop-in, pack, membership | empty, filled |
| S07 | Member week | `/s/[slug]` | Phone schedule | empty, filled |
| S08 | Reserve | `/s/[slug]/book/[sessionId]` | Guest name and email, or waitlist, or card | open, full, error |
| S09 | Confirmation | `/b/[token]` | Result, check-in, cancel, reminder opt-out | confirmed, offer, cancelled |
| S10 | Roster | `/studio/check-in` | Staff check-in | empty, filled |
| S11 | Policies | `/studio/policies` | Window, fee, credit, reminders, claim time | saved, error |
| S12 | Reports | `/studio/reports` | Class, membership, expiring list | empty, filled |
| S13 | Import | `/studio/import` | Map columns, dry run, bad rows | preview, imported, error |
| S14 | Members | `/studio/members` | Roster and opt-out | empty, filled |
| S15 | Settings | `/studio/settings` | Stripe account id, delete studio | saved, error |
| S16 | Interface | `/design` | Button and field states | filled |

## Flows

```
F01 Guest reserves a drop-in
    S05 publish -> S07 week -> S08 name and email -> S09 confirmation
    clicks on the happy path after the schedule exists: 3 (open class, reserve, submit)
    edge: class full, duplicate email, class already started, price set and no pass

F02 Guest pays with the studio's Stripe
    S08 Pay and reserve -> direct charge, no application fee -> S09
    edge: Stripe secret missing, class fills during the charge

F03 Pass is spent
    S06 create pass and give it -> S08 reserve -> credit decremented
    edge: exact expiry instant, zero visits left, membership does not decrement

F04 Waitlist
    S08 full -> join -> S05/S09 cancel -> first person offered -> claim or timeout
    edge: claim after the window, two people waiting

F05 Late cancel
    S09 cancel -> outcome sentence immediately
    edge: exactly at the window, one millisecond inside it, fee vs extra credit vs forfeit

F06 Check-in
    S09 I'm here, and S10 staff button
    edge: second tap does not create a second row

F07 Reminders
    lead hours on S11, job sends once, opt-out on S09 skips

F08 Month report
    S12 totals equal the ledger; expiring list; one email action

F09 Import
    S13 dry run then import; bad lines listed
```

## Components

Button (primary, secondary, ghost, danger; sm/md/lg; disabled), text field, select, textarea, alert, success note, card, spot count, top bar, studio nav, data table, skeleton.

## Inferred data model

```
Studio        slug, timezone, cancel window, late mode, fees, claim minutes, reminder lead, stripe account id
Staff         email, password hash, role owner|instructor
Member        name, email, phone, email opt-out. No password for a drop-in.
Class type    name, duration, capacity, drop-in price
Session       starts_at, ends_at, capacity, status
Product       drop_in|pack|membership, price cents, credit count, validity days
Entitlement   credits remaining or unlimited, expires_at
Booking       guest, status, manage token, entitlement used
Payment       amount cents, application fee null or 0, stripe payment intent id
Attendance    one row per booking, method self|staff
Waitlist      position, offered until, booking hold
Notification  idempotency key, sent or skipped_opt_out
Policy outcome  kind, fee, credit delta, message
```

Confidence is high for the booking, pass, and payment entities because the acceptance tests name them. Marketplace profiles and retail carts are guesses we refused to build.

## Cannot be cloned

| item | why |
| --- | --- |
| Consumer marketplace and its members | their network |
| Brand, logo, icons, fonts, and marketing sentences | theirs |
| Native branded app | PRD excludes it |
| Payroll, POS, door hardware, franchises | PRD excludes them |
| Their payment facilitation | the product is bring-your-own Stripe |

## Size

M. About 16 screens, 9 flows, 12 entities. Hard parts: capacity races, expiry boundaries, fee-free Stripe charges, waitlist claim windows, report/ledger equality. Next: architecture.
