---
name: update-version
description: Update Martie app version and optional force-update records. Use when the user runs `/update-version` or `$update-version`, asks to bump the app version, release a version, or configure Convex force update behavior.
---

# Update Version

Use `references/workflow.md` as the detailed version and force-update checklist.

## Workflow

1. Parse the requested semantic version and whether `--force` was requested.
2. Update `package.json` version only, unless the local project has another established version source.
3. For `--force`, warn that the store version must already be available to users.
4. Run Convex dev/prod force-update commands only when explicitly requested.
5. Verify the changed files and report exact commands run.

## Reference

Read `references/workflow.md` for the full version workflow and related files.
