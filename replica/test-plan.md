# Test plan

Automated cases live in `tests/` and `e2e/`. Browser pass used Playwright against `next start`.

| id | case | result |
| --- | --- | --- |
| F01-H1 | Publish a class, guest reserves, spots drop, no staff row for the guest | pass, e2e/booking.spec.ts |
| F01-E1 | Same email cannot hold two live spots | pass, tests/booking.test.ts |
| F01-E2 | Other studio cannot see the session | pass |
| F01-E3 | Pacific winter and summer wall times | pass |
| F02-H1 | Pack, drop-in, and membership deduct or stay unlimited | pass, tests/credits.test.ts |
| F02-E1 | Exact expiry rejects, 1ms before accepts | pass |
| F03-H1 | Stripe SDK body has no application fee; stored fee is null | pass, tests/payments.test.ts |
| F03-E1 | Webhook signature and duplicate event | pass |
| F04-H1 | Self and staff check-in, second call same row | pass, tests/attendance.test.ts and e2e/checkin.spec.ts |
| F05-H1 | One reminder, second run sends nothing, opt-out skipped | pass, tests/reminders.test.ts |
| F06-H1 | Promote in order, notify, claim, then timeout the next offer | pass, tests/waitlist.test.ts |
| F07-H1 | Early cancel returns a credit; inside the window charges the fee | pass, tests/policy.test.ts |
| F07-E1 | Extra credit rule and no-show fee | pass |
| F08-H1 | Grouped total equals ledger; 14-day expiry list; email once | pass, tests/reports.test.ts |
| F09-H1 | Dry run writes nothing; bad lines reported; balances match | pass, tests/import.test.ts |
| F10-H1 | Manifest icons, offline reload, 375px overflow | pass, e2e/pwa.spec.ts |
| F01-A11y | axe on the public week | pass, no violations |
| Auth-N1 | Wrong password rejected, rate limit, delete studio | pass, tests/auth.test.ts |

Not run: a charge against api.stripe.com (no test secret in the environment), a real Resend delivery, a phone installed to the home screen outside Playwright.
