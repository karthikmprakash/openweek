# Build log

| screen | date | status | note |
| --- | --- | --- | --- |
| S01 | 2026-10-10 | done | Fee math uses the PRD's $80 example, no fake proof |
| S02 S03 | 2026-10-10 | done | Session cookie, rate limit |
| S04–S06 | 2026-10-10 | done | Schedule, passes, home |
| S07 S08 S09 | 2026-10-10 | done | Guest reserve, axe clean, 375px |
| S10 | 2026-10-10 | done | Staff roster |
| S11–S15 | 2026-10-10 | done | Policy, reports, import, members, settings |
| S16 | 2026-10-10 | done | Primitive states |

Harder than it looked: Stripe's current Node types renamed `payment_method_types` to `allowed_payment_method_types`, and `redirect()` inside `try/catch` would have swallowed the success navigation.
