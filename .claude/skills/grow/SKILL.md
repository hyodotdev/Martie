---
name: grow
description: Run one growth round for Martie's App Store and Play Store ranking. Read the ledger, pull the metrics directly from Convex production and the public store endpoints without asking the user, pick the single highest-leverage lever from the backlog, ship it through the normal review path, and record it as a hypothesis with a verification date. Use when the user runs `/grow` or `$grow`, asks to raise the store ranking, improve retention or conversion against numbers, pick the next growth experiment, or judge whether the last one worked. One lever per round.
---

# Growth Round (Claude Code)

Canonical definition: `.agents/skills/grow/SKILL.md`.

Read that file — and every reference it points to — and follow it as
written. It is agent-neutral, so no section of it is written for another
agent. Relative paths inside it resolve under
`.agents/skills/grow/`.

## Claude Code Notes

- Sibling skills written as `$name` in the canonical file are Claude Code
  skills; invoke them as `/name` or through the Skill tool.
- Use the Agent tool (`Explore`) for read-only fan-out when the canonical file
  asks for independent review lenses.
- For any interval or recurring step, use `ScheduleWakeup` or `/loop`. Never
  emulate it with `sleep`, `while true`, or a detached background process.
