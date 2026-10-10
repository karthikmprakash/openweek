# StudioFlat

Class booking for a small studio. One monthly price. The studio's own Stripe account takes the card, and this app does not add a platform fee.

## Run

```bash
npm install
npm run build
npm start
```

Open http://127.0.0.1:3000 and create a studio at `/signup`. The database file is `data/studioflat.db` unless `STUDIOFLAT_DB` is set.

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
