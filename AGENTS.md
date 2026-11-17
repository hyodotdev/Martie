# Martie - Smart Trivia Quiz App

## Project Overview

React Native (Expo) + Convex backend trivia quiz app supporting 3 languages (ko, en, ja).

## Tech Stack

- **Frontend**: React Native, Expo Router, kstyled, cpk-ui
- **Backend**: Convex (serverless DB + functions)
- **Auth**: Convex Auth with Resend OTP
- **State**: Zustand, MMKV (local storage)
- **Languages**: TypeScript throughout

## Key Architecture

- `convex/schema/` — All table definitions (split by file)
- `convex/{domain}/mutations.ts` + `queries.ts` — Business logic per domain
- `app/` — Expo Router file-based routing
- `app/_Tabs/` — Tab-specific responsive components (Mobile/Tablet)
- `src/uis/` — Reusable UI components
- `assets/langs/*.json` — i18n strings (ko, en, ja + 6 more)
- `scripts/_seeds/` — Quiz seed data

## Conventions

- Admin accounts come from the `ADMIN_EMAILS` Convex env (comma-separated); never hardcode emails, keys or account identifiers — this repository is public (AGPL-3.0)
- Quiz text stored separately in `quizLanguages` table (key-based)
- Categories use UPPER_SNAKE_CASE names, localized via `categoriesMap.ts`

## Commit Messages

Always write commit messages in Angular Conventional Commits format.

- Format: `<type>(<scope>): <subject>`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`
- Subject: imperative, lowercase, no period, ~50 chars max
- Use scope when helpful, e.g. `auth`, `api`, `ui`

## Branch Names

- For every new branch, use a task-intent prefix: `feat/`, `bugfix/`,
  `docs/`, `refactor/`, `test/`, or `chore/`.
- Never create branches with tool or vendor prefixes such as `codex/`.
- Use a concise kebab-case description after the prefix.

## List & Pagination Rules

- Any list backed by user-generated, server-side, or otherwise unbounded data must use `FlashList` from `@shopify/flash-list`.
- Do not render unbounded data with `ScrollView + array.map()` or fetch the full collection with `useQuery`/Convex `.collect()` for screen lists.
- Pair `FlashList` with Convex pagination: `paginationOptsValidator` on the query, `usePaginatedQuery` on the client, and `onEndReached` for loading more.
- `ScrollView` is acceptable only for static/short-form content, fixed-size controls, forms, detail pages, or deliberately capped preview sections such as "top 5".
- If a query can grow over time, add the right index for the list sort/filter before adding pagination.

## TypeScript Rules

- **`any` 사용 절대 금지.** 완전히 불가능한 경우가 아니면 `any` 대신 구체적 타입, `unknown`, 제네릭, 타입 가드를 사용할 것.
- Convex Id 타입은 `Id<'tableName'>` 사용 (import from `convex/_generated/dataModel`)
- Expo Router 경로는 `as any` 없이 string literal 사용 — typed routes가 에러를 내면 라우트 파일이 실제로 존재하는지 확인할 것
- i18n 동적 키가 필요하면 조건 분기(`if/switch`)로 처리, `t(dynamicKey as any)` 금지

## Agent Skills

Skills are defined once in `.agents/skills/<name>/SKILL.md` and mirrored to
`.claude/skills/`, `.codex/skills/`, and `.grok/skills/` as thin pointers.
Edit the canonical file only, then run `bash .agents/scripts/sync-skills.sh`.
See `.agents/README.md`.

---

## Coding Principles (Karpathy-inspired)

### 1. Think Before Coding

- State uncertainties explicitly before writing code
- When a request is ambiguous, present interpretations and ask — don't guess
- Document assumptions that aren't obvious from context

### 2. Simplicity First

- Write the minimum code that solves the stated problem
- No speculative features, unnecessary abstractions, or "just in case" error handling
- Three similar lines > one premature abstraction

### 3. Surgical Changes

- Only modify what's necessary for the task
- Match existing code style — don't "improve" surrounding code
- Don't add docstrings, comments, or type annotations to unchanged code

### 4. Goal-Driven Execution

- Transform tasks into verifiable success criteria
- "Fix the bug" → write a test reproducing it, then make it pass
- Always verify: `npx tsc --noEmit` for type safety
