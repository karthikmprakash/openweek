# Bugs

No open S1 or S2 from the automated pass on 2026-10-10.

| id | severity | status | note |
| --- | --- | --- | --- |
| — | — | — | Playwright booking, check-in, and PWA tests passed. Unit suite passed. |

## To check

- Install the member schedule on a physical phone. Playwright covered the manifest, service worker, and offline reload.
- Run one PaymentIntent against Stripe test mode after `STRIPE_SECRET_KEY` is set. The suite currently asserts the SDK's request body and a local protocol peer.
