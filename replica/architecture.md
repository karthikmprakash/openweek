# Architecture: StudioFlat

A single Next.js app. One SQLite file. No microservices.

## Stack

| layer | choice | why |
| --- | --- | --- |
| web | Next.js 16 App Router, TypeScript, React 19 | Boring, documented, one deployable. Member pages are server-rendered. |
| styling | CSS variables from `replica/design/tokens.css`, Tailwind v4 theme mapping | Roles, not raw hex, in the components. |
| database | SQLite via better-sqlite3 | Tests and a local studio run with no hosted database credential. |
| ORM | SQL in `src/lib`, schema in `src/lib/schema.ts` and `replica/schema.sql` | The constraints (partial unique index, fee check) are the product. |
| auth | scrypt password hash, sha256 session token, httpOnly cookie | No third-party auth account required to develop. |
| payments | Stripe PaymentIntents as direct charges. `application_fee_amount` is never set. | The studio's account is the merchant. |
| email | Local `notifications` outbox. Resend is named in `.env.example` and not called without a key. | Reminder idempotency is testable offline. |
| jobs | `runJobs` plus `POST /api/jobs/run` when `JOB_SECRET` is set | Reminders, offer expiry, no-shows. |
| hosting | Not deployed. `next build` / `next start`. | Deploy waits for a domain. |

## Schema

Tables: studios, staff, auth_sessions, members, class_types, class_sessions, products, entitlements, bookings, payments, attendance, waitlist, notifications, policy_outcomes, stripe_events, rate_limits, import_runs.

Access: every read and write takes a `studio_id` from the session or the public slug, and the SQL filters on it. There is no row-level security extension in SQLite. A second studio's id returns no rows. Tested in `tests/booking.test.ts`.

Money is integer cents. Times are ISO-8601 UTC text, which sorts correctly. The partial unique index `bookings_one_active` stops two live spots for the same email in one session. `payments.application_fee_cents` may only be null or 0.

Full SQL: `replica/schema.sql`.

## API

| method path | does | who | flow |
| --- | --- | --- | --- |
| POST signup action | create studio, owner, session | public | S02 |
| POST login action | session cookie | public | S03 |
| POST publish / add session | class type and session | owner | F01 |
| POST reserve | guest booking, optional credit | public | F01 F03 |
| POST pay and reserve | direct charge then booking | public | F02 |
| POST waitlist / claim / cancel | waitlist and policy | public with manage token | F04 F05 |
| POST check-in | self (token) or staff (session) | member or staff | F06 |
| POST policies, stripe, delete | studio settings | owner | S11 S15 |
| POST import | dry run or write | owner | F09 |
| POST email expiring | queue renewal notes | owner | F08 |
| POST /api/stripe/webhook | verify signature, store event id, idempotent | Stripe | F02 |
| POST /api/jobs/run | reminders, expire offers, no-shows | `JOB_SECRET` | F07 F04 F05 |

## The parts that bite

- Time zones: wall-clock `datetime-local` is converted with `zonedLocalToUtc`. January and July Pacific offsets are tested.
- Idempotency: notification keys, Stripe event ids, payment idempotency keys, attendance unique on booking.
- Races: capacity is counted inside a SQLite transaction. A card that succeeds after the class fills is refunded.
- Offline: the member service worker caches `/s/` and `/b/` after it controls the page.
- Multi-tenancy: staff email is unique globally in v1 (one studio per login). Logged in decisions.
- GDPR-style deletion: the owner can delete the studio and the rows that belong to it.

## Build order

1. Vertical slice: S02, S05, S07, S08, S09. Tables studios, staff, class_types, class_sessions, bookings, members.
2. Must-haves: passes, Stripe, check-in, reminders, waitlist, policy, reports, import, PWA.
3. Should-haves in the same release: no-show rule, expiring-credit email, dry run.
4. Fixes from reviews: visible cancel outcome, opt-out, account deletion, no platform fee, expiry shown by refusing expired credits.

Next was design, then the app under `src/`.
