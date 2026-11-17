---
name: review-pr
description: Review Martie GitHub pull requests. Use when the user runs `/review-pr` or `$review-pr`, asks for PR review, wants actionable findings, or asks to address PR review comments.
---

# Review PR

Default to a code-review stance: findings first, ordered by severity, with file/line references. Use GitHub connector tools when available; otherwise use `gh` and local git commands.

## Workflow

1. Identify the PR, base branch, changed files, and discussion context.
2. Read the patch and relevant surrounding code.
3. Prioritize bugs, regressions, missing tests, data loss, privacy, and production risks.
4. Apply Martie rules from `CLAUDE.md` and `AGENTS.md`, especially pagination and TypeScript constraints.
5. If replying to PR comments, follow the formatting rules in `references/workflow.md`.
6. Do not request changes for style-only preferences unless they create concrete risk.

## Review Comment Handling

When addressing review comments, fix the issue in the current PR, commit, push, reply to the exact review comment with the plain commit hash, then resolve only that thread. Do not resolve unrelated threads blindly. If a suggestion cannot be applied safely, reply with the concrete reason and evidence, and leave it unresolved unless the user explicitly asks to resolve it.

## Reference

Read `references/workflow.md` for the full PR-review workflow and reply formatting constraints.
