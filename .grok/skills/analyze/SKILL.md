---
name: analyze
description: Analyze Martie Firebase Analytics, GA4 exports, activation funnels, referral loops, D1/D7 retention, and growth experiments. Use when the user runs `/analyze` or `$analyze`, "analyze", "분석해줘", asks to review Martie metrics, Firebase/GA4 screenshots or CSVs, retention, funnels, product analytics, or wants the app improved from analytics data.
---

# Martie Analytics (Grok)

Canonical definition: `.agents/skills/analyze/SKILL.md`.

Read that file — and every reference it points to — and follow it as
written. It is agent-neutral, so no section of it is written for another
agent. Relative paths inside it resolve under
`.agents/skills/analyze/`.

## Grok Notes

- Sibling skills written as `$name` are Grok skills; invoke them as `/name` or
  `/skills <name>`.
- Grok has no built-in scheduler. For any interval or recurring step, finish the
  current round and report that automatic re-entry could not be scheduled.
  Never emulate it with `sleep`, `while true`, or a detached background process.
