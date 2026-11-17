---
name: grow
description: Run one growth round for Martie's App Store and Play Store ranking. Read the ledger, pull the metrics directly from Convex production and the public store endpoints without asking the user, pick the single highest-leverage lever from the backlog, ship it through the normal review path, and record it as a hypothesis with a verification date. Use when the user runs `/grow` or `$grow`, asks to raise the store ranking, improve retention or conversion against numbers, pick the next growth experiment, or judge whether the last one worked. One lever per round.
---

# Growth Round

Ranking is the outcome, not the instruction. What this loop guarantees is that
every round produces one measurable hypothesis and the next round judges it.
Never stack features on instinct. Report only whether the numbers moved.

## The Ledger Is The Memory

Growth operations files (`notes/growth/`, `docs/GROWTH_ACTION_PLAN.md`,
`store/aso/`) live in the private `hyodotdev/Martie-ops` repository, not in the
public app repository. Check it out next to this repository as `../Martie-ops`
before a round; if it is unavailable, stop and say so instead of recreating the
files here.

`Martie-ops/notes/growth/ledger.md` is the only memory between rounds. A round starts by
reading it and ends by writing to it. It holds three sections:

| Section | Contents |
| --- | --- |
| Metric snapshots | Date, D1/D7, installs, rating and review count, organic DAU, per store and source |
| Hypothesis register | "Shipping X raises Y" — shipped date, verify-by date, verdict |
| Round log | What was done, what was declined and why |

A hypothesis without a verify-by date is not a hypothesis.

## Sources Of Truth

Read these instead of restating or forking them:

- `Martie-ops/docs/GROWTH_ACTION_PLAN.md` — store angle, acquisition links, weekly readout,
  and the queued ASO experiments.
- `Martie-ops/store/aso/martie-metadata.md` — the ASO copy for every locale. All store
  listing edits land here first.
- `docs/ANALYTICS_EVENT_SCHEMA.md` — the Firebase/GA4 event contract.
- `$analyze` — owns funnel, retention, and segment interpretation. Delegate the
  numbers to it rather than inventing a second heuristic set here.

## One Round

1. **Read the ledger.** If any hypothesis is past its verify-by date, judge it
   before anything else. Shipping new work over an unjudged hypothesis is this
   loop's primary failure mode.
2. **Pull the metrics yourself.** Do not open a round by asking the user for
   numbers. Work the sources below in order and record which ones answered.

   **a. Convex production — first-party truth, always available.** Query it with
   the Convex MCP `runOneoffQuery` against the `prod` deployment selector from
   `status`, or `npx convex run --prod`. It answers:

   | Metric | Where |
   | --- | --- |
   | Logged-in DAU/WAU | distinct `userId` per `createdAt` day in `quizResults` |
   | Signups over time | `users._creationTime` |
   | Retention proxy | `userProfiles.currentStreak` / `longestStreak` / `lastStreakDate` |
   | Referral | `userProfiles.referredBy`, `referralCount` |
   | Monetization | `userProfiles.isPremium`, `purchases` |
   | Engagement depth | `quizResults.isDaily`, `leagues.weeklyXp` |

   Scan with `.order("desc").take(N)` — `quizResults` has no global date index.
   **Aggregate only.** Never print or store a user id, email, display name, or
   review author.

   **⚠️ Guests are invisible here.** `saveQuizResult` and the daily-challenge
   mutation both bail on `if (!userId) return`, so every Convex figure is
   logged-in-only and is a floor, not a total. Never present it as whole-app
   DAU.

   **b. App Store, public, no auth.**

   ```bash
   curl -s "https://itunes.apple.com/lookup?id=6740057833&country=kr"
   curl -s "https://itunes.apple.com/kr/rss/customerreviews/id=6740057833/sortBy=mostRecent/json"
   ```

   Gives version, release date, average rating, rating count, and review text.
   Check the `kr`, `us`, and `jp` storefronts — ratings do not aggregate across
   them.

   **c. Growtoki — the only guest-inclusive source.** From
   `$GROWTOKI_REPO` (private, maintainers only), run
   `./node_modules/.bin/convex run --prod --inline-query` against the `martie`
   project's `events`. It needs a Convex login with access to that project; if
   it returns "You don't have access to the selected project", record the guest
   funnel as unmeasured for this round rather than guessing at it.

   **d. Play Console, App Store Connect Analytics, Firebase/GA4.** These need
   credentials that are not currently in the repo, and the Play listing page
   does not yield reliable numbers by scraping. Use them only when a service
   account or API key is actually configured; otherwise record them unavailable.

   Then run `$analyze` to interpret whatever came back. **Never invent a
   number,** and never fill a gap with an estimate. A ranking, install, or
   retention figure may only be stated if a ledger snapshot carries it with its
   source.
3. **Read the recent reviews.** Pull the iOS RSS from step 2b for every
   storefront that has entries. Sentences are better hypothesis material than
   star averages — one repeated complaint can outrank the whole backlog. Quote
   review content without the author's name.
4. **Sort the backlog.** Collect the issues labeled `🥇 growth` with `gh` and
   pick exactly one:

   | Criterion | Question |
   | --- | --- |
   | Impact | Does it move D1, conversion, or store exposure (impressions, rating, featuring)? |
   | Cost | Does it invalidate the screenshot set? Three quiz locales? Nine UI locales? Convex work? A store review cycle? |
   | Risk | Does it touch purchases, ads, league standings, or stored user data? |

   On a tie, prefer the lever that does not invalidate screenshots, does not
   need a new binary, and does not need a store review cycle. An Expo update
   beats a native release when both would work.
5. **Ship exactly one.** Take the repository's normal path — `$loop-review` owns
   branch, verification, review, and merge; `$e2e-test` gates user-facing and
   native changes; `$release-update` ships only when the user asks for a
   release. ASO-only rounds change `Martie-ops/store/aso/martie-metadata.md` and are
   applied to the stores by the user.
6. **Write the ledger.** Record what shipped, which metric must move, by how
   much, and by when. Set the verify-by date from the real feedback lag: about
   7 days for D1, about 14 for D7 and store conversion, and longer when a store
   review cycle sits in between.
7. **Update the backlog issue** — tick what is done, add newly discovered
   opportunities as sections. Do not split the roadmap into new issues. Use the
   `gh api` label path from `$commit`; `gh pr edit` style label calls fail
   silently on this repository.

## Round Zero

If `Martie-ops/notes/growth/ledger.md` has no snapshot and no backlog issue exists yet:

1. Create the `🥇 growth` label and one consolidated roadmap issue holding the
   backlog as a checklist. Reconcile any stale growth or sprint issue instead of
   opening a parallel one.
2. Seed the ledger with a real baseline pulled per step 2, not a placeholder.
3. Stop there. Do not ship a lever in the same round as the bootstrap.

## When There Is Nothing To Pick

If step 2 returns nothing usable and the backlog is empty, **do not manufacture
a round.** Record the backlog grooming and the next snapshot date, then stop.
A forced round turns taste into a fake finding, the same way it does in
`$review-self`.

## What This Loop Never Does

- **Store policy violations.** No purchased, incentivized, traded, or fabricated
  reviews and ratings. No install or ranking manipulation services. No review
  gating that filters unhappy users away from the store. No keyword stuffing and
  no competitor brand terms in metadata. These trade the app's listing for a
  short-lived rank.
- **Dark patterns.** No punishment for missed days, no fake urgency, no ads
  disguised as content. Punishing a missed day produces churn, not return.
  Review prompts stay on the earned moments already implemented — a 5/5 daily
  result and a streak milestone.
- **Unmetered features.** "This would be fun" is not an input to this loop. That
  is an ordinary development request.
- **Casual screenshot churn.** If a lever changes a screen in the capture set
  defined by `Martie-ops/docs/GROWTH_ACTION_PLAN.md`, weigh the full re-capture across
  locales as part of its cost before choosing it.
- **Overstated results.** Ranking, conversion, and retention numbers come from
  ledger snapshots only. No claim of causality from a single period without a
  before/after comparison or a controlled segment.

## Levers Already Built

Prefer reaching for what exists before proposing something new:

| Lever | Skill or asset | Moves |
| --- | --- | --- |
| Short-form video, ko/en/ja | `$render-shorts` | Top of funnel, organic installs |
| Quiz volume and freshness | `$seed-quizzes` | Session depth, D1 |
| Article and SEO surface | `$seed-articles` | Non-store acquisition |
| Store listing copy and screenshots | `Martie-ops/store/aso/martie-metadata.md` | Impressions to install conversion |
| In-app habit loop — streak, league, return CTA | app code | D1/D7 |
| Referral and share links | `Martie-ops/docs/GROWTH_ACTION_PLAN.md` | Viral coefficient |
