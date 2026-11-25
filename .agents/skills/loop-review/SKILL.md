---
name: loop-review
description: Run Martie's complete change-to-merge loop from the latest origin/main; create a semantic branch, implement and verify the change, stabilize with review-self, commit and open a PR, poll CI every five minutes and fall back to review-self when CodeRabbit is silent, fix and reverify findings, gate device regression, and merge only when the exact head is clean. Use when the user runs `/loop-review` or `$loop-review`, or asks for the recurring review-self then commit --pr then review-pr until clean then merge workflow.
---

# Loop Review

Own one Martie change from a fresh `main` baseline through a verified merge.
Delegate to the sibling skill that owns a procedure instead of restating it.
Only the steps no sibling skill owns — external reviewer requests, polling, the
device-regression gate, and the merge — are specified here.

## Load The Workflows

Read before acting:

- `AGENTS.md` and `CLAUDE.md`
- `$review-self`, `$commit`, `$review-pr`, `$e2e-test`

An explicit invocation authorizes the in-scope commit, push, PR creation,
review replies, thread resolution, and merge for this task. It does not
authorize `$release-update`, store submission, Expo updates, seeding production
data, or unrelated cleanup.

## 1. Start From Current Main

1. Snapshot `git status --short --branch`. Preserve every existing change.
2. For a new task, require a clean worktree, then `git fetch origin`, switch to
   `main`, and `git pull --ff-only origin main`.
3. Confirm local `main` equals `origin/main`, then create a semantic branch
   using the naming rules in `$commit` — `feat/`, `bugfix/`, `docs/`,
   `refactor/`, `test/`, or `chore/`. Never a tool or vendor prefix.
4. Record the starting main SHA. The implementation diff must descend from it.

If invoked for work already in progress, treat it as a resumed loop. Do not
stash, reset, switch branches, or discard anything. Verify the merge base and
stop for direction when an update from `origin/main` would disturb unrelated
user work.

## 2. Implement And Verify

Implement the requested scope only. Run the checks the touched paths require:

- `bun lint:all`
- `bun tsc --noEmit`
- `bun test`
- `npx convex dev --once` when `convex/` changed

The husky `pre-commit` hook runs the first three and `commit-msg` runs
commitlint, so a commit that skips them still fails. Never use `--no-verify`.
Do not continue while a required check is known to fail.

## 3. Stabilize With Review Self

Run `$review-self` immediately against the complete base-to-worktree diff. Fix
every validated in-scope finding and rerun the affected verification. Continue
its five-minute rounds until two consecutive complete snapshots are clean, as
that skill defines. Any material diff change resets the clean count.

Keep loop state out of tracked files. Never emulate the interval with a shell
sleep loop or a detached background process.

## 4. Commit And Open The PR

Follow `$commit` with push and PR:

- Stage only files owned by this task.
- Write an English Angular Conventional Commit subject.
- Push the semantic branch and open an English PR against `main`.
- Apply 1–3 existing repository labels; never invent new ones.

`$commit` does not request external reviewers, so this loop does it. CodeRabbit
is the only configured external reviewer:

```bash
gh pr comment <pr> --body "@coderabbitai review"
```

Never block on the response. Post the request, then run the exact-head
`$review-self` fallback in the same round so the head has review coverage
immediately. CodeRabbit is frequently silent on this repository, and waiting on
it stalls the loop for nothing. If it does report later on that same head,
handle its findings as a new round.

When the pushed head is identical to the diff step 3 already stabilized, record
that coverage against the head SHA instead of repeating the round. Any later
push invalidates it.

Do not request or trigger any other review bot. Copilot is not enabled here —
the `requested_reviewers` API accepts `reviewers[]=Copilot` and silently adds
nobody, so never treat its success as coverage.

Record the PR number and the exact head SHA. Every push invalidates all prior
clean review coverage.

## 5. Poll Until The Exact Head Is Clean

Run `$review-pr` immediately, then re-enter it every five minutes through the
product's recurring wake-up mechanism. `loop-review` is the only polling owner;
`review-pr` performs one pass per round.

Each round:

1. Fetch unresolved threads, review state, current head SHA, and required CI.
2. Fix all valid findings in one coherent batch, push, reply to the exact inline
   comment with the plain commit hash, and resolve only the threads you replied
   to with a fix.
3. Rerun the checks the batch affects plus everything previously failing.
4. After a head change, redo step 4 for the new SHA — re-request CodeRabbit and
   re-establish head coverage, since the push invalidated the previous round.
   Never substitute a different review bot for one that is unavailable.
5. Keep polling while CI is pending or a reviewer has reported findings you
   have not handled. A missing CodeRabbit response never holds the loop open.
   Do not rerun expensive unchanged local checks on a no-op poll, and never
   retrigger a review bot on a no-op.

Clean means all of these hold for the same head SHA:

- zero unresolved actionable review threads;
- the head has review coverage — either CodeRabbit reported on it with nothing
  actionable left, or the exact-head `$review-self` fallback ran clean;
- every required CI check is terminal and successful;
- the PR is mergeable and carries every required update from `main`;
- the worktree is clean and the final diff has been reread.

## 6. Gate Device Regression Before Merging

Decide this **before** merging, not after.

Require `$e2e-test` when the diff touches user-facing behavior or native
wiring — `app/`, `src/`, `assets/langs/`, quiz or league flows, purchases, ads,
`android/`, `ios/`, `app.config.ts`, `eas.json`, or dependency changes that
reach the runtime.

When it is required, **stop without merging even if the PR is otherwise
clean**. Report the scenarios the diff implicates and hand back to the user.
Two things clear the gate, and both are recorded on the PR first:

1. An `$e2e-test` run covering the implicated scenarios, with its result posted.
2. An explicit written waiver from the user in this conversation, naming what is
   waived and why. Record it verbatim on the PR.

Absence of an objection is not a waiver, and the loop never grants itself one.
Green CI is not a substitute — CI does not run the app on a device, complete a
quiz, or exercise purchase dialogs. An emulator or simulator run does not clear
the gate either; `$e2e-test` runs on a physical device.

A change confined to documentation, agent skills, repository automation, or
seed tooling does not need device regression. Say so explicitly and name the
paths that justify it; silence reads as an untested merge.

## 7. Merge And Close The Loop

Immediately before merging, refetch the PR and confirm its head still equals the
clean reviewed SHA. Squash merge with branch deletion unless a stricter policy
applies. Never bypass branch protection or merge a stale, pending, or failing
head.

After merge:

1. Confirm the PR state is `MERGED` and record the merge commit.
2. Delete the `@coderabbitai review` trigger comments this loop posted and any
   CodeRabbit terminal "review skipped/unavailable" notices. Never delete human
   comments, inline replies, or substantive review feedback.
3. Switch to `main` and fast-forward from `origin/main` when that cannot disturb
   other work.
4. Report the PR, merge commit, final checks, review coverage, and anything
   skipped. Do not release or deploy unless separately requested.

## Stop Conditions

Stop without merging when a required decision lacks authority, the same finding
survives two fix attempts, the same access or tool blocker repeats three rounds,
required device regression has not run, or the exact head cannot satisfy the
clean gate. Report the concrete blocker. Never describe a pending or partially
reviewed PR as clean.
