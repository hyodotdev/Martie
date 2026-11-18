---
name: release-update
description: Build, verify, submit, and publish Martie releases through EAS Build, Codemagic Patch OTA updates, Google Play, and App Store Connect. Use when the user runs `/release-update` or `$release-update`, asks to release or deploy Martie, upload IPA/AAB artifacts, submit store builds for review, add release notes, choose between a native build and OTA update, or finish a version rollout after review and E2E.
---

# Release Update

Ship Martie only after review, CI, and the requested E2E gates are complete.
Report upload, review, approval, and public release as separate states.

## Establish Release Inputs

1. Read `AGENTS.md`, `package.json` scripts, `eas.json`, Expo config, current
   branch/PR, and `$update-version`.
2. Confirm the semantic version, remote iOS build number, remote Android version
   code, target channels/tracks, and store application identifiers.
3. Build release notes from the actual PR diff and user-facing behavior. Keep
   them concise and localized where store metadata requires it.
4. Preserve unrelated changes and existing credentials. Never print secrets.

## Choose Native Build Or OTA

Require new iOS and Android binaries when any of these changed:

- Expo SDK, React Native, native modules, plugins, entitlements, permissions,
  targets, manifests, Info.plist, Pod/Gradle inputs, billing, IAP, ads, or native
  assets;
- app version/build numbers or store compliance requirements;
- behavior that cannot run safely on the installed binary version.

Over-the-air updates ship through Codemagic Patch (apps `Martie-iOS` and
`Martie-Android` in the OpenIAP team at https://ota.codemagicpatch.dev), never
EAS Update. Use them only when changes are JavaScript/assets compatible with
the store binary of the same `package.json` version and no store binary or
compliance update is needed:

- Production (preferred): run the GitHub **Release** workflow (Actions → Release
  → Run workflow, kind `ota`, with the release note). It requires green CI on
  `main` and pushes the next `ota-<version>-<n>` tag. Pushing the tag by hand
  works the same, e.g.
  `git tag -a ota-2.5.0-1 -m "Fix quiz timer" && git push origin ota-2.5.0-1`.
  Codemagic's `ota-production` workflow runs lint, tsc and tests, regenerates
  the native projects and publishes both platforms; the tag message is the
  release note. Patch refuses a bundle whose native fingerprint differs from
  earlier releases for that binary version.
- Local: `OTA_CONFIRM_COMPATIBLE=1 OTA_MESSAGE="..." bun ota:release`
  (`ota:release:ios` / `ota:release:android` for one platform).
  `OTA_DEPLOYMENT=Staging` publishes to test builds; Production requires a
  clean `main` that matches `origin/main` with successful CI. Prefer the tag for
  Production so every release fingerprints in the same environment.

Binaries up to 2.4.0 still run Expo Updates and have no Patch client. Do not
publish EAS updates from a tree that imports `@codemagic/react-native-patch`;
those binaries reach new code only through a store build (plus force update).

Record the Patch release labels, deployment, binary version and messages
(`bunx @codemagic/patch-cli@0.10.0 release list --app Martie-iOS`).

## Verify Before Shipping

1. Require `$review-self` and `$review-pr` stability, successful CI, a clean
   worktree, and a mergeable approved target.
2. Run `bun lint:all`, `bun tsc --noEmit`, `bun run test -- --runInBand`,
   `npx expo-doctor`, and `git diff --check` when their fingerprints changed.
3. Use `$e2e-test` for Android and the equivalent Maestro/simulator flow for iOS.
   Verify launch, daily quiz completion, purchase-screen transition, and Hall of
   Fame. Defer real IAP transactions to physical devices unless explicitly
   authorized and available.
4. For native releases, build on Codemagic (OpenIAP team, app `Martie`) from the
   exact merged commit: run the GitHub **Release** workflow with kind `store`
   (it tags `v<package.json version>` and creates the GitHub Release), publish
   a GitHub Release for a new `v<version>` tag, push that tag yourself, or start
   the `ios-production` and `android-production` workflows by hand. Bump
   `package.json` first: the tag must match it. They run `eas build --local` with the EAS credentials,
   versions and `production` environment, check the bundle targets
   `martie-server.hyo.dev` (and the Play upload key), then upload to TestFlight
   and the Play internal track as a draft. They never submit for review.
   The EAS cloud scripts (`bun eas:prod:android`, `bun eas:prod:ios`) remain a
   fallback only.
5. Inspect the build artifacts (Codemagic artifacts or EAS build metadata).
   Verify Android is a readable AAB with the expected package/version and iOS is
   an IPA archive with the expected bundle/version. A successful EAS status
   alone does not replace artifact inspection.

## Merge And Build From The Released Commit

1. Merge only after all required review and E2E gates pass and the user has
   authorized merging.
2. Record the merge commit SHA. Build or confirm the submitted artifacts were
   produced from that exact release state; rebuild when the source SHA differs.
3. Do not rewrite history or reuse an older artifact merely because its semantic
   version matches.

## Submit To Stores

1. Prefer the established non-interactive scripts:
   - `bun eas:prod:submit:android`
   - `bun eas:prod:submit:ios`
   - `bun eas:prod:submit`
2. Confirm the selected EAS build IDs rather than assuming `--latest` points to
   the intended commit.
3. Android production submissions target the `production` track from `eas.json`.
   Report whether the upload is draft, in review, staged, or publicly available.
4. iOS EAS Submit uploads to App Store Connect/TestFlight. Separately attach the
   selected build to version metadata, add release notes, complete compliance,
   and submit for App Review using an available authenticated API or the store
   UI. Do not claim App Review submission from an EAS upload alone.
5. Add release notes before requesting review. Never overwrite unrelated
   localized metadata.
6. If credentials, agreements, compliance answers, 2FA, or a manual product
   choice blocks submission, stop at the exact boundary and preserve completed
   uploads.

## Completion Report

Include:

- version, merge SHA, EAS build IDs, source SHAs, and artifact links;
- AAB/IPA inspection results;
- E2E and verification summaries;
- Expo update IDs when OTA was used;
- per-store upload, review, approval, and release states;
- release-note text and any remaining manual action.

Never describe a build as released merely because it built or uploaded.
