---
name: render-shorts
description: Render Martie quiz Shorts/Reels/TikTok assets. Use when the user runs `/render-shorts` or `$render-shorts`, asks to create short videos, render Remotion quiz shorts, generate thumbnails, metadata, schedules, or upload-ready assets.
---

# Render Shorts (Grok)

Canonical definition: `.agents/skills/render-shorts/SKILL.md`.

Read that file — and every reference it points to — and follow it as
written. It is agent-neutral, so no section of it is written for another
agent. Relative paths inside it resolve under
`.agents/skills/render-shorts/`.

## Grok Notes

- Sibling skills written as `$name` are Grok skills; invoke them as `/name` or
  `/skills <name>`.
- Grok has no built-in scheduler. For any interval or recurring step, finish the
  current round and report that automatic re-entry could not be scheduled.
  Never emulate it with `sleep`, `while true`, or a detached background process.
