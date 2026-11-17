---
name: loop-review
description: Run Martie's complete change-to-merge loop from the latest origin/main; create a semantic branch, implement and verify the change, stabilize with review-self, commit and open a PR, poll CI every five minutes and fall back to review-self when CodeRabbit is silent, fix and reverify findings, gate device regression, and merge only when the exact head is clean. Use when the user runs `/loop-review` or `$loop-review`, or asks for the recurring review-self then commit --pr then review-pr until clean then merge workflow.
---

# Loop Review (Grok)

Canonical definition: `.agents/skills/loop-review/SKILL.md`.

Read that file — and every reference it points to — and follow it as
written. It is agent-neutral, so no section of it is written for another
agent. Relative paths inside it resolve under
`.agents/skills/loop-review/`.

## Grok Notes

- Sibling skills written as `$name` are Grok skills; invoke them as `/name` or
  `/skills <name>`.
- Grok has no built-in scheduler. For any interval or recurring step, finish the
  current round and report that automatic re-entry could not be scheduled.
  Never emulate it with `sleep`, `while true`, or a detached background process.
