# Commit Changes

Complete workflow: branch → commit → push → PR

## Usage

```
/commit [options]
```

**Options:**
- `--push` or `-p`: Push to remote after commit
- `--pr`: Create PR after push
- `--all` or `-a`: Commit all changes at once
- `<path>`: Commit only specific path

## Examples

```bash
# Commit all and create PR
/commit --all --pr

# Just commit specific path
/commit src/modals

# Commit and push
/commit --push
```

## Complete Workflow

### 1. Check Branch

```bash
git branch --show-current
```

**If on `main`** → Create a feature branch first:
```bash
git checkout -b feat/<feature-name>
```

**If NOT on `main`** → Proceed with commits directly.

**Branch naming conventions:**
- `feat/<feature-name>` - New features
- `bugfix/<bug-description>` - Bug fixes
- `docs/<doc-update>` - Documentation only
- `refactor/<description>` - Refactoring
- `test/<description>` - Test changes
- `chore/<task>` - Maintenance tasks

For newly created branches, never use a tool or vendor prefix such as
`codex/`. Keep an existing branch name unless the user asks to rename it.

### 2. Check Current Status

```bash
git status
git diff --name-only
```

### 3. Stage Changes

**Specific path:**
```bash
git add <path>
```

**All changes:**
```bash
git add .
```

### 4. Review Staged Changes

```bash
git diff --cached --stat
git diff --cached --name-only
```

### 5. Pre-commit Checks (run locally before committing)

The husky pre-commit hook runs these automatically, but run them manually first to catch errors early:

```bash
bun lint:all
bun tsc --noEmit
bun test
```

If any check fails, fix the issues before committing.

### 6. Create Commit

Follow conventional commit format:

```bash
git commit -m "$(cat <<'EOF'
<type>(<scope>): <description>

<body - what changed and why>
EOF
)"
```

**Commit Types:**
| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code refactoring |
| `chore` | Maintenance tasks |
| `test` | Adding/updating tests |

**Scope Examples:**
- `ui` - UI components
- `convex` - Convex backend
- `quiz` - Quiz feature
- `iap` - In-app purchase
- `i18n` - Internationalization
- `config` - Configuration

### 7. Push to Remote

```bash
git push -u origin <branch-name>
```

### 8. Create Pull Request

First, fetch available labels from the repo:
```bash
gh label list --repo hyodotdev/Martie --limit 50
```

Then select appropriate labels based on the changes (e.g., `🎯 feature` for new features, `🐛 bug` for bug fixes, `📦 update packages` for dependency updates, `🏃🏻‍♀️ work in progress` for WIP, etc.).

```bash
gh pr create --title "<type>(<scope>): <description>" --body "$(cat <<'EOF'
## Summary

<1-3 bullet points describing changes>

## Changes

- Change 1
- Change 2

## Test plan

- [ ] App builds successfully
- [ ] Feature works on iOS
- [ ] Feature works on Android

🤖 Generated with [Claude Code](https://claude.ai/code)
EOF
)"
```

After creating the PR, add labels:
```bash
gh api repos/hyodotdev/Martie/issues/<PR_NUMBER>/labels --method POST -f 'labels[]=<label1>' -f 'labels[]=<label2>'
```

---

## Example Commit Messages

**Feature:**
```
feat(quiz): add force update modal for version control

- Add appVersions table to Convex schema
- Create ForceUpdateModal component
- Add i18n strings for 9 languages
```

**Bug fix:**
```
fix(ui): center home screen content on iPad portrait

- Add justify-content center to TabIndexMobile
- Add flexGrow to ScrollView contentContainerStyle
```

---

## Quick Reference

```bash
# Full workflow
git checkout -b feat/my-feature
git add .
git commit -m "feat: add new feature"
git push -u origin feat/my-feature
gh pr create --title "feat: add new feature" --body "..."
```
