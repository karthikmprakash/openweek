# Fixes and angle

Sources: 150 App Store reviews in `replica/reviews.csv` (consumer app id 689501356, business app id 599125654), ranked in `replica/feedback.md`. Hacker News search for the product name did not return product reviews. Reddit, Play, and G2 were not read this session.

## What they hate

1. Bugs and crashes — 19 reviews, 2 sources. "Lots of bugs." https://apps.apple.com/us/app/id599125654?see-all=reviews&reviewId=14496358296
2. Billing and cancellation — 16 reviews, 2 sources. "Difficult to cancel passes." https://apps.apple.com/us/app/id689501356?see-all=reviews&reviewId=14175609852
3. Price — 14 reviews, 2 sources. "Not worth the monthly fee." https://apps.apple.com/us/app/id599125654?see-all=reviews&reviewId=13864514292

## What is missing

1. A clear way to turn renewal and cancellation rules on or off. "you are not given any option to decline or turn off autorenew." https://apps.apple.com/us/app/id689501356?see-all=reviews&reviewId=14274506933
2. Calendar sync that does not need a manual push. "need to manually push the sync every time" https://apps.apple.com/us/app/id599125654?see-all=reviews&reviewId=12721576309
3. Account deletion. "I wanted to delete my account and they wouldn’t let me." https://apps.apple.com/us/app/id689501356?see-all=reviews&reviewId=14559216420

## What is still unsolved

The consumer marketplace is why some people stay, and it is also why others feel forced into a bad app. StudioFlat does not build that marketplace. A studio that needs discovery from a giant app will not switch for a fee story alone.

## What we changed

- Cancel returns a sentence on the confirmation immediately (fee, returned visit, or kept visit).
- Reminder opt-out is one button on the confirmation.
- The owner can delete the studio and its rows.
- No platform fee can be stored. The SQL check and the PaymentIntent params both refuse it.
- Expired credits cannot be spent, including at the exact expiry timestamp.
- Import reports bad rows instead of dropping them.
- Member schedule works at 375px and reloads offline after it has been opened.

## Not changed, on purpose

- No branded native app.
- No Google Calendar sync yet. The review is real; it is the first item after the MVP.
- No consumer marketplace.

## Angle

Flat monthly price for a studio under 150 members. The owner's Stripe account takes the card. We add $0. On $8,000 of card volume, a one-point platform add-on is about $80, and that is the number we publish, not the processor's whole bill.
