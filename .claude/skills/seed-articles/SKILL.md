---
name: seed-articles
description: Generate and seed multilingual Martie article content. Use when the user runs `/seed-articles` or `$seed-articles`, asks to create blog/article seed data, seed Convex articles, or upload article thumbnails.
---

# Seed Articles (Claude Code)

Canonical definition: `.agents/skills/seed-articles/SKILL.md`.

Read that file — and every reference it points to — and follow it as
written. It is agent-neutral, so no section of it is written for another
agent. Relative paths inside it resolve under
`.agents/skills/seed-articles/`.

## Claude Code Notes

- Sibling skills written as `$name` in the canonical file are Claude Code
  skills; invoke them as `/name` or through the Skill tool.
- Use the Agent tool (`Explore`) for read-only fan-out when the canonical file
  asks for independent review lenses.
- For any interval or recurring step, use `ScheduleWakeup` or `/loop`. Never
  emulate it with `sleep`, `while true`, or a detached background process.
