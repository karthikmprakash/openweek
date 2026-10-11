# Build state

Machine-readable truth is `replica/features.json` (run `python3 tools/status.py`).
This file is the human/agent narrative that survives context compaction.

## Current phase
done (10/10 verified, tools/verify.sh exit 0)

## Phases
- [x] recon        -> replica/recon-map.md
- [x] architect    -> replica/architecture.md
- [x] design       -> replica/design/tokens.json + tokens.css
- [x] build        -> screens from the recon map
- [x] backend      -> auth, db, payments, integrations
- [x] test         -> e2e specs green
- [x] diff         -> parity score recorded
- [x] entrepreneur -> what users of the reference app hate, fixed in ours
- [x] brand        -> name + identity (no copied assets)
- [x] launch       -> landing page + store listing
- (deploy: only once the human supplies a domain)

## Last session summary
Shipped product mark is **Openweek** (landing, auth, studio chrome, member footer, PWA, emails in payments copy). Owner “studio” routes and tables are unchanged. Official trademark searches still to run (`replica/brand.md`).

## Next 3 concrete actions
1. Finish USPTO / EUIPO / CIPO / WIPO searches for Openweek.
2. Add a Stripe test secret and run one live PaymentIntent.
3. Bill the studio $29 or $49 with a one-click cancel, still with no platform percentage.
