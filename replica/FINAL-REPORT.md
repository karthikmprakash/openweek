# Openweek final report

2026-10-10. `tools/verify.sh` exited 0. All 10 features are `verified`.

## 1. Status

| ID | name | status | verify command |
| --- | --- | --- | --- |
| F1 | Class schedule and member booking | verified | `npx playwright test e2e/booking.spec.ts` |
| F2 | Memberships, class packs, drop-ins, expiring credits | verified | `npx vitest run tests/credits.test.ts` |
| F3 | Bring-your-own Stripe, no platform percentage | verified | `npx vitest run tests/payments.test.ts` |
| F4 | Attendance and check-in | verified | `npx playwright test e2e/checkin.spec.ts` |
| F5 | Automated reminders | verified | `npx vitest run tests/reminders.test.ts` |
| F6 | Waitlist with auto-promotion | verified | `npx vitest run tests/waitlist.test.ts` |
| F7 | Late-cancel / no-show policy automation | verified | `npx vitest run tests/policy.test.ts` |
| F8 | Revenue reporting | verified | `npx vitest run tests/reports.test.ts` |
| F9 | Free CSV migration/import | verified | `npx vitest run tests/import.test.ts` |
| F10 | PWA member experience | verified | `npx playwright test e2e/pwa.spec.ts` |

`npm test` also ran the full unit suite (18) and all three Playwright specs. Contrast: 15 pairs, 0 AA failures.

## 2. Evidence

Receipts, including command output, are in `replica/EVIDENCE.md`. A feature is verified only because `tools/record.py` saw exit code 0.

## 3. Blocked

Nothing is blocked. No credential was required to finish the suite.

What the human still has to supply before a real studio can take a card or send mail:

- `STRIPE_SECRET_KEY` (test mode) and, for webhooks, `STRIPE_WEBHOOK_SECRET`
- The studio's `acct_` id in Settings
- `RESEND_API_KEY` and `EMAIL_FROM` if reminders should leave the machine
- `JOB_SECRET` if a scheduler should call `POST /api/jobs/run`
- `COOKIE_SECURE=1` behind HTTPS
- A domain, when they want deploy (not done here)

## 4. Deviations

- F3 did not call `api.stripe.com`. No test secret was in the environment. The production charge function and the Stripe SDK built the PaymentIntent request; a local HTTP peer recorded it. The body has no `application_fee`, the `Stripe-Account` header is set, and the stored fee is null. A live test-card charge is still required before telling a studio the path is proven against Stripe.
- Reminders are rows in `notifications` (`sent` or `skipped_opt_out`). They are not delivered by an email provider.
- The $29 / $49 subscription is on the landing page and in `replica/launch/pricing.md`. The app does not bill the studio yet, so there is no auto-renew to cancel. Deleting the studio is one button.
- The landing page does not name competitors. Citations are in `replica/launch/pricing.md`. Several of those prices were taken from the PRD and were not re-fetched, except the market leader's $79 entry price, which was read on 2026-10-10.
- Waitlist claim confirms the held spot and spends a pass if one exists. It does not run a card charge inside the claim window.
- Import uses our column names. The owner maps headers. It does not parse another product's export layout.
- Layout parity against the reference was not scored. No reference screenshots were kept.
- Review research is 150 App Store reviews from two listings. Hacker News did not return product reviews. Reddit, Play, and G2 were not read.

## 5. How to run

```bash
npm install
npm run build
npm start
```

App: http://127.0.0.1:3000. Create a studio at `/signup`. Database: `data/openweek.db` (override with `OPENWEEK_DB`).

```bash
npm run test:unit
npx playwright test
npm test
bash tools/verify.sh
```

Playwright starts `next start` on port 3456 and needs the production build. Copy `.env.example` to `.env.local` and fill values yourself. Do not commit that file.

## 6. Known weaknesses

- Card payment is not proven against Stripe's API. The fee rule is proven on the request we build and on the database check.
- Email and SMS do not leave the process. SMS is not implemented; the channel exists on the notification row and is unused.
- `npm install` reported 5 high severity issues in the tree. They were not patched.
- SQLite is one file. It will not serve two app servers. There are no hosted backups.
- One staff email can own only one studio.
- A paid drop-in with no pass cannot be reserved until the card path runs. If Stripe is unset, that button fails with a clear error. Free classes and passes work.
- The service worker caches the schedule only after it controls the page. The first visit is online.
- Trademark, domain, and store-name checks for Openweek are in `replica/brand.md`. Official office searches still to run.
- No calendar invite file and no Google Calendar sync, which showed up in the reviews.
- The owner UI is usable, not polished. Long names wrap. There is no instructor permission split beyond the role column.

## 7. What to build next

1. One live Stripe test-mode charge and a checked webhook, with the dashboard showing a null application fee.
2. A calendar file on the confirmation, then Google Calendar, because the reviews ask for sync that does not need a manual push.
3. Billing for the studio's own $29 or $49 plan, with a one-click cancel, once a Stripe account exists. Do not add a percentage.
