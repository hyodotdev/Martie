---
name: commit
description: Commit Martie repository changes safely. Use when the user runs `/commit` or `$commit`, asks to commit, push, or open a PR. Handles branch checks, conventional commit messages, validation, staging, push, and optional PR creation.
---

# Commit (Grok)

Canonical definition: `.agents/skills/commit/SKILL.md`.

Read that file — and every reference it points to — and follow it as
written. It is agent-neutral, so no section of it is written for another
agent. Relative paths inside it resolve under
`.agents/skills/commit/`.

## Grok Notes

- Sibling skills written as `$name` are Grok skills; invoke them as `/name` or
  `/skills <name>`.
- Grok has no built-in scheduler. For any interval or recurring step, finish the
  current round and report that automatic re-entry could not be scheduled.
  Never emulate it with `sleep`, `while true`, or a detached background process.
