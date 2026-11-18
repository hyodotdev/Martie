# Contributing to Martie

Thanks for helping. This guide covers everything you need to run Martie
locally and send a pull request. Project rules for humans and AI agents live
in [`AGENTS.md`](./AGENTS.md): paginated lists, no `any`, and the per-domain
Convex layout are acceptance criteria, not suggestions.

- [Contributor License Agreement](#contributor-license-agreement)
- [Stack](#stack)
- [Local setup](#local-setup)
- [Scripts and checks](#scripts-and-checks)
- [Repository layout](#repository-layout)
- [Conventions](#conventions)
- [Pull requests](#pull-requests)
- [Running your own copy](#running-your-own-copy)

## Contributor License Agreement

Before a pull request can be merged, you must agree to the
[Martie Contributor License Agreement](./CLA.md).

Why: Martie is licensed under the AGPL and is also distributed through the App
Store and Google Play, whose terms are not compatible with the AGPL for code the
project does not own. The CLA lets the project keep shipping your contribution
in the store apps. You keep the copyright to your work, and the public code
stays under the AGPL.

To agree, add this line to your pull request description:

```text
I have read and agree to the Martie Contributor License Agreement (CLA.md).
```

## Stack

| Layer           | Choice                                                                       |
| --------------- | ---------------------------------------------------------------------------- |
| App             | [Expo](https://expo.dev) SDK 57, React Native 0.86, React 19                 |
| Routing         | [expo-router](https://docs.expo.dev/router/introduction) (typed routes)      |
| Backend         | [Convex](https://convex.dev) — database, functions, crons, auth              |
| Auth            | [Convex Auth](https://labs.convex.dev/auth) with email OTP via Resend        |
| UI              | [cpk-ui](https://github.com/crossplatformkorea/cpk-ui)                       |
| Styling         | [kstyled](https://github.com/niceplugin/kstyled)                             |
| Lists           | [@shopify/flash-list](https://shopify.github.io/flash-list/) + pagination    |
| Client state    | zustand + [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) |
| Billing         | [expo-iap](https://github.com/hyochan/expo-iap) (OpenIAP), Toss, Naver Pay   |
| Ads             | Unity LevelPlay                                                              |
| Analytics       | Firebase Analytics                                                           |
| i18n            | i18n-js + expo-localization                                                  |
| Tests           | jest + jest-expo + @testing-library/react-native                             |
| Package manager | [bun](https://bun.sh)                                                        |

## Local setup

### Prerequisites

- **bun** 1.3.13 (`packageManager` in `package.json`)
- **Node** `^22.13.0 || >=24.3.0`
- **Xcode** and CocoaPods for iOS, **Android SDK** and JDK 17 for Android
- A free **Convex account** — `bunx convex dev` creates your own dev deployment
- Optional: a Firebase project (`google-services.json` /
  `GoogleService-Info.plist`) to build native apps with analytics

### First run

```bash
bun install
cp .env.sample .env.local     # then fill in what you need
bunx convex dev               # logs in, creates your dev deployment,
                              # writes CONVEX_DEPLOYMENT + EXPO_PUBLIC_CONVEX_URL
bun start                     # Expo dev server (press w for web)
```

Leave `bunx convex dev` running in a second terminal: it pushes `convex/` and
keeps `convex/_generated` in sync. To fill an empty deployment with content:

```bash
bunx convex run seeds:insertCategories
bunx convex run seeds:importAllQuizzes
```

Native builds (`bun ios`, `bun android`) run `expo prebuild` and need the
Firebase config files above. `ios/` and `android/` are generated and ignored.

### Signing in during development

Sign-in is email OTP. Outside production, Resend is skipped and the code is
printed in the Convex logs. To use a fixed code on your own dev deployment,
set both variables (there are no defaults):

```bash
bunx convex env set DEV_FIXED_OTP_EMAILS you@example.com
bunx convex env set DEV_FIXED_OTP_CODE 12345678
```

### Convex environment variables

Set these on your deployment with `bunx convex env set` only when you need the
feature. None of them belong in the client or in git.

| Variable                                                                                 | Used for                                                                              |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `ENVIRONMENT`                                                                            | `production` enables real email delivery and disables dev OTP                         |
| `AUTH_RESEND_KEY`                                                                        | Sending OTP emails with Resend                                                        |
| `ADMIN_EMAILS`                                                                           | Comma-separated admin accounts (quiz submission review)                               |
| `DEV_FIXED_OTP_EMAILS`, `DEV_FIXED_OTP_CODE`                                             | Fixed OTP for listed accounts, non-production only                                    |
| `APP_REVIEW_FIXED_OTP_EMAILS`, `APP_REVIEW_FIXED_OTP_CODE`                               | Fixed OTP for store review accounts                                                   |
| `LEVELPLAY_S2S_PRIVATE_KEY`, `LEVELPLAY_S2S_MODE`                                        | Verifies LevelPlay rewarded-ad callbacks at `/levelplay/reward`; `grant` credits them |
| `AMAZON_IAP_SHARED_SECRET`, `AMAZON_RVS_SANDBOX`                                         | Amazon Appstore receipt verification (RVS)                                            |
| `ALLOW_TEST_BULB_GRANTS`                                                                 | Payment test tools may grant bulbs (never on production)                              |
| `OPENAI_API_KEY`                                                                         | The "Ask Martie" chat                                                                 |
| `GOOGLE_SERVICE_ACCOUNT_KEY`                                                             | Google Play purchase verification (service account JSON)                              |
| `TOSS_SECRET_KEY`                                                                        | Toss Payments confirmation                                                            |
| `NAVER_PAY_CLIENT_ID`, `NAVER_PAY_CLIENT_SECRET`, `NAVER_PAY_CHAIN_ID`, `NAVER_PAY_MODE` | Naver Pay confirmation                                                                |
| `GOOGLE_REPORT_ALT_BILLING`, `GOOGLE_REPORT_ALT_BILLING_TEST_ORDERS`                     | Google alternative billing reporting ([runbook](./docs/ALT_BILLING_ANDROID.md))       |
| `APPLE_IAP_ALLOW_SANDBOX`                                                                | Accept Apple sandbox receipts on a test deployment                                    |

Client-side variables are documented in [`.env.sample`](./.env.sample).

## Scripts and checks

Run with `bun <name>`, except tests: `bun run test` (a bare `bun test` starts
Bun's own runner instead of jest).

| Script              | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `start`             | Expo dev server                                |
| `ios` / `android`   | Build and run on a simulator or device         |
| `web`               | Web target                                     |
| `lint` / `lint:all` | ESLint for source / source + translation files |
| `test`              | Unit tests (`jest --runInBand`)                |
| `fix:deps`          | Realign dependency versions with the Expo SDK  |
| `build:web`         | Static web export                              |

Releases run on Codemagic (`codemagic.yaml`): a `v<version>` tag builds and
uploads store binaries, and an `ota-*` tag publishes a JavaScript-only
over-the-air update through [Codemagic Patch](https://patch.codemagic.io)
(`codemagic-patch.config.json`, or `bun ota:release` locally). Every push also
checks that the native iOS and Android projects still build. `eas:*` scripts
build and submit with the maintainer's EAS project directly. Forks need their own (see
[Running your own copy](#running-your-own-copy)).

Before opening a pull request, run what CI runs
(`.github/workflows/ci.yml`):

```bash
bun lint:all
bunx tsc --noEmit
bun run test
```

## Repository layout

```
app/              expo-router routes; app/_Tabs/ holds Mobile/Tablet tab layouts
src/              client code: uis/, components/, hooks/, stores/, utils/,
                  features/, STRINGS.ts (i18n)
convex/           backend: schema/ (one file per table), one folder per domain
                  with queries.ts + mutations.ts, crons, http routes, auth
assets/           app icon, mascot images, sounds, fonts, langs/ translations
scripts/_seeds/   quiz and article seed data
programs/shorts/  Remotion project that renders quiz short-form videos
                  (bring your own audio in programs/shorts/public/*.mp3)
apps/vega/        Amazon Vega (Fire TV) shell
website/          martie.hyo.dev landing page; .github/workflows/pages.yml deploys
                  it to GitHub Pages together with the Expo web build at /app
plugins/          local Expo config plugins
test/             jest tests
docs/             product specs and engineering runbooks
.agents/          canonical AI-agent skills, mirrored to .claude/.codex/.grok
```

Store assets, growth experiments, QA evidence and release operations live in a
private operations repository.

## Conventions

The short version — the long form is in [`AGENTS.md`](./AGENTS.md):

- Unbounded lists use `FlashList` with Convex pagination
  (`paginationOptsValidator` + `usePaginatedQuery`), never `ScrollView` +
  `.map()` or `.collect()` on a growing table.
- No `any`. Route strings and i18n keys are never cast.
- Every user-facing string goes through `assets/langs/` for all 9 languages.
- Quiz text lives in `quizLanguages` by key; categories are `UPPER_SNAKE_CASE`
  and localized through `categoriesMap.ts`.
- Never hardcode emails, keys or account identifiers; use Convex env.

## Pull requests

1. Open an issue first for anything larger than a small fix.
2. Use synthetic data only. Never include real accounts, emails, screenshots of
   real users, tokens or keys.
3. Branch with a `feat/`, `bugfix/`, `docs/`, `refactor/`, `test/` or `chore/`
   prefix and use Conventional Commits (`feat(scope): …`, `fix(scope): …`).
4. Make sure the checks above pass, and include the CLA line in the
   description.

New quizzes are welcome through the in-app "Have a good question? → Create" flow or as seed
files under `scripts/_seeds/`. Questions must be factual, verifiable and free
of copyrighted text.

Security issues: do not open a public issue. See [`SECURITY.md`](./SECURITY.md).

## Running your own copy

You may build and modify Martie under the AGPL. To publish a fork, use your
own name, icon, bundle identifiers, Convex deployment, Firebase project, EAS
project (`app.config.ts`) and ad/payment accounts — see
[`TRADEMARKS.md`](./TRADEMARKS.md). The values in `app.config.ts`,
`src/utils/levelPlayConfig.ts` and `public/.well-known/` belong to the
official app and are public by design (they ship in every binary).
