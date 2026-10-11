# Openweek

Class booking for a small studio. One monthly price. The studio's own Stripe account takes the card, and this app does not add a platform fee.

## Run

```bash
npm install
npm run build
npm start
```

Open http://127.0.0.1:3000 and create a studio at `/signup`. The database file is `data/openweek.db` unless `OPENWEEK_DB` is set. An existing `data/studioflat.db` is still opened if the new file is not there.

Copy `.env.example` to `.env.local` when you have a Stripe test secret. Leave it empty to reserve free classes, sell passes, and run reports. Card payment needs `STRIPE_SECRET_KEY`.

Set `COOKIE_SECURE=1` only behind HTTPS.

## Test

```bash
npm run test:unit
npx playwright test
npm run typecheck
npm run lint
python3 .claude/skills/replica-design/contrast.py replica/design/tokens.json
```

`npm test` runs the unit suite and Playwright. Playwright expects a production build because it starts `next start`.

## Deploy

Copy `.env.example` to `.env` on the host and fill in values yourself. Never commit live keys.

```bash
docker compose up -d --build
```

The app listens on port 3000. SQLite lives on the `openweek-data` volume at `/data/openweek.db`. A sidecar calls `POST /api/jobs/run` every five minutes when `JOB_SECRET` is set.

HTTPS with Caddy, after DNS for the domain points at the host:

```bash
# In .env: DOMAIN, ACME_EMAIL, COOKIE_SECURE=1, JOB_SECRET
docker compose -f compose.yaml -f compose.prod.yaml up -d
```

Backup:

```bash
./deploy/backup.sh
```

Health: `GET /api/health`.

## Release

GitHub Actions on `main` runs lint, types, unit tests, Playwright, and a Docker build for `linux/amd64` and `linux/arm64`. Pushing a tag `v0.1.0` creates a GitHub Release and publishes a multi-arch `ghcr.io/karthikmprakash/openweek:0.1.0`. Docker pulls the image that matches the host.

```bash
git tag v0.1.0
git push origin v0.1.0
```
