---
name: commit
description: Commit Martie repository changes safely. Use when the user runs `/commit` or `$commit`, asks to commit, push, or open a PR. Handles branch checks, conventional commit messages, validation, staging, push, and optional PR creation.
---

# Commit

Use `references/workflow.md` as the detailed branch, commit, push, and PR checklist.

## Workflow

1. Inspect `git status --short`, current branch, and relevant diffs.
2. Never stage or revert unrelated user changes.
3. If committing, use Angular Conventional Commits: `<type>(<scope>): <subject>`.
4. Run appropriate checks before committing:
   - `bun lint:all`
   - `bun tsc --noEmit`
   - `bun test`
5. Stage only the intended files unless the user explicitly asks for all changes.
6. Do not add agent attribution or generated-by footers.
7. Push or create a PR only when the user asks for it.

## Reference

Read `references/workflow.md` when the request needs the full branch, push, label, or PR workflow.
