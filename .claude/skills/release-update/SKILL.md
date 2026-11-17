---
name: release-update
description: Build, verify, submit, and publish Martie releases through EAS Build, Codemagic Patch OTA updates, Google Play, and App Store Connect. Use when the user runs `/release-update` or `$release-update`, asks to release or deploy Martie, upload IPA/AAB artifacts, submit store builds for review, add release notes, choose between a native build and OTA update, or finish a version rollout after review and E2E.
---

# Release Update (Claude Code)

Canonical definition: `.agents/skills/release-update/SKILL.md`.

Read that file — and every reference it points to — and follow it as
written. It is agent-neutral, so no section of it is written for another
agent. Relative paths inside it resolve under
`.agents/skills/release-update/`.

## Claude Code Notes

- Sibling skills written as `$name` in the canonical file are Claude Code
  skills; invoke them as `/name` or through the Skill tool.
- Use the Agent tool (`Explore`) for read-only fan-out when the canonical file
  asks for independent review lenses.
- For any interval or recurring step, use `ScheduleWakeup` or `/loop`. Never
  emulate it with `sleep`, `while true`, or a detached background process.
