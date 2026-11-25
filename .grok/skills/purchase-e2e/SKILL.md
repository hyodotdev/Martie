---
name: purchase-e2e
description: Run Martie's live in-app purchase E2E on physical devices: buy a sandbox consumable on iOS (App Store sandbox), Google Play (license tester), and Fire OS (Amazon App Tester), confirm Martie's own Convex verification grants it, then re-verify the same receipt on production IAPKit and require a Sandbox verdict. Horizon OS is recorded as not applicable until Martie sells there. Use when the user runs `/purchase-e2e` or `$purchase-e2e`, asks for purchase/IAP/receipt E2E, sandbox or App Tester purchase checks, or IAPKit receipt verification for Martie.
---

# Purchase E2E (Grok)

Canonical definition: `.agents/skills/purchase-e2e/SKILL.md`.

Read that file — and every reference it points to — and follow it as
written. It is agent-neutral, so no section of it is written for another
agent. Relative paths inside it resolve under
`.agents/skills/purchase-e2e/`.

## Grok Notes

- Sibling skills written as `$name` are Grok skills; invoke them as `/name` or
  `/skills <name>`.
- Grok has no built-in scheduler. For any interval or recurring step, finish the
  current round and report that automatic re-entry could not be scheduled.
  Never emulate it with `sleep`, `while true`, or a detached background process.
