# Decisions log

Every choice made without asking the human goes here: decision, alternatives rejected, why.
Ambiguity is not a reason to stop; it is a reason to write an entry and continue.

| # | date | decision | alternatives rejected | why |
|---|------|----------|----------------------|-----|
| 1 | 2026-10-10 | Next.js 16, SQLite, scrypt sessions | Supabase, Postgres, a hosted auth vendor | The suite has to run with no third-party account. |
| 2 | 2026-10-10 | Guest drop-in creates a member row and no password | Forcing signup before a drop-in | The acceptance test is "no account". The row is how passes and opt-out attach later. |
| 3 | 2026-10-10 | A credit is usable only while `now < expires_at` | Inclusive end date | The boundary test needs one instant that fails. |
| 4 | 2026-10-10 | Late fee returns the visit and posts a ledger fee. Credit mode spends one extra visit. Forfeit keeps the visit and charges nothing. | One blended penalty | The PRD says fee or credit, as alternatives. |
| 5 | 2026-10-10 | Direct Stripe charges. `application_fee_amount` is never sent. SQL rejects any other fee. | Destination charges with a fee, or storing the studio's secret key | A pasted secret key is a worse risk than an `acct_` id. |
| 6 | 2026-10-10 | Payment tests drive the real Stripe SDK against a local HTTP peer | Marking F3 blocked for a missing key, which would also block policy and reports | No test secret was in the environment. The request body and the stored fee are still asserted. A live call to api.stripe.com is not claimed. |
| 7 | 2026-10-10 | Reminders land in the notifications table | Pretending Resend sent mail | No email key. Opt-out and idempotency are real rows. |
| 8 | 2026-10-10 | One staff email, one studio | Multi-studio logins | The target user has one room. |
| 9 | 2026-10-10 | Landing page does not name competitors | Putting their trademarks next to our price | The comparison with citations is in `replica/launch/pricing.md`. The page states the $80 delta. |
| 10 | 2026-10-10 | Waitlist claim confirms the held spot and spends a pass if one exists | Requiring a card inside the claim window | The offer already reserved the spot. Card capture at claim needs a key the suite does not have. |
| 11 | 2026-10-10 | Cookie `Secure` only when `COOKIE_SECURE=1` | Always secure | Playwright and local HTTP would drop the session. |
| 12 | 2026-10-10 | Import column names are ours (`product_kind`, `credits_remaining`, `expires_at`) | Copying another product's export template | Clean room. Owners map headers in the form. |
