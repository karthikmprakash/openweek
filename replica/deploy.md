# Deploy checklist: Openweek

Date: 2026-10-11  Commit: local main  Go from user: not yet (infra only, no live domain)

## Preflight (all must pass)

- [ ] e2e suite green: not re-run in this session (CI will run on the first push)
- [ ] no open S1 or S2 bugs
- [x] parity: must-haves were already recorded as done in `replica/features.json`
- [ ] rebrand sweep clean (`sweep.py` exit 1 — competitor names remain in PRD, import copy, and listing avoid-list; that is expected until launch copy is rewritten)
- [x] store listing file exists (`replica/launch/listing.json`) — listing.py not re-run
- [ ] production build passes: Docker image not yet built on this machine
- [ ] privacy policy and terms live, every processor listed — **missing**
- [x] account deletion works (`Close the studio` on settings)
- [x] favicon, titles, and app icon are Openweek’s — no separate OG image yet

## Production

- [x] separate production database path: Compose named volume `openweek-data` at `/data/openweek.db`
- [x] backups: `deploy/backup.sh` (operator runs it; schedule on the host)
- [x] env var names match `.env.example` (values stay on the host)
- [ ] Stripe live: products, prices, webhook endpoint + secret, one real purchase refunded
- [ ] OAuth: not used
- [ ] email sending domain verified (Resend)

## Domain

- [ ] A @ -> host IP
- [ ] CNAME www -> apex or Caddy
- [ ] SPF, DKIM, DMARC set
- [ ] canonical host: apex, `www` redirects (Caddyfile)
- [ ] HTTPS: Caddy overlay in `compose.prod.yaml`

## Watch

- [x] health: `GET /api/health`
- [ ] error tracking (Sentry or host logs — not wired; no third-party key)
- [ ] uptime checks on `/` and `/api/health`
- [ ] analytics: none (avoids a cookie banner)
- [ ] core flow on the live site: not live

## Ship path

1. Push `main` to `https://github.com/karthikmprakash/openweek.git`.
2. CI must be green.
3. Tag `v0.1.0` to cut a GitHub Release and a GHCR image.
4. On the VPS: copy `.env.example` to `.env`, set secrets yourself, `docker compose up -d`.
5. After DNS: `docker compose -f compose.yaml -f compose.prod.yaml up -d`.

Nothing is on a public domain until those host and DNS steps are done by you.
