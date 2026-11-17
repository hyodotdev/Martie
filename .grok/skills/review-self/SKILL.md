---
name: review-self
description: Independently review and improve Martie's current implementation, working-tree changes, or pull request; fix actionable in-scope gaps; rerun relevant verification; and recheck at five-minute intervals until stable. Use when the user runs `/review-self` or `$review-self`, asks the agent to review its own changes, requests a self-review loop, or wants current work monitored after implementation.
---

# Review Self (Grok)

Canonical definition: `.agents/skills/review-self/SKILL.md`.

Read that file — and every reference it points to — and follow it as
written. It is agent-neutral, so no section of it is written for another
agent. Relative paths inside it resolve under
`.agents/skills/review-self/`.

## Grok Notes

- Sibling skills written as `$name` are Grok skills; invoke them as `/name` or
  `/skills <name>`.
- Grok has no built-in scheduler. For any interval or recurring step, finish the
  current round and report that automatic re-entry could not be scheduled.
  Never emulate it with `sleep`, `while true`, or a detached background process.
