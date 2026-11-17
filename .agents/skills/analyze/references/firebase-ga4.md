# Firebase/GA4 Notes

Use Firebase Analytics or GA4 explorations as the default source.

Recommended reports:

1. Funnel exploration: `first_open -> daily_quiz_started -> daily_quiz_completed -> signup_completed`
2. Retention: users who trigger `daily_quiz_completed` and return to `daily_quiz_completed`
3. Funnel exploration: `daily_quiz_completed -> daily_return_cta_shown -> daily_return_cta_pressed`
4. Free-form table: events broken down by `source`, `acquisition_source`, `language`, and `app_platform`

For deeper analysis, use Firebase/GA4 BigQuery export and provide CSV/JSONL with:

- `event_name`
- `user_pseudo_id` or `user_id`
- `event_timestamp` or `event_date`
- event params such as `source`, `language`, `app_platform`, `is_premium`

When an MCP or connector for GA4/BigQuery is available, fetch these reports directly instead of asking the user for screenshots.
