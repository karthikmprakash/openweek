# Evidence log

Append-only receipts written by `tools/record.py`. A feature is `verified` only if a
command here exited 0. Do not hand-edit this file.

## [F2] Memberships, class packs, drop-ins, expiring credits — 2026-10-10 17:21:39Z

note: Drop-in, pack, and membership deduct; exact expiry rejects

command: `npx vitest run tests/credits.test.ts`
exit code: 0

```
RUN  v5.0.3 /Users/karthikmprakash/Documents/Personal/Projects/studioflat


 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  22:51:38
   Duration  290ms (tests 42%, import 37%, transform 19%, worker 1%)

(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
```

## [F5] Automated reminders — 2026-10-10 17:21:39Z

note: One send inside the lead window; opt-out skipped; second run sends nothing

command: `npx vitest run tests/reminders.test.ts`
exit code: 0

```
RUN  v5.0.3 /Users/karthikmprakash/Documents/Personal/Projects/studioflat


 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  22:51:39
   Duration  224ms (transform 36%, import 36%, tests 26%, worker 1%)

(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
```

## [F6] Waitlist with auto-promotion — 2026-10-10 17:21:40Z

note: Promotion order, notification, claim, then timeout moves on

command: `npx vitest run tests/waitlist.test.ts`
exit code: 0

```
RUN  v5.0.3 /Users/karthikmprakash/Documents/Personal/Projects/studioflat


 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  22:51:40
   Duration  228ms (transform 36%, import 36%, tests 27%, worker 2%)

(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
```

## [F7] Late-cancel / no-show policy automation — 2026-10-10 17:21:41Z

note: Early cancel returns credit; late fee and extra credit; no-show fee; application fee null

command: `npx vitest run tests/policy.test.ts`
exit code: 0

```
RUN  v5.0.3 /Users/karthikmprakash/Documents/Personal/Projects/studioflat


 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  22:51:40
   Duration  277ms (tests 48%, transform 26%, import 25%, worker 1%)

(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
```

## [F8] Revenue reporting — 2026-10-10 17:21:41Z

note: Grouped totals equal the ledger; 14-day expiry list emails once

command: `npx vitest run tests/reports.test.ts`
exit code: 0

```
RUN  v5.0.3 /Users/karthikmprakash/Documents/Personal/Projects/studioflat


 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  22:51:41
   Duration  225ms (transform 34%, import 34%, tests 30%, worker 1%)

(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
```

## [F9] Free CSV migration/import — 2026-10-10 17:21:42Z

note: Dry run writes nothing; bad rows reported; balances match

command: `npx vitest run tests/import.test.ts`
exit code: 0

```
RUN  v5.0.3 /Users/karthikmprakash/Documents/Personal/Projects/studioflat


 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  22:51:42
   Duration  175ms (transform 43%, tests 38%, import 16%, worker 2%)

(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
```

## [F3] Bring-your-own Stripe, no platform percentage — 2026-10-10 17:21:47Z

note: Stripe SDK create body omits application_fee; connected account header set; stored fee is null. Peer is a local HTTP stand-in because no STRIPE_SECRET_KEY was set.

command: `npx vitest run tests/payments.test.ts`
exit code: 0

```
RUN  v5.0.3 /Users/karthikmprakash/Documents/Personal/Projects/studioflat


 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  22:51:47
   Duration  228ms (tests 34%, import 33%, transform 32%, worker 1%)

(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
```

## [F1] Class schedule and member booking — 2026-10-10 17:21:49Z

note: Publish class, guest reserves, spots drop from 4 to 3, axe clean

command: `npx playwright test e2e/booking.spec.ts`
exit code: 0

```
Running 1 test using 1 worker

  ✓  1 e2e/booking.spec.ts:5:5 › guest books a published class and capacity drops (958ms)

  1 passed (2.1s)
(node:84117) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
```

## [F4] Attendance and check-in — 2026-10-10 17:21:53Z

note: Self and staff check-in each leave one attendance row

command: `npx playwright test e2e/checkin.spec.ts`
exit code: 0

```
Running 1 test using 1 worker

  ✓  1 e2e/checkin.spec.ts:4:5 › self check-in and staff check-in each record once (1.9s)

  1 passed (2.8s)
(node:84255) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
```

## [F10] PWA member experience — 2026-10-10 17:21:54Z

note: Manifest installability, offline reload of the schedule, 375px screenshot with no horizontal overflow

command: `npx playwright test e2e/pwa.spec.ts`
exit code: 0

```
Running 1 test using 1 worker

  ✓  1 e2e/pwa.spec.ts:4:5 › member schedule is installable, offline, and usable at 375px (588ms)

  1 passed (1.3s)
(node:84427) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
```
