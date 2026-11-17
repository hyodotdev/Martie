---
name: review-self
description: Independently review and improve Martie's current implementation, working-tree changes, or pull request; fix actionable in-scope gaps; rerun relevant verification; and recheck at five-minute intervals until stable. Use when the user runs `/review-self` or `$review-self`, asks the agent to review its own changes, requests a self-review loop, or wants current work monitored after implementation.
---

# Review Self (Claude Code)

Canonical definition: `.agents/skills/review-self/SKILL.md`.

Read that file — and every reference it points to — and follow it as
written. It is agent-neutral, so no section of it is written for another
agent. Relative paths inside it resolve under
`.agents/skills/review-self/`.

## Claude Code Notes

- Sibling skills written as `$name` in the canonical file are Claude Code
  skills; invoke them as `/name` or through the Skill tool.
- Use the Agent tool (`Explore`) for read-only fan-out when the canonical file
  asks for independent review lenses.
- For any interval or recurring step, use `ScheduleWakeup` or `/loop`. Never
  emulate it with `sleep`, `while true`, or a detached background process.
