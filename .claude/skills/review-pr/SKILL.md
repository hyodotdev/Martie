---
name: review-pr
description: Review Martie GitHub pull requests. Use when the user runs `/review-pr` or `$review-pr`, asks for PR review, wants actionable findings, or asks to address PR review comments.
---

# Review PR (Claude Code)

Canonical definition: `.agents/skills/review-pr/SKILL.md`.

Read that file — and every reference it points to — and follow it as
written. It is agent-neutral, so no section of it is written for another
agent. Relative paths inside it resolve under
`.agents/skills/review-pr/`.

## Claude Code Notes

- Sibling skills written as `$name` in the canonical file are Claude Code
  skills; invoke them as `/name` or through the Skill tool.
- Use the Agent tool (`Explore`) for read-only fan-out when the canonical file
  asks for independent review lenses.
- For any interval or recurring step, use `ScheduleWakeup` or `/loop`. Never
  emulate it with `sleep`, `while true`, or a detached background process.
