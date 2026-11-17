---
name: render-shorts
description: Render Martie quiz Shorts/Reels/TikTok assets. Use when the user runs `/render-shorts` or `$render-shorts`, asks to create short videos, render Remotion quiz shorts, generate thumbnails, metadata, schedules, or upload-ready assets.
---

# Render Shorts (Claude Code)

Canonical definition: `.agents/skills/render-shorts/SKILL.md`.

Read that file — and every reference it points to — and follow it as
written. It is agent-neutral, so no section of it is written for another
agent. Relative paths inside it resolve under
`.agents/skills/render-shorts/`.

## Claude Code Notes

- Sibling skills written as `$name` in the canonical file are Claude Code
  skills; invoke them as `/name` or through the Skill tool.
- Use the Agent tool (`Explore`) for read-only fan-out when the canonical file
  asks for independent review lenses.
- For any interval or recurring step, use `ScheduleWakeup` or `/loop`. Never
  emulate it with `sleep`, `while true`, or a detached background process.
