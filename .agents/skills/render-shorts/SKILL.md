---
name: render-shorts
description: Render Martie quiz Shorts/Reels/TikTok assets. Use when the user runs `/render-shorts` or `$render-shorts`, asks to create short videos, render Remotion quiz shorts, generate thumbnails, metadata, schedules, or upload-ready assets.
---

# Render Shorts

Use `references/workflow.md` for the detailed content, anti-duplication, rendering, thumbnail, and upload metadata rules.

## Workflow

1. Parse the requested date or `--week` range.
2. Read history before selecting quizzes, BGM, title templates, thumbnails, and publish times.
3. Avoid repeated creative patterns and honor the blacklists in the reference.
4. Generate KO/EN/JA outputs and matching metadata.
5. Update history only after successful generation.
6. Ask before performing actual YouTube upload or destructive schedule cancellation.
7. Report generated paths and any skipped/failed artifacts.

## Reference

Read `references/workflow.md` before doing this work. It contains the detailed Shorts strategy and command sequence.
