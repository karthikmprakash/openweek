# PRD — "StudioFlat": flat-fee class booking for micro studios (<150 members)

**Target price:** $29–49/mo flat, plus bring-your-own payment processing
**Status:** researched hypothesis · **Evidence strength:** real demand, **but this is the weakest of the three verticals to enter** — see §7
**One-line:** book the class and take the payment at a flat monthly fee, with no percentage skim on top.

---

## 1. Problem & evidence

The complaint in this vertical is unusually specific and consistent: **it is not the subscription, it is the second tax on payments.**

- A 120-member reformer Pilates studio: *"our current platform just raised prices by $40/month. We can't afford the increases year on year. The app hasn't been great too and support has been hard to reach… Arketa looks good, but I need a mobile app for my clients and they only offer branded app as an add-on. I just need something that books the class and handles payments. I've been to 5 demos and still undecided."*[15]
- A small studio questioning the incumbent outright: *"We're a small studio and I'm questioning whether Momence is worth it for our size. Between the monthly fee and the frankly ridiculous payment processing costs, it feels expensive for what we actually need. Setup wasn't exactly smooth either."*[97]
- A yoga studio owner still running on *"a combination of Google Calendar, Venmo, and an Excel spreadsheet… I keep double-booking classes and chasing people down for payments."*[96]
- Mindbody is dismissed on price repeatedly by small studios — *"Mindbody seems way too expensive for her needs."*[96]

**Two distinct pains, and they need separating:**
1. **Price creep** — annual increases on small studios with ~100–150 members ("fees keep creeping up")[15]
2. **Two-part pricing** — a monthly fee *plus* 3–4% of every transaction[97][21]

---

## 2. Target user

| Attribute | Definition |
|---|---|
| Who | Owner-operator of a boutique studio: Pilates reformer, yoga, barre, CrossFit-style box, martial arts, dance, small independent PT/personal-training studio |
| Size | **Under 150 members**, 1–3 instructors, 1 location |
| Current tools | Mindbody, Momence, Arketa, Punchpass, WellnessLiving, Glofox, or calendar + Venmo + spreadsheet[96] |
| Tech comfort | Moderate. Runs Instagram, sends Reminders via text. |
| Trigger to buy | A price increase, a bad support experience, or an app that has broken mid-term[15] |
| Budget | $29–49/mo subscription; **strongly resists percentage-based processing** |

**Anti-persona:** multi-location chains, franchises, studios with 300+ members, and anyone needing a branded consumer app or complex membership hierarchies. That is where Mindbody actually earns its price.

---

## 3. Jobs to be done

1. **When a member wants to book**, show them a clean schedule on their phone and let them reserve + pay in under 30 seconds.
2. **When the schedule changes**, update it without breaking existing bookings or refunding anyone manually.
3. **When someone no-shows or late-cancels**, apply the studio's policy automatically (fee or class credit).
4. **When month-end arrives**, see who has an expiring pack/membership and what revenue actually came in — without exporting to a spreadsheet.
5. **When a class is nearly full**, fill the last two spots without posting a manual Instagram story.

---

## 4. MVP scope

**In:**
- Class schedule + booking (web-first, installable PWA for the member side)
- Memberships, class packs, drop-ins, and expiring credits
- **Bring-your-own Stripe** — studio keeps its own merchant account; no platform percentage
- Attendance/check-in (incl. staff-side manual check-in)
- Automated reminders (email + optional SMS, throughput-priced)
- Waitlists + auto-promotion when a spot opens
- Late-cancel/no-show policy automation
- Basic revenue report: revenue by class, by membership, expiring credits
- Migration/import from Mindbody, Punchpass, Arketa CSVs — **free**

**Explicitly out (v1):**
- Branded native consumer app (this is the single most expensive incumbent feature — deliberately excluded; PWA substitutes)
- Payroll, instructor commission, POS/retail, door access hardware
- Marketing automation, funnels, landing pages
- Franchise/multi-location hierarchy
- Owning the payment processing (the entire differentiation is that you *don't*)

---

## 5. Core flows

**Member books:** open link → see week's schedule → tap class → pay (own Stripe) → confirmation + calendar invite. Target: **<30 seconds, no account creation required to buy a drop-in.**

**Policy enforcement:** cancellation window configurable per studio → late cancel auto-applies fee or credit per studio's rule → member sees the outcome immediately.

**Month-end:** dashboard of revenue + a list of memberships/credits expiring in the next 14 days, with a one-tap "email them" — this drives renewals and is the reason an owner keeps paying.

**Migration:** upload a CSV → map fields → members and balances imported. Free, and it is the primary competitive weapon (see §8).

---

## 6. Pricing & packaging

| Plan | Price | Notes |
|---|---|---|
| Micro | **$29/mo** | For <50 members / solo instructor — nobody serves this size |
| Studio | **$49/mo** | Unlimited members, unlimited classes |
| Annual | 2 months free | — |

**No transaction fee. Ever.** Processing at cost through the studio's own Stripe. Publish the comparison loudly: *"Momence takes 3.9% + $0.30 per online card payment on top of your subscription; we take 0%."*[21]

**Worked example, calculated honestly.** A studio processing $8,000/month in card payments (200 transactions at a $40 average ticket):

| | Fees on $8,000 |
|---|---|
| Momence online card (3.9% + $0.30)[21] | **$372.00** |
| Studio's own Stripe (2.9% + $0.30) | $292.00 |
| **Saving** | **$80/mo ($960/yr)** |

At $25,000/month the saving is **$250/mo ($3,000/yr)**.

⚠️ **Note the framing trap:** the honest saving is not "$372/month", because the studio pays ~$292 of that to *any* processor. The real prize is the **~1 percentage-point rate difference**, worth roughly **1% of processed volume** — $80/month at micro-studio scale. That is still 2–3× a $29 subscription, but it is not the sweeping number the marketing wants it to be. Put the real delta on the landing page; inflating it will get you caught in the first sales call.

---

## 7. Competitive landscape

| Product | Published price | Positioning | Weakness you can attack |
|---|---|---|---|
| **Mindbody** | **from $79/mo per location**, plus processing; new AU entry tier at A$89/mo for yoga studios | Market leader, consumer marketplace | Expensive for <150 members; repeatedly dismissed as "too expensive" by small studios[9][96] |
| **Momence** | Subscription + **3.9% + $0.30** online card, 3.7% + $0.05 in-person, 1.8% ACH | Modern challenger | ⚠️ The processing stack is the complaint, and the incumbent here is *modern* — hard to out-execute on UX[21][97] |
| **Punchpass** | **$59 / $99 / $149** per month | Budget-friendly, well-regarded | Entry price above target; grew upmarket[81] |
| **Arketa** | **$49/mo** (annual) + **3% transaction fee** + Stripe fees | Boutique studios, some brands | ⚠️ Occupies your exact price point *and* takes 3%; client app is a paid add-on[83][15] |
| **WellnessLiving** | **$69/mo**, up to **$199/mo**; promos to $39 | Mindbody alternative at scale | Priced above target for micro studios[84] |
| **Gymdesk** | Entry plan + $50/mo per additional location; door access $100/mo beta | Gyms/boxes | Location-based pricing structure[82] |
| **Vagaro** | **from $23.99/mo** | Salon/spa/wellness all-rounder | ⚠️ Below your target price already[11] |
| **Acuity Scheduling** | **$27/mo** | Stripped-down scheduling | No class/membership depth, but fine for tiny studios[95] |
| **Glofox / others** | "plans starting at $99/mo" | Mid-market | Above target; added late-cancel surcharges in 2026[98] |

### The honest read — the weakest of the three

**Do not enter this as "cheaper Mindbody."** The floor is already crowded: Vagaro at $23.99,[11] Acuity at $27,[95] and Arketa at $49 plus a 3% transaction fee.[83] Punchpass entry is $59 and WellnessLiving has run promos at $39.[81][84] Several are excellent products with years of polish.

Three further structural problems:

1. **The processing argument is weaker than it looks.** Your pitch is "0% + BYO Stripe", but the studio's own Stripe still charges ~2.9% + $0.30. You are only saving the *platform's* extra percentage point — worth **$80/month at $8,000 of card volume**, or ~1% of processed volume (see the worked example above).[21] Real, but modest, and it shrinks further for studios that take cash, ACH (Momence charges 1.8%), or in-person payments (3.7% + $0.05).[21] You are also handing the owner a merchant-account chore they may not want.
2. **The branded consumer app is table stakes in this market, and you're excluding it.** Arketa losing a deal over exactly this is evidence that members judge studios by the app.[15] A PWA is a genuinely weaker substitute.
3. **Support burden in fitness is high and personal** — schedule changes, refunds, "my app isn't working" on a Saturday morning before a full class.

**Where a micro-SaaS can still win:**
- **The sub-50-member / solo-instructor segment.** Nobody listed above wants it. A $29/mo plan for a single instructor with 30 students is unserved and non-competitive with the incumbents' sales motion.
- **Flat-fee + 0% as the explicit brand**, aimed at the studios who are actively angry** — the two-part-pricing complaint is real and quotable.[97][21]
- **Migration-as-marketing:** free, done-for-you import from Mindbody/Punchpass/Arketa. Churn events are the only reliable acquisition channel here.[15]

---

## 8. Risks & kill criteria

| Risk | Severity | Mitigation / kill criterion |
|---|---|---|
| Crowded price floor ($23.99–$59 already)[11][95][81] | **Critical** | Target only <50 members, or don't start |
| Excluding a branded app loses deals[15] | High | Position PWA honestly; consider a cheap branded-app reseller partnership rather than building it |
| "0% processing" still requires the owner to run Stripe | Medium | One-tap Stripe onboarding ; be honest that total processing is ~2.9% |
| Pricing is seasonal/high-touch; studios churn with owner burnout | Medium | Annual plans; migration lock-in |
| Member-facing downtime before a class = angry owner | Medium | Reliability work must precede features |

**Kill the project if:** after pre-selling to 20 micro studios (<50 members), fewer than 5 will pay $29/mo, **or** if every prospect says they'd rather stay on Acuity/Vagaro at $27/$23.99.[95][11]

---

## 9. Metrics that matter

- **Activation:** studio publishes schedule + takes first paid booking in <48h
- **Member adoption:** % of a studio's members booking through the tool within 30 days (target >50%)
- **Retention:** 12-month studio retention; and `% of owners who cite the 0% fee as the reason they switched` (validates the positioning)
- **Migration success rate:** % of imports completed without support intervention (this is your acquisition engine)
- **Reliability:** booking-flow success rate and uptime during 6–9am and 5–7pm class peaks

---

## 10. Validation plan

1. Calculate a real studio's processing bill from a redacted payout report and put the delta on a landing page. If the number isn't impressive, the whole thesis fails — check this **first**.
2. Post in r/yoga, r/pilates, r/FitnessStudioOwner asking what their platform costs them *all-in per month including processing*. Collect 20 real numbers.
3. Ask the 120-member studio's question directly: does the branded app matter more than $300/month?[15] If yes, this market needs a different product.
4. Pre-sell 5 annual plans at $29 to sub-50-member instructors before building the member-facing side.

---

## 11. Sources

## Sources

[9] https://www.mindbodyonline.com/pricing
[11] https://www.vagaro.com/pro/pricing
[15] https://www.reddit.com/r/FitnessStudioOwner/comments/1vmd2ed/best_pilates_studio_software_for_a_small_studio
[21] https://momence.com/pricing
[81] https://punchpass.com/pricing
[82] https://gymdesk.com/pricing
[83] https://www.arketa.com/pricing
[84] https://www.wellnessliving.com/pricing
[95] https://www.reddit.com/r/mindbody/comments/1tnvgdw/acuity_scheduling_vs_mindbody
[96] https://www.reddit.com/r/yoga/comments/1q556ql/studio_owners_can_you_recommend_any
[97] https://www.reddit.com/r/YogaTeachers/comments/1u37j5q/momence_seems_expensive_for_what_it_actually_is
[98] https://pilatesstudiosoftware.com/alternatives/mindbody-alternatives-for-pilates-studios
