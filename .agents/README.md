# Agent Skills

One skill set, shared by every coding agent used on Martie.

## Layout

```text
.agents/skills/<name>/SKILL.md        # canonical definition (edit only here)
.agents/skills/<name>/references/     # long-form procedures the SKILL.md links
.agents/skills/<name>/scripts/        # helper scripts the SKILL.md links
.agents/scripts/sync-skills.sh        # regenerates every pointer below

.claude/skills/<name>/SKILL.md        # pointer, Claude Code notes
.codex/skills/<name>/SKILL.md         # pointer, Codex notes
.codex/skills/<name>/agents/openai.yaml  # Codex-only interface metadata
.grok/skills/<name>/SKILL.md          # pointer, Grok notes
```

Each agent discovers skills from its own directory, so all three see the same
names, the same `description` triggers, and the same procedure. Only the short
"Notes" section differs — it maps agent-neutral instructions (`$name`,
"schedule the next round") onto that agent's actual mechanism.

## Rules

- Edit `.agents/skills/<name>/SKILL.md` and its `references/`. Never edit a
  pointer by hand; `sync-skills.sh` overwrites it.
- Keep canonical files agent-neutral: no `ScheduleWakeup`, no `/loop`, no
  Codex- or Grok-specific tool names. Those belong in the per-agent notes.
- After any canonical change, run the sync so the `description` triggers stay
  identical across agents:

  ```bash
  bash .agents/scripts/sync-skills.sh
  ```

## Adding a skill

1. Create `.agents/skills/<name>/SKILL.md` with `name` and `description`
   frontmatter and an `# H1` title. Write the trigger as
   ``Use when the user runs `/<name>` or `$<name>`, ...`` so every agent's
   invocation syntax matches.
2. Put anything long in `.agents/skills/<name>/references/`.
3. Run `bash .agents/scripts/sync-skills.sh`.
4. Add `.codex/skills/<name>/agents/openai.yaml` if the skill should show up in
   the Codex skill picker.

## Current skills

| Skill | Purpose |
| --- | --- |
| `analyze` | Firebase/GA4 funnels, retention, growth experiments |
| `commit` | Branch checks, conventional commits, push, PR |
| `e2e-test` | On-device Android UX regression + Growtoki verification |
| `grow` | One metric-driven growth round for store ranking |
| `loop-review` | main → branch → review-self → PR → poll → verified merge |
| `release-update` | EAS build, store submit, Expo OTA rollout |
| `render-shorts` | Remotion quiz shorts, thumbnails, upload metadata |
| `review-pr` | PR review findings and review-comment handling |
| `review-self` | Self-review loop over the current work until stable |
| `seed-articles` | Generate and seed KO/EN/JA articles into Convex |
| `seed-quizzes` | Generate and seed KO/EN/JA quizzes into Convex |
| `update-version` | Version bump and Convex force-update records |
