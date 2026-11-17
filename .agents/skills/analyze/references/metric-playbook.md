# Martie Analytics Playbook

## Core Event Map

Activation:

- `first_open`
- `app_launch`
- `daily_quiz_started`
- `daily_quiz_completed`
- `signup_completed`

Retention and habit loop:

- `daily_quiz_completed`
- `daily_return_cta_shown`
- `daily_return_cta_pressed`
- `noti_permission_requested`
- `noti_permission_result`
- `noti_permission_granted` (derived from `noti_permission_result.granted == true`)

Referral:

- `share_initiated`
- `share_completed`
- `share_sheet_closed`
- `share_landing_store_opened`
- `acquisition_source_captured`
- `signup_completed`

Signup and save intent:

- `guest_save_cta_shown`
- `guest_save_cta_pressed`
- `signup_completed`

Primary segment properties:

- `acquisition_source`
- `language`
- `app_platform`
- `is_premium`

## Decision Heuristics

Activation:

- Start rate below 55% means the first screen or CTA is unclear.
- Completion/start below 70% means quiz difficulty, latency, or answer UX is leaking.
- Signup/completion below 20% means the save/identity value is weak or too late.

D1 retention:

- Below 15%: prioritize next-day reminder, tomorrow preview, and quiz streak value.
- 15-25%: segment by source and language before changing the core loop.
- Above 25%: scale the best acquisition source and referral path.

Referral:

- If `share_initiated` is low, improve share placement and reward/value copy.
- If `share_landing_store_opened` is low, inspect link preview, channel copy, and deep-link handling.
- If referral signup is strong but volume is low, add more share prompts after positive moments.

## Report Requests From The User

Best screenshot/export set:

1. Funnel: `first_open -> daily_quiz_started -> daily_quiz_completed -> signup_completed`
2. Retention: start `daily_quiz_completed`, return `daily_quiz_completed`
3. Funnel: `daily_quiz_completed -> daily_return_cta_shown -> daily_return_cta_pressed -> daily_quiz_started`
4. Event breakdown by `acquisition_source`, `language`, and `app_platform`

Ask for a 7-day and 28-day view when the trend matters. For release comparisons, ask for 7 days before and 7 days after the release.

## Recommended Output

Use this structure:

1. Verdict: what is currently limiting growth.
2. Evidence: funnel/retention numbers that prove it.
3. Experiment: the smallest change likely to move the metric.
4. Success metric: exact event ratio to watch.
5. Implementation notes: files/events likely involved.

Avoid claiming causality from one period without a before/after comparison or a controlled segment.
