---
name: grow
description: Run one growth round for Martie's App Store and Play Store ranking. Read the ledger, pull the metrics directly from Convex production and the public store endpoints without asking the user, pick the single highest-leverage lever from the backlog, ship it through the normal review path, and record it as a hypothesis with a verification date. Use when the user runs `/grow` or `$grow`, asks to raise the store ranking, improve retention or conversion against numbers, pick the next growth experiment, or judge whether the last one worked. One lever per round.
---

# Growth Round (Grok)

Canonical definition: `.agents/skills/grow/SKILL.md`.

Read that file — and every reference it points to — and follow it as
written. It is agent-neutral, so no section of it is written for another
agent. Relative paths inside it resolve under
`.agents/skills/grow/`.

## Grok Notes

- Sibling skills written as `$name` are Grok skills; invoke them as `/name` or
  `/skills <name>`.
- Grok has no built-in scheduler. For any interval or recurring step, finish the
  current round and report that automatic re-entry could not be scheduled.
  Never emulate it with `sleep`, `while true`, or a detached background process.
