---
name: update-version
description: Update Martie app version and optional force-update records. Use when the user runs `/update-version` or `$update-version`, asks to bump the app version, release a version, or configure Convex force update behavior.
---

# Update Version (Codex)

Canonical definition: `.agents/skills/update-version/SKILL.md`.

Read that file — and every reference it points to — and follow it as
written. It is agent-neutral, so no section of it is written for another
agent. Relative paths inside it resolve under
`.agents/skills/update-version/`.

## Codex Notes

- Sibling skills written as `$name` are Codex skills; invoke them directly.
- This skill's Codex interface metadata lives in `agents/openai.yaml`.
- For any interval or recurring step, use a Codex automation. Never emulate it
  with `sleep`, `while true`, or a detached background process.
