---
name: review-pr
description: Review Martie GitHub pull requests. Use when the user runs `/review-pr` or `$review-pr`, asks for PR review, wants actionable findings, or asks to address PR review comments.
---

# Review PR (Codex)

Canonical definition: `.agents/skills/review-pr/SKILL.md`.

Read that file — and every reference it points to — and follow it as
written. It is agent-neutral, so no section of it is written for another
agent. Relative paths inside it resolve under
`.agents/skills/review-pr/`.

## Codex Notes

- Sibling skills written as `$name` are Codex skills; invoke them directly.
- This skill's Codex interface metadata lives in `agents/openai.yaml`.
- For any interval or recurring step, use a Codex automation. Never emulate it
  with `sleep`, `while true`, or a detached background process.
