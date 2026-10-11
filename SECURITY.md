# Security

Report vulnerabilities privately through [GitHub Security Advisories](https://github.com/karthikmprakash/openweek/security/advisories/new). Do not open a public issue for a live secret, payment, or account-takeover bug.

This project never wants live API keys, card numbers, or passwords in the repository. Put them in `.env` or `.env.local` on the host.

## Production checklist

- Set `COOKIE_SECURE=1` behind HTTPS.
- Set a long random `JOB_SECRET`. Leave it blank only when you want `/api/jobs/run` closed.
- Back up `/data/openweek.db` (and the `-wal` / `-shm` files if you copy them cold). `deploy/backup.sh` uses SQLite's online backup.
- Rotate Stripe and Resend keys in the host env, then `docker compose up -d`.
- Keep the GHCR image private until you decide to publish it.
