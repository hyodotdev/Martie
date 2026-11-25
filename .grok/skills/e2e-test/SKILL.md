---
name: e2e-test
description: Run Martie end-to-end UX regression tests on a physical Android device. Use when the user runs `/e2e-test` or `$e2e-test`, asks for E2E testing, on-device validation, first-time-user daily quiz retention checks, quiz completion/replay blank-screen regressions, or Growtoki event/crash verification before or after EAS updates.
---

# E2E Test (Grok)

Canonical definition: `.agents/skills/e2e-test/SKILL.md`.

Read that file — and every reference it points to — and follow it as
written. It is agent-neutral, so no section of it is written for another
agent. Relative paths inside it resolve under
`.agents/skills/e2e-test/`.

## Grok Notes

- Sibling skills written as `$name` are Grok skills; invoke them as `/name` or
  `/skills <name>`.
- Grok has no built-in scheduler. For any interval or recurring step, finish the
  current round and report that automatic re-entry could not be scheduled.
  Never emulate it with `sleep`, `while true`, or a detached background process.
