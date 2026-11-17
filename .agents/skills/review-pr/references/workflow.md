# Review PR Comments

Review and address PR review comments for this repository.

## Arguments

- `$ARGUMENTS` - PR number (e.g., `65`) or PR URL

## Project-Specific Build Commands

Based on changed files, run these checks BEFORE committing:

| Area | Commands |
|------|----------|
| Convex backend | `npx convex dev --once` |
| TypeScript | `bunx tsc --noEmit` |
| App | `bun start` to verify no crash |

## Project Conventions

When reviewing, check these project-specific rules:
- **Convex schema**: Table definitions in `convex/schema/`, imported in `convex/schema.ts`
- **i18n**: All user-facing strings must be in `assets/langs/` (9 languages: en, ko, ja, de, es, fr, th, tw, vi)
- **Responsive**: Use `isTablet` from `useCPK()` for tablet-specific layouts
- **Styling**: Use `@emotion/native` styled components and `css` template literals
- **Stores**: Zustand stores in `src/stores/`

## Response Rules (CRITICAL)

**NEVER respond with "will address in a follow-up" or "will fix later".** Fix ALL review comments NOW in the current PR. Every comment must be addressed with a code fix and committed before replying. No exceptions.

For each comment:
1. **Read the code** mentioned in the comment
2. **Fix it** immediately
3. **Commit and push**
4. **Reply** with the commit hash (plain text, no backticks)
5. **Track the thread ID** of each comment you replied to
6. **Resolve ONLY the threads you replied to** — do NOT resolve all threads blindly:

```bash
gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "THREAD_ID"}) { thread { isResolved } } }'
```

**IMPORTANT:** Only resolve threads where you posted a fix reply. The user may want to manually review and resolve other threads.

## Reply Format Rules (CRITICAL)

When replying to PR comments:

### Commit Hash Formatting

**NEVER wrap commit hashes in backticks or code blocks.** GitHub only auto-links plain text commit hashes.

| Format | Example | Result |
|--------|---------|--------|
| CORRECT | `Fixed in f3b5fec.` | Clickable link to commit |
| WRONG | `Fixed in \`f3b5fec\`.` | Plain text, no link |

**Examples of correct replies:**

```text
Fixed in f3b5fec.

**Changes:**
- Updated component styling
```
