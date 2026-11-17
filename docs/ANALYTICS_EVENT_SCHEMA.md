# Firebase Analytics Event Schema

Martie sends product events to Firebase Analytics through
`src/utils/analytics.ts`. The wrapper adds common event parameters such as
`app_platform`, `app_environment`, `acquisition_source`, `language`, and
`is_premium` when available.

## First-party guest-inclusive measurement

The same wrapper also records a small event allowlist in Convex:
app visits, daily quiz starts/completions, and practice quiz completions.
`analyticsVisitors` holds one row per installation; `analyticsVisitorDays`
holds one row per installation and local calendar day. Neither table stores
email addresses, account IDs, quiz answers, or arbitrary event properties.

An independent random installation ID is saved in MMKV and survives sign-in
and sign-out. Reinstalling or clearing app storage creates another identity;
different devices are counted separately. Existing installations upgrading
to this instrumentation are marked separately using `FirstLaunchAt`, so they
do not inflate the new-install acquisition funnel. First app opens on/after
the rollout date (2026-10-13 KST) count as new, including when the embedded
binary saves first launch before fetching the measurement OTA. Collection starts after
this code is released; historical guest traffic cannot be reconstructed.

Events retain their device timestamp and UTC offset in a durable local queue.
They retry on launch, foreground, new tracked events, and every 30 seconds
while active. Replayed events update the same visitor/day rows, so they do
not inflate unique visitor counts. Development runs are excluded.

Definitions:

- **Visit:** app launch or foreground, including guests. This measures app
  arrivals, not store impressions or landing-page visitors.
- **First quiz completion:** the first completed daily or practice session,
  independent of score. Daily start/completion counts are also reported.
- **D1 return:** a visit on the local calendar day after first quiz completion.
  D1 quiz completion is reported separately. Only cohorts whose entire next
  day has ended enter the D1 denominator; an empty denominator returns null.
- **Source:** first known `source`/`utm_source` deep link or referral source.
  Missing attribution is `unattributed`, not assumed organic. Store installs
  without a deferred deep link/install-referrer remain unattributed.
- **Cohort:** installations first observed between `fromDate` and `toDate`,
  inclusive. Conversions/returns are measured through the report time.

After deploying the backend and releasing the app, run an aggregate report:

```sh
npx convex run --prod analytics/actions:reportFunnel \
  '{"fromDate":"2026-10-13","toDate":"2026-10-19"}'
```

The internal action returns counts and rates for new installs, existing
installs, and source/platform/language segments, without returning raw IDs.
Release tests use a `qa_` acquisition source. Their counts appear under
`qaInstalls` and in segments, and are excluded from the main growth totals.
It reads indexed pages of at most 100 visitors; cohort windows are limited
to 31 days. Internal functions require deployment access and cannot be
called by an anonymous app client. Backend deployment must precede app
release; until ingestion is available, the app keeps its pending queue.

## Core Funnels

### Activation

1. `first_open`
2. `daily_quiz_started`
3. `daily_quiz_completed`
4. `signup_completed`

Key properties:

- `source`: acquisition source, default `organic`
- `isFirstTime`: first daily completion path
- `correctCount`, `totalQuestions`, `totalTimeMs`
- `app_platform`, `language`

### D1 Retention

1. `daily_quiz_completed`
2. `next_daily_notification_scheduled`
3. `daily_return_cta_shown`
4. `daily_return_cta_pressed`
5. `daily_quiz_completed`

Key properties:

- `completedDate`
- `daysSinceCompleted`
- `wrongCount`
- `surface`

### Viral Loop

1. `daily_quiz_completed`
2. `share_initiated`
3. `share_completed` or `share_sheet_closed`
4. `acquisition_source_captured`
5. `signup_completed`

Key properties:

- `source`
- `platform`
- `share_platform`

### Login Conversion

1. `login_prompt_shown`
2. `login_prompt_accepted`
3. `signup_completed`

Key properties:

- `source`
- `isFirstTouch`

## Firebase Reports To Check

Use Firebase Analytics or GA4 explorations with these reports:

- Funnel: `first_open -> daily_quiz_started -> daily_quiz_completed`
- Funnel: `daily_quiz_completed -> daily_return_cta_pressed -> daily_quiz_completed`
- Retention: users who fire `daily_quiz_completed` and return to
  `daily_quiz_completed`
- Breakdown: `signup_completed` by `source`
- Breakdown: `daily_quiz_completed` by `correctCount`, `wrongCount`,
  `language`, and `app_platform`

For deeper analysis, enable BigQuery export from Firebase/GA4 and share the
query result CSV. That is enough to analyze cohorts without adding another
analytics SDK.

## Review Loop

When you share screenshots/exported CSVs, include:

- Date range
- App version/build if available
- Funnel conversion percentages
- D1/D7 retention table
- Breakdown by `source`, `language`, and `app_platform`
- Top drop-off step

The next iteration should change one retention lever at a time, then compare
against the same Firebase/GA4 report.
