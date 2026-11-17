---
name: update-version
description: Update Martie app version and optional force-update records. Use when the user runs `/update-version` or `$update-version`, asks to bump the app version, release a version, or configure Convex force update behavior.
---

# Update Version (Claude Code)

Canonical definition: `.agents/skills/update-version/SKILL.md`.

Read that file — and every reference it points to — and follow it as
written. It is agent-neutral, so no section of it is written for another
agent. Relative paths inside it resolve under
`.agents/skills/update-version/`.

## Claude Code Notes

- Sibling skills written as `$name` in the canonical file are Claude Code
  skills; invoke them as `/name` or through the Skill tool.
- Use the Agent tool (`Explore`) for read-only fan-out when the canonical file
  asks for independent review lenses.
- For any interval or recurring step, use `ScheduleWakeup` or `/loop`. Never
  emulate it with `sleep`, `while true`, or a detached background process.
