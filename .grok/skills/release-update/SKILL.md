---
name: release-update
description: Build, verify, submit, and publish Martie releases through EAS Build, Codemagic Patch OTA updates, Google Play, App Store Connect, the Amazon Appstore (Fire OS, Vega OS), and the Meta Horizon Store. Use when the user runs `/release-update` or `$release-update`, asks to release or deploy Martie, upload IPA/AAB artifacts, submit store builds for review, add release notes, choose between a native build and OTA update, or finish a version rollout after review and E2E.
---

# Release Update (Grok)

Canonical definition: `.agents/skills/release-update/SKILL.md`.

Read that file — and every reference it points to — and follow it as
written. It is agent-neutral, so no section of it is written for another
agent. Relative paths inside it resolve under
`.agents/skills/release-update/`.

## Grok Notes

- Sibling skills written as `$name` are Grok skills; invoke them as `/name` or
  `/skills <name>`.
- Grok has no built-in scheduler. For any interval or recurring step, finish the
  current round and report that automatic re-entry could not be scheduled.
  Never emulate it with `sleep`, `while true`, or a detached background process.
