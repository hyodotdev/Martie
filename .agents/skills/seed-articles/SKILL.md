---
name: seed-articles
description: Generate and seed multilingual Martie article content. Use when the user runs `/seed-articles` or `$seed-articles`, asks to create blog/article seed data, seed Convex articles, or upload article thumbnails.
---

# Seed Articles

Use `references/workflow.md` as the full source of truth for schema, content quality, duplicate checks, thumbnail handling, and Convex commands.

## Workflow

1. Query existing article keys and localized titles before generating content.
2. Generate non-duplicative, fact-checked article seed data in KO/EN/JA.
3. Use the existing `articles` and `articleLanguages` schema.
4. Verify thumbnail URLs before using them.
5. Add temporary seed code only when needed, then remove it after seeding.
6. Run dev/prod Convex commands only when the user explicitly wants database writes.
7. Summarize inserted files, commands run, and cleanup status.

## Reference

Read `references/workflow.md` before editing or running seeds.
