---
name: seed-quizzes
description: Generate and seed multilingual Martie quiz content. Use when the user runs `/seed-quizzes` or `$seed-quizzes`, asks to create quiz seed data, seed Convex quizzes, or generate KO/EN/JA quiz translations.
---

# Seed Quizzes (Codex)

Canonical definition: `.agents/skills/seed-quizzes/SKILL.md`.

Read that file — and every reference it points to — and follow it as
written. It is agent-neutral, so no section of it is written for another
agent. Relative paths inside it resolve under
`.agents/skills/seed-quizzes/`.

## Codex Notes

- Sibling skills written as `$name` are Codex skills; invoke them directly.
- This skill's Codex interface metadata lives in `agents/openai.yaml`.
- For any interval or recurring step, use a Codex automation. Never emulate it
  with `sleep`, `while true`, or a detached background process.
