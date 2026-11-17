---
name: analyze
description: Analyze Martie Firebase Analytics, GA4 exports, activation funnels, referral loops, D1/D7 retention, and growth experiments. Use when the user runs `/analyze` or `$analyze`, "analyze", "분석해줘", asks to review Martie metrics, Firebase/GA4 screenshots or CSVs, retention, funnels, product analytics, or wants the app improved from analytics data.
---

# Martie Analytics

## Default Workflow

1. Identify the data source:
   - If the user attached Firebase/GA4 screenshots, read the visible numbers and ask only for missing critical values.
   - If the user attached CSV, JSON, or JSONL exports, run `scripts/analyze_martie_metrics.py`.
   - If a Firebase/GA4/BigQuery MCP or connector is available in the current session, use it to fetch the same reports directly.
   - If no usable data is present, ask for a Firebase/GA4 funnel screenshot, retention screenshot, or BigQuery export CSV.
2. Prefer product decisions over vanity summaries. Lead with the largest conversion leak, likely cause, and next experiment.
3. Tie every recommendation to a measurable event or funnel step.
4. Do not print raw user IDs, emails, tokens, or other personal data.

## Martie Metrics To Prioritize

Use `references/metric-playbook.md` for the full playbook. The default analysis order is:

1. Activation: `first_open/app_launch -> daily_quiz_started -> daily_quiz_completed -> signup_completed`
2. D1 loop: `daily_quiz_completed -> next-day daily_quiz_completed`
3. Return CTA: `daily_quiz_completed -> daily_return_cta_shown -> daily_return_cta_pressed -> daily_quiz_started -> daily_quiz_completed`
4. Referral: `share_initiated`, `share_completed`, `acquisition_source_captured`, `signup_completed`
5. Segments: `source`, `acquisition_source`, `language`, `app_platform`, `is_premium`

## Script Usage

Analyze exported Firebase/GA4 files:

```bash
python3 .agents/skills/analyze/scripts/analyze_martie_metrics.py \
  --from-date 2026-05-01 \
  --to-date 2026-05-07 \
  --file /path/to/firebase-ga4-export.csv
```

Supported inputs:

- Firebase/GA4 exploration CSV
- BigQuery event export CSV/JSON/JSONL
- Generic event CSV with event, user, time, and property columns

Useful Firebase/GA4 export columns:

- event: `event_name`, `event`, `Event Name`
- user: `user_pseudo_id`, `user_id`, `distinct_id`, `User ID`
- time: `event_timestamp`, `event_date`, `timestamp`, `time`, `Date`

## Response Shape

Answer in Korean unless the user asks otherwise.

Start with:

- period and source
- biggest leak or strongest positive signal
- one primary recommendation

Then include:

- activation funnel table
- D1 retention
- segment notes
- 3 ranked experiments with success metrics
- exact app/event changes needed, if implementation is requested

When data quality is weak, say what cannot be concluded and list the minimum next export needed.
