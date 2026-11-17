---
name: seed-articles
description: Generate and seed multilingual Martie article content. Use when the user runs `/seed-articles` or `$seed-articles`, asks to create blog/article seed data, seed Convex articles, or upload article thumbnails.
---

# Seed Articles (Codex)

Canonical definition: `.agents/skills/seed-articles/SKILL.md`.

Read that file — and every reference it points to — and follow it as
written. It is agent-neutral, so no section of it is written for another
agent. Relative paths inside it resolve under
`.agents/skills/seed-articles/`.

## Codex Notes

- Sibling skills written as `$name` are Codex skills; invoke them directly.
- This skill's Codex interface metadata lives in `agents/openai.yaml`.
- For any interval or recurring step, use a Codex automation. Never emulate it
  with `sleep`, `while true`, or a detached background process.
