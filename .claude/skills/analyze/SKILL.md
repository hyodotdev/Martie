---
name: analyze
description: Analyze Martie Firebase Analytics, GA4 exports, activation funnels, referral loops, D1/D7 retention, and growth experiments. Use when the user runs `/analyze` or `$analyze`, "analyze", "분석해줘", asks to review Martie metrics, Firebase/GA4 screenshots or CSVs, retention, funnels, product analytics, or wants the app improved from analytics data.
---

# Martie Analytics (Claude Code)

Canonical definition: `.agents/skills/analyze/SKILL.md`.

Read that file — and every reference it points to — and follow it as
written. It is agent-neutral, so no section of it is written for another
agent. Relative paths inside it resolve under
`.agents/skills/analyze/`.

## Claude Code Notes

- Sibling skills written as `$name` in the canonical file are Claude Code
  skills; invoke them as `/name` or through the Skill tool.
- Use the Agent tool (`Explore`) for read-only fan-out when the canonical file
  asks for independent review lenses.
- For any interval or recurring step, use `ScheduleWakeup` or `/loop`. Never
  emulate it with `sleep`, `while true`, or a detached background process.
