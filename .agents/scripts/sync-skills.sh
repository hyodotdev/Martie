#!/usr/bin/env bash
# Generates the per-agent skill pointers from the canonical .agents/skills SSOT.
# Re-runnable: it overwrites every pointer it owns.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

canonical_dir=".agents/skills"

claude_notes() {
  cat <<'EOF'
## Claude Code Notes

- Sibling skills written as `$name` in the canonical file are Claude Code
  skills; invoke them as `/name` or through the Skill tool.
- Use the Agent tool (`Explore`) for read-only fan-out when the canonical file
  asks for independent review lenses.
- For any interval or recurring step, use `ScheduleWakeup` or `/loop`. Never
  emulate it with `sleep`, `while true`, or a detached background process.
EOF
}

codex_notes() {
  cat <<'EOF'
## Codex Notes

- Sibling skills written as `$name` are Codex skills; invoke them directly.
- This skill's Codex interface metadata lives in `agents/openai.yaml`.
- For any interval or recurring step, use a Codex automation. Never emulate it
  with `sleep`, `while true`, or a detached background process.
EOF
}

grok_notes() {
  cat <<'EOF'
## Grok Notes

- Sibling skills written as `$name` are Grok skills; invoke them as `/name` or
  `/skills <name>`.
- Grok has no built-in scheduler. For any interval or recurring step, finish the
  current round and report that automatic re-entry could not be scheduled.
  Never emulate it with `sleep`, `while true`, or a detached background process.
EOF
}

write_pointer() {
  local agent_dir="$1" agent_label="$2" notes_fn="$3" name="$4" title="$5" description="$6"
  local out="$agent_dir/skills/$name/SKILL.md"
  mkdir -p "$(dirname "$out")"
  {
    printf -- '---\n'
    printf -- 'name: %s\n' "$name"
    printf -- 'description: %s\n' "$description"
    printf -- '---\n\n'
    printf -- '# %s (%s)\n\n' "$title" "$agent_label"
    printf -- 'Canonical definition: `%s/%s/SKILL.md`.\n\n' "$canonical_dir" "$name"
    printf -- 'Read that file — and every reference it points to — and follow it as\n'
    printf -- 'written. It is agent-neutral, so no section of it is written for another\n'
    printf -- 'agent. Relative paths inside it resolve under\n'
    printf -- '`%s/%s/`.\n\n' "$canonical_dir" "$name"
    "$notes_fn"
  } > "$out"
}

for dir in "$canonical_dir"/*/; do
  name="$(basename "$dir")"
  skill="${dir%/}/SKILL.md"
  description="$(awk 'NR>1 && /^description: /{sub(/^description: /,""); print; exit}' "$skill")"
  title="$(awk '/^# /{sub(/^# /,""); print; exit}' "$skill")"
  [ -n "$description" ] || { echo "missing description: $skill" >&2; exit 1; }
  [ -n "$title" ] || { echo "missing title: $skill" >&2; exit 1; }
  case "$description" in
    '>'*|'|'*)
      echo "multi-line description is not supported: $skill" >&2; exit 1 ;;
  esac

  write_pointer .claude "Claude Code" claude_notes "$name" "$title" "$description"
  write_pointer .codex  "Codex"       codex_notes  "$name" "$title" "$description"
  write_pointer .grok   "Grok"        grok_notes   "$name" "$title" "$description"
  echo "generated: $name"
done

# Prune pointers whose canonical skill is gone, so no agent advertises a skill
# that resolves to a missing file. Only the generated SKILL.md is removed;
# anything else in the directory is reported and left alone.
for agent_dir in .claude .codex .grok; do
  [ -d "$agent_dir/skills" ] || continue
  for pointer in "$agent_dir"/skills/*/; do
    name="$(basename "$pointer")"
    [ -d "$canonical_dir/$name" ] && continue
    rm -f "${pointer%/}/SKILL.md"
    rmdir "${pointer%/}" 2>/dev/null ||
      echo "pruned pointer, kept remaining files: ${pointer%/}" >&2
    echo "pruned: $agent_dir/$name"
  done
done
