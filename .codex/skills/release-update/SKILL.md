---
name: release-update
description: Build, verify, submit, and publish Martie releases through EAS Build, Expo Updates, Google Play, and App Store Connect. Use when the user runs `/release-update` or `$release-update`, asks to release or deploy Martie, upload IPA/AAB artifacts, submit store builds for review, add release notes, choose between a native build and OTA update, or finish a version rollout after review and E2E.
---

# Release Update (Codex)

Canonical definition: `.agents/skills/release-update/SKILL.md`.

Read that file — and every reference it points to — and follow it as
written. It is agent-neutral, so no section of it is written for another
agent. Relative paths inside it resolve under
`.agents/skills/release-update/`.

## Codex Notes

- Sibling skills written as `$name` are Codex skills; invoke them directly.
- This skill's Codex interface metadata lives in `agents/openai.yaml`.
- For any interval or recurring step, use a Codex automation. Never emulate it
  with `sleep`, `while true`, or a detached background process.
