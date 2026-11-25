---
name: purchase-e2e
description: Run Martie's live in-app purchase E2E on physical devices: buy a sandbox consumable on iOS (App Store sandbox), Google Play (license tester), and Fire OS (Amazon App Tester), confirm Martie's own Convex verification grants it, then re-verify the same receipt on production IAPKit and require a Sandbox verdict. Horizon OS is recorded as not applicable until Martie sells there. Use when the user runs `/purchase-e2e` or `$purchase-e2e`, asks for purchase/IAP/receipt E2E, sandbox or App Tester purchase checks, or IAPKit receipt verification for Martie.
---

# Purchase E2E

Prove the whole purchase path on real devices: the store sheet, Martie's own
receipt verification and grant, and an independent IAPKit verdict on the same
receipt. A store purchase that Martie grants but IAPKit rejects, or the other
way round, fails the row.

Run this on physical devices only; never an emulator or simulator. For the
quiz and replay regressions, use `$e2e-test`.

## Targets

| Piece          | Value                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| Martie backend | the **dev** Convex deployment in `.env.development`                                                             |
| IAPKit         | production, `https://kit.openiap.dev`                                                                           |
| IAPKit key     | `IAPKIT_API_KEY` in the gitignored `.env.local` (the Martie project's publishable key named "Local Device E2E") |
| Product        | `dev.hyo.martie.10bulbs` (consumable, repeatable)                                                               |
| Sign-in        | the test account `$e2e-test` names; the dev OTP prints in the Metro log                                         |

Use the dev deployment because production Martie rejects sandbox receipts:
`APPLE_IAP_ALLOW_SANDBOX` and `AMAZON_RVS_SANDBOX` are only `true` on dev. A
Google license-tester purchase would pass on production but would grant bulbs
to a production account, so it also goes to dev.

IAPKit stores each verified purchase's store environment (`Sandbox` or
`Production`). Every row of this skill must come back `Sandbox`; a
`Production` verdict means a real charge and stops the run.

If `IAPKIT_API_KEY` is missing, read the key from IAPKit's production Convex
(`apiKeys` table, the Martie project's "Local Device E2E" row) without printing
it, and append it to `.env.local`. Never create, rotate or reveal a key
without the user's approval.

## Safety Gates

- Test purchases are pre-approved as `$e2e-test` → **Sandbox Purchases and
  Credentials** describes; follow that section for the Sandbox Apple Account
  too. Only sandbox and tester sheets are covered.
- Before pressing the store's confirm button, check the sheet is a test
  sheet: Apple shows `[Environment: Sandbox]`, Google shows a test card,
  Amazon's sheet comes from App Tester (`com.amazon.sdktestclient`). Otherwise
  cancel and report `BLOCKED`.
- Replacing a store-installed Martie needs an uninstall that wipes app data.
  Ask first.
- The iPhone may be shared with other projects' sessions. Confirm it is free
  before reinstalling or driving it, and touch only `dev.hyo.martie`.
- Never print, log, screenshot or commit a receipt, JWS, purchase token,
  Amazon user id or API key. Capture files stay outside the repo with mode
  `0600` and are deleted at the end.
- Leave Google and Meta account sign-in to the user.

## Preflight

1. `adb devices -l` and `xcrun devicectl list devices`. Pick the physical
   Fire tablet, Play phone and iPhone. No Play-certified phone → the Google
   row is `BLOCKED`.
2. Confirm `.env.development` and `.env.local` point at the dev deployment and
   `IAPKIT_API_KEY` is set (check names only).
3. Start Metro from the checkout under test and keep its log:

   ```bash
   CI=1 npx expo start --port 8081 > metro.log 2>&1
   ```

   The first lines must read `env: load .env.local .env.development`.

4. Android: map Metro with `adb -s "$SERIAL" reverse --no-rebind tcp:8081 tcp:8081`
   and remember whether this run created the rule.

## Builds

The device needs a **Debug** Martie build that loads JS from Metro, linked to
the right store:

- **Fire OS:** `AMAZON_APPSTORE=1` prebuild, Debug APK. App Tester
  (`com.amazon.sdktestclient`) must be installed and
  `/sdcard/amazon.sdktester.json` must list the Martie SKUs.
- **Google Play:** plain Android Debug APK, a license-tester account on the
  device, and the products published in Play Console.
- **iOS:** `npx expo prebuild -p ios`, then set
  `"EXPO_USE_PRECOMPILED_MODULES": "false"` in `ios/Podfile.properties.json`
  (a prebuilt React Native never contacts Metro), `pod install` with
  `LANG=en_US.UTF-8`, and build the `Martie` scheme in Debug with
  development signing and an SSD `-derivedDataPath`. Uninstall the store
  Martie first: iOS keeps a scene session per bundle id, and an upgrade
  install over another signing leaves a black screen.

A Debug build reads its JS from Metro, so the backend is whatever Metro's env
says. Recheck `metro.log` after every Metro restart.

## Run One Device

1. Launch Martie and sign in on the dev deployment (email, then the code from
   `metro.log`).
2. Open the purchase screen: `martie://purchase` (Android:
   `adb shell am start -a android.intent.action.VIEW -d martie://purchase dev.hyo.martie`).
   It must say **Connected to store**. Record the bulb count.
3. Attach the receipt listener:

   ```bash
   node .agents/skills/purchase-e2e/scripts/capture-purchase.mjs listen
   ```

   When more than one device shares Metro, set `METRO_DEVICE` to part of the
   app's inspector title (`iPhone`, `KFRASWI`) for both `listen` and `dump`.

4. Tap the 10 Bulbs price. On dev, the payment test-mode dialog appears
   first; choose the store button (it reads **Google Play** on every
   platform), not **Grant bulbs**, which is the mock PG.
5. Check the sheet against the safety gate, then confirm it.
6. Require Martie's success dialog ("You have received 10 bulbs") and a +10
   bulb count.
7. Dump the receipt and verify it on IAPKit:

   ```bash
   capture="$SCRATCH/purchase-capture.json"   # outside the repo
   node .agents/skills/purchase-e2e/scripts/capture-purchase.mjs dump "$capture"
   node .agents/skills/purchase-e2e/scripts/iapkit-verify.mjs "$capture"
   ```

8. Confirm the newest dev `purchases` row (`npx convex data purchases --limit 1`):
   right product, `paymentMethod` for the store, and `metadata.sandbox: true`
   (Amazon) or `metadata.appleVerified: true` (Apple). Print ids and fields
   only, never `transactionId` in full.

A row is `PASS` only when steps 5–8 all hold and `iapkit-verify.mjs` prints
`PASS` with `"environment":"Sandbox"`.

## Store Notes

- **Amazon:** App Tester receipts need only the **Allow Amazon App Tester /
  RVS Cloud Sandbox** opt-in in the IAPKit project settings (it is on for
  Martie); without it IAPKit answers `AMAZON_SANDBOX_NOT_ENABLED`. The RVS
  shared secret is only for production and LAT receipts. A verified
  consumable reads `READY_TO_CONSUME`. If a subscription test hits
  `feature-not-supported`, reset App Tester's purchase data, not its catalog.
- **Apple:** `purchaseToken` is the JWS. Martie's dev deployment and IAPKit
  both accept sandbox JWS. Prices follow the Sandbox Apple Account's
  storefront, so a euro or pound price is normal.
- **iPhone driving:** `maestro-runner` relaunches the app at the start of
  every flow, which closes an open sheet and drops the receipt listener, and
  its WebDriverAgent cannot see the StoreKit sheet (another process). Use
  flows only to sign in and reach the purchase screen. For the purchase
  itself, keep WebDriverAgent running with `xcodebuild test-without-building`
  on maestro-runner's cached `.xctestrun`, then tap and screenshot through its
  HTTP API (the `ServerURLHere` line in its log): price → **Google Play** →
  check the sheet says "For testing purposes only" → **Purchase**. Typing
  through WDA drops characters; enter the email and code one character per
  step. If Apple asks for the Sandbox Apple Account password, follow
  `$e2e-test`; an agent that may not type passwords hands that one prompt to
  the user.
- **Google:** a license tester's purchase is a test purchase; IAPKit maps
  `testPurchase` to `Sandbox`.
- **Horizon OS:** Martie does not sell on Horizon (the purchase screen shows
  the store notice, `testID="purchase-web-notice"`), so the row is `N/A`.
  Check the installed build's `assets/app.config` has `iapStore: horizon` and,
  when the headset is worn, that the notice renders. Running
  `npx jest --runInBand test/app/purchaseUserChoiceBilling.test.tsx` covers
  that a Horizon purchase is never granted.

## Cleanup

- Stop Metro and any WebDriverAgent you started; remove the `tcp:8081`
  reverse rule only if this run created it.
- Delete every capture file.
- Leave App Tester's catalog, store products and IAPKit keys unchanged.
- If you replaced a store build, tell the user; reinstall from the store only
  if they ask.

## Report

```text
Store       | Device     | Martie grant          | IAPKit verdict              | Result
App Store   | <udid>     | +10 bulbs, row <id>   | isValid, Sandbox            | PASS
Google Play | <serial>   | ...                   | ...                         | BLOCKED: no Play device
Amazon      | <serial>   | +10 bulbs, sandbox    | isValid, Sandbox            | PASS
Horizon OS  | <serial>   | N/A (store notice)    | N/A                         | N/A
```

Keep Martie's grant and IAPKit's verdict in separate columns, and list every
`BLOCKED` prerequisite exactly.
