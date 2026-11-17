---
name: update-version
description: Update Martie app version and optional force-update records. Use when the user runs `/update-version` or `$update-version`, asks to bump the app version, release a version, or configure Convex force update behavior.
---

# Update Version (Grok)

Canonical definition: `.agents/skills/update-version/SKILL.md`.

Read that file — and every reference it points to — and follow it as
written. It is agent-neutral, so no section of it is written for another
agent. Relative paths inside it resolve under
`.agents/skills/update-version/`.

## Grok Notes

- Sibling skills written as `$name` are Grok skills; invoke them as `/name` or
  `/skills <name>`.
- Grok has no built-in scheduler. For any interval or recurring step, finish the
  current round and report that automatic re-entry could not be scheduled.
  Never emulate it with `sleep`, `while true`, or a detached background process.
