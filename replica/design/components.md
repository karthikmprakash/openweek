# Components

Tokens: `tokens.json`, `tokens.css`. Contrast: 15 pairs, 0 AA failures (2026-10-10). Tailwind maps the same variables in `src/app/globals.css` (`bg-bg` is not required; components use the classes below, which read the variables).

## Button
variants  primary, secondary, ghost, danger
sizes     sm 32px, md 40px, lg 48px
states    default, hover, disabled, focus-visible (2px accent ring)
tokens    accent / on-accent, border-input, danger, radius sm
a11y      real button, type set, disabled does not submit
used on   S01–S16

## Field
variants  text, email, password, number, datetime-local, file
states    empty, filled, focus, error via the alert under the form
tokens    border-input on surface, text, muted hint
a11y      label wraps the control, id matches
used on   S02 S03 S05 S06 S08 S11 S13 S15

## Alert
variants  danger banner, success note
states    hidden when empty, role=alert on errors
used on   S02 S03 S05 S08 S09 S11–S13 S15

## Card
variants  surface, 1px border, radius md, shadow card
used on   schedule rows, reports, confirmation

## Spot count
states    "1 spot left" or "N spots left"
used on   S05 S07 S08 S09

## Top bar and nav
states    wraps at 375px, skip link to #main
used on   marketing, studio, member week

## Table
used on   S12 S14

## Skeleton
used on   `src/app/studio/loading.tsx`
