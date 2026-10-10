# Launch plan

Not a launch. Deployment is waiting on a domain and live keys.

1. Trademark and domain search for StudioFlat. The table in `brand.md` is unchecked.
2. Create Stripe test products for $29 and $49. Put the secret in `.env.local`.
3. Run one real test-card PaymentIntent and confirm `application_fee_amount` is null on the dashboard.
4. Point a domain at `next start` or a host. Set `COOKIE_SECURE=1`.
5. Do not submit a store listing until the PWA has been installed on a phone and the listing lint stays clean.

Product Hunt and ads are out of this session.
