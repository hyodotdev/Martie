---
name: seed-quizzes
description: Generate and seed multilingual Martie quiz content. Use when the user runs `/seed-quizzes` or `$seed-quizzes`, asks to create quiz seed data, seed Convex quizzes, or generate KO/EN/JA quiz translations.
---

# Seed Quizzes

Use `references/workflow.md` as the detailed schema, quality, duplicate-check, translation, and Convex seeding workflow.

## Workflow

1. Query existing quiz keys and localized questions before generating content.
2. Generate non-duplicative, fact-checked quiz data with one correct answer per quiz.
3. Keep KO/EN/JA language rows complete and natural.
4. Match existing seed file and Convex schema patterns.
5. Add temporary seed code only when needed, then remove it after seeding.
6. Run dev/prod Convex commands only when the user explicitly wants database writes.
7. Verify generated files and report cleanup status.

## Reference

Read `references/workflow.md` before editing or running seeds.
