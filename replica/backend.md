# Backend checklist

- [x] secrets only in env vars, `.env.example` has names and no values, `.env*` gitignored
- [x] server actions validate with zod or explicit checks
- [x] studio id comes from the session or the slug, and queries filter on it (`tests/booking.test.ts`)
- [x] rate limits on signup, login, and guest reserve
- [x] Stripe webhook verifies the signature and stores the event id (`tests/payments.test.ts`)
- [x] CSV import rejects files over 1 MB
- [x] passwords are scrypt hashes; session cookie stores a random token, the database stores its sha256
- [x] no platform fee column value other than null or 0, enforced in SQL
- [x] owner can delete the studio
- [ ] `npm audit` reports 5 high severity issues in the dependency tree (not triaged into a fix that keeps Next 16). See the final report.
- [ ] Resend is not wired. The outbox is the send log until `RESEND_API_KEY` exists.
- [ ] Daily backups are the operator's job. SQLite file is `OPENWEEK_DB` or `data/openweek.db`.

Stripe: direct charges with the `Stripe-Account` header when an `acct_` id is saved. `application_fee_amount` is absent from the create params. A non-zero fee on the response is refused.

Jobs: `POST /api/jobs/run` with header `x-job-secret` matching `JOB_SECRET`. The route stays 403 when the secret is unset.
