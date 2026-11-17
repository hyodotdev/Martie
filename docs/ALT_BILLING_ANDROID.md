# Android Alternative Billing (test implementation)

Live-app verification of openiap/expo-iap alternative billing on Martie.
Tracks [issue #141](https://github.com/hyodotdev/Martie/issues/141),
continues the payment-mode scaffold from PR #101.

## Payment modes (`EXPO_PUBLIC_PAYMENT_MODE`)

| Mode                  | Build                       | Behavior                                                                        |
| --------------------- | --------------------------- | ------------------------------------------------------------------------------- |
| `iap_only`            | production, amazon, horizon | Google Play / store billing only                                                |
| `mock_pg`             | development                 | Fake instant bulb grant, no PG UI                                               |
| `toss_test`           | preview                     | Toss Pay checkout (test keys), no Google gating                                  |
| `naver_test`          | preview-naver               | Naver Pay sandbox checkout, no Google gating                                    |
| `alternative_billing` | preview-alternative-play    | Native Google choice, listener token, Toss/Naver chooser, checkout, then report   |

## Flow (bulb packs, Android)

```
purchase.tsx -> requestPurchase (useIAP enables user-choice-billing)
  Google Play choice -> normal onPurchaseSuccess / onPurchaseError
  Developer billing choice -> onUserChoiceBillingAndroid:
    1. match the pending product and require a nonempty listener token
    2. consume pending state, then show the Toss/Naver provider chooser
    3. authenticated /toss-checkout or /naver-checkout with the listener token
    4. PG approval (Toss confirm / Naver apply), with server price validation
    5. atomically record the purchase, grant bulbs, and persist report state
    6. scheduled Google report and bounded retries; duplicate callbacks never
       grant again, and successful reports clear their stored listener token
```

`toss_test` and `naver_test` skip the native Google flow and reporting.
Chooser cancellation and native errors clear pending state; duplicate or
unrelated listener events cannot open another checkout. The provider chooser
contains only Toss/Naver because Google Play already owns the billing choice.

## Why Toss first

- Official React Native SDK (`@tosspayments/widget-sdk-react-native`),
  WebView-based — satisfies Google's embedded-WebView rule for outlink payments.
- Test keys work immediately, no contract needed; test approvals never charge.
- One SDK covers cards + TossPay/KakaoPay/easy-pay methods.
- Alternatives deferred: KakaoPay single-payment (REST, needs contract for live
  test keys), Naver Pay (heavier onboarding), Stripe (not available to
  KR-registered businesses).

## Setup

The September entries below are historical setup evidence. Recheck the exact
build's environment before testing. On 2026-10-06, EAS `preview` still points
to the dev Convex deployment and Naver sandbox, but its Toss client key is a
`test_gck_docs_…` sample key. That is not the merchant v1 key required by the
Toss Pay window; the previous device success does not establish current
Toss sandbox readiness.

On 2026-10-07, the EAS `preview` Toss client key was replaced with the
merchant test key. The 2.3.2 (102) compiled bundle was checked for the dev
Convex URL, merchant test key, and absence of the docs sample key.

### Toss keys

- Test client key (`test_ck_...`) is in local `.env.preview` (gitignored)
  and in EAS project env (`preview` + `production` environments).
- Test secret key (`test_sk_...`) is in Convex env (`TOSS_SECRET_KEY`) on
  both `dev:blessed-chameleon-803` and `prod:proficient-vole-163`.
- Convex `toss:confirmPayment` verifies the approved provider payment, then
  atomically records the purchase and bulb entitlement. Google reporting is
  persisted on the purchase and retried by the Convex scheduler.
- Env mapping (verified from a built APK bundle): EAS `preview` builds use
  the EAS `preview` environment, which points at the **dev** Convex
  deployment — so device tests hit dev, not prod.
- Toss test secret verified live (API probe 2026-09-26). Toss dev-center
  session expired — re-login needed for live onboarding (e-payment
  application, settlement account).
- Test payments: any valid card number approves virtually, no real charge.
  Inspect them at developers.tosspayments.com/my/payment-logs.

### Naver Pay (결제형) sandbox

- Sandbox credentials in Convex env (`NAVER_PAY_CLIENT_ID`,
  `NAVER_PAY_CLIENT_SECRET`, `NAVER_PAY_CHAIN_ID`, `NAVER_PAY_MODE`) on
  both dev and prod; client id/chain id also in EAS `preview` env.
- Flow: `naver_test` mode > `/naver-checkout` WebView loads the official
  Naver Pay JS SDK > `NaverPay.create` + `open()` > `returnUrl` redirect
  intercepted for `paymentId` > `naverpay:applyPayment` (60s timeout,
  idempotency key = `merchantPayKey`) > `purchases` row + bulbs.
- `returnUrl` = Convex site `/naverpay/return` (200 on both deployments;
  WebView intercepts before load). WebView `onMessage` reports `opened` /
  `sdk-error` for diagnostics.
- Approval response handling: `Success` full / `Success` partial-refund /
  `AlreadyComplete` (retry-safe) / `Cancel` (+ `PAY114` in-flight retry) /
  everything else raises. See `convex/naverpay.ts`.
- Live API probes 2026-09-26 (both deployments): Toss confirm returns
  `NOT_FOUND_PAYMENT_SESSION`, Naver apply returns `InvalidPaymentId`,
  and server-side price guards reject wrong amounts unconditionally.

### Play Console enrollment (Korea) — enrolled

Verified 2026-10-06 in **Settings > Alternative billing** for developer
account `8586579003908337832`: Korea UCB terms and attestations are complete,
monthly invoicing is approved, and Martie (`dev.hyo.martie`) is enrolled for
Republic of Korea with **User Choice Billing**. The app-management table shows
one country/region and user-choice billing. The subscription-management field
is accurately set to `해당 사항 없음` because external PG currently sells
only one-time consumable bulb packs.

Console enrollment alone does not enable production charging. The exact PR
build still needs a physical Android license-tester pass, live provider
contract/keys, Google reporting configuration, and a release decision.

Google-side rules: report every authorized KR transaction within 24h via the
alternative-billing API (step 6), pay the service fee minus 4% on invoice.

## Builds

```bash
# PG-only test (Toss test keys, no Play enrollment needed)
EXPO_NO_DOTENV=1 STAGE=preview dotenv -o -e .env.preview -- \
  eas build --profile preview --platform android

# Sideloaded UI smoke only; not proof of Play-installed UCB eligibility
EXPO_NO_DOTENV=1 STAGE=preview dotenv -o -e .env.preview -- \
  eas build --profile preview-alternative --platform android

# PG-only Naver test (sandbox keys, no Play enrollment needed)
eas build --profile preview-naver --platform android
```

The `preview-alternative` profile has its own update channel
(`preview-alternative`) so OTA updates from `preview` can't flip its mode.

For the required physical-device Google UCB gates, build an AAB from the
reviewed commit and upload only that build to Play's internal test track:

```bash
eas build --profile preview-alternative-play --platform android \
  --freeze-credentials --non-interactive
eas submit --profile preview-alternative-play --platform android \
  --id <verified-build-id> --non-interactive
```

This profile explicitly uses EAS `preview` variables even though its
distribution is `store`. It uses the separate `preview-alternative-play`
update channel, `alternative_billing` mode, a new versionCode, and an
internal-only submission profile. Confirm dev Convex, Toss merchant test
keys, and Naver `development` before payment; the package name alone does
not establish sandbox safety. Install through the internal-test Play link
using a configured Korean license tester, and record installer, version,
SHA, build ID, and track evidence. Do not use production submission scripts.

Explicit EAS/shell environment values take precedence over local dotenv
files. For local stage-specific Expo commands, keep `EXPO_NO_DOTENV=1` so
Expo does not preload its default `.env` before app config selects the stage.

The expo-iap native upgrade requires a new binary. Version `2.3.2` gives it
a separate `appVersion` runtime from `2.3.1`; do not publish these new native
API calls as a `2.3.1` OTA. EAS supplies the selected build profile's update
channel; app config does not override it with `production`.

Release minification must preserve the Google UCB builder method, listener,
and `UserChoiceDetails` accessors used reflectively by OpenIAP. These keep
rules live in `app.config.ts`. Build 102 removed or renamed them and showed
`Not Connected` on a Play-installed device. Check the new AAB's R8 mapping
for the preserved names, then retest the native choice screen; JavaScript
unit tests alone do not validate this native release behavior.

The Play-installed 2.3.2 (103) build passed store connection and the native
Google/Martie choice on 2026-10-07. A Google license-test purchase granted
10 bulbs once through server verification; the balance survived relaunch.
Provider checkout still requires separate physical-device approval evidence.

The inline provider WebViews need an HTTPS `baseUrl` so Naver's reserve
iframe can reply to a non-opaque merchant origin. Their origin whitelist
must also let checkout callbacks handle Android `intent://` links; otherwise
React Native WebView tries to open the raw intent before the app's scheme
resolver runs. The callback returns `false` for external app links.

An additional SDK blocker was reproduced on 103: selecting developer
billing, cancelling the provider chooser, then buying again fails with
`Another purchase is already in progress`. OpenIAP Google 3.6.0 leaves its
pending purchase callback set after the UCB event; published 3.6.2 has the
same listener behavior. A process restart clears it, but is not a passing
retry test. Resolve and retest this before a production rollout.

Latest preview APK (2026-09-26): EAS build `30a21bf3`
(versionCode 101, `toss_test` mode, Toss test key + dev Convex baked in —
verified in the APK bundle). Install: open the build page on the device
(`eas build:view 30a21bf3`) or
`adb install -r <apk>`. Already installed on R3CW80G1ZCX.

Naver preview APK (2026-09-26): EAS build `9d67d070`
(`preview-naver` profile, `naver_test` mode, Naver sandbox keys + dev
Convex — verified in the APK bundle). Superseded by the brand-UI builds
below; install one of those instead.

Brand-UI builds (2026-09-26, all include the official CI/BI sheet +
banner + order card + Toss currency fix):

- Toss: `016908d1-3bd8-46c5-a300-3c1e01eeb21d` (`preview`, `toss_test`)
- Naver: `9f51dc0a-1ff5-4e43-8097-615c0e15c8c6` (`preview-naver`,
  `naver_test`)

Check with `eas build:view <full-uuid>`, then `adb install -r` when
finished. Only one can be installed at a time (same package).

Manual device test (pending — phone was filming in another session):

1. Open Martie (preview icon) > purchase screen.
2. Confirm the "Payment test mode: Toss Payments test" banner.
3. Tap a bulb pack > Toss checkout opens > pay with any valid test card.
4. Confirm bulbs granted and a `toss_test` row in Convex `purchases`
   (dev deployment dashboard > Data > purchases).

## Test scenarios

### A. toss_test (PG only)

- [ ] Purchase screen shows "Payment test mode: Toss Payments test".
- [ ] Tapping a bulb pack opens `/toss-checkout` directly.
- [ ] Widget renders methods + agreement; pay with a test card.
- [ ] Bulbs granted, `purchases` row has `paymentMethod=toss_test`,
      `transactionId=<orderId>`, `currency=KRW`.
- [ ] Declining agreement blocks payment with a notice.
- [ ] Cancelling the Toss sheet returns to checkout without a grant.

### B. alternative_billing (Google-gated)

- [ ] Purchase screen shows the billing-choice disclosure + test banner.
- [ ] Tapping a bulb pack opens Google's native Google Play/developer choice.
- [ ] Google Play path behaves exactly like production IAP.
- [ ] Developer choice opens the Toss/Naver chooser with the listener token;
      cancelling either choice aborts cleanly and allows retry.
- [ ] Without Play enrollment, step 1 fails with the not-available notice.
- [ ] With enrollment: Toss pay -> confirm -> atomically record/grant ->
      persist Google report -> report/retry within 24 hours.

### C. naver_test (PG only)

- [ ] Purchase screen shows "Payment test mode: Naver Pay test".
- [ ] Tapping a bulb pack opens `/naver-checkout` directly.
- [ ] Naver Pay sheet opens in the WebView; approve with a sandbox buyer.
- [ ] Bulbs granted, `purchases` row has `paymentMethod=naver_test`,
      `transactionId=<merchantPayKey>`, `currency=KRW`.
- [ ] Cancelling the Naver sheet returns without a grant.
- [ ] Airplane-mode / double-tap approval is retry-safe (`AlreadyComplete`
      path credits bulbs exactly once).

## Production TODOs

- Play KR prices verified 2026-09-26: 10bulbs = KRW 1,400, 30bulbs =
  KRW 3,800 (already in `FALLBACK_BULB_PACK_KRW` + Convex `BULB_PACK_KRW`).
  Server confirmation rejects any amount that differs from this table.
- Toss is KRW-only: production must offer the Toss path only when the
  Play storefront price is KRW (the client already prefers the live Play
  KRW offer price and uses the fallback table otherwise).
- Set `GOOGLE_REPORT_ALT_BILLING=1` in Convex env only for the live
  deployment before enabling live payments. For license-tester orders only,
  also set `GOOGLE_REPORT_ALT_BILLING_TEST_ORDERS=1`; never use that switch as
  a substitute for live provider credentials.
- Switch to Toss live keys (requires e-payment contract).
- Run the complete Play user-choice flow on a physical Android device with a
  configured license tester. Emulator-only coverage is not sufficient.
- Confirm card-app switching (`appScheme`) and add Android `<queries>` for
  payment apps if external app intents are used.
- Re-check Google's billing-choice UX guidelines for disclosure wording.

## Brand UI (official CI/BI)

- Naver Pay: official logo pack from developers.pay.naver.com
  (`npayLogos.zip`) — signature-black on white chips (chooser rows,
  checkout header), badge mark (test banner). Never recolored.
- Toss: official `static.toss.im` blue wordmark PNG (chooser rows,
  banner, checkout header).
- Google Play: official 2022 icon remains available for store UI.
- Components: `src/components/payment/` (`brandArt`,
  `PaymentBrandMark`, `AlternativeBillingSheet`, `PaymentTestBanner`,
  `CheckoutBrandTitle`, `OrderSummaryCard`). The test banner keeps the
  literal `Payment test mode: ...` line for device automation.
- `AlternativeBillingSheet` is a Toss/Naver provider chooser shown only
  after Google's native billing-choice flow returns its listener token.
  Both provider rows are visible immediately; there is no second Google
  Play choice in this sheet.
- PG scope is Toss + Naver Pay only (no other PG integrated). Extra
  methods inside Toss's widget (cards, Payco, KakaoPay...) are Toss-side
  UI and can't be filtered in code; after e-payment approval, toggle
  them in the Toss console (상점관리자 > 결제 UI 설정). Sample keys
  always show all methods.
- The PG widgets render payment methods only — the product block
  (icon, name, amount, total) is our `OrderSummaryCard`, mirroring the
  purchase-screen BulbPack artwork.

## Known issues (fixed)

- 2026-09-26: Toss widget render failed on device
  (`renderPaymentMethods` rejected -> "Purchase Error" alert, code 4000
  "인증되지 않은 시크릿 키 혹은 클라이언트 키"). Root cause: the
  configured test client key is an **API 개별 연동 키** (REST-only);
  the Payment Widget requires a **결제위젯/결제창 연동 키**
  (`NOT_SUPPORTED_API_INDIVIDUAL_KEY`, reproduced in a desktop
  browser). Fix: copy the widget client key from the Toss console
  (developers.tosspayments.com > API 키) into the EAS `preview` env +
  `.env.preview`, then republish the `preview` OTA channel (no rebuild
  needed). Separately fixed the same day: amount must be
  `{currency: 'KRW', value}` (was `{value}` only); widget failures now
  log `alt_billing_toss_widget_failed` and surface `{code}: {message}`
  (the bridge rejects with a plain object, not an Error).
- 2026-09-26: Toss rail migrated from Payment Widget to the v1
  payment-window preset to Toss Pay only (`토스페이`, no other PG
  methods). The checkout WebView posts `opened`/`sdk-error` lifecycle
  messages; both `successUrl`/`failUrl` point at the Convex
  `/toss/return` landing page and are intercepted in
  `onShouldStartLoadWithRequest` before they load. `purchase.toss.sdkError`
  covers SDK-load failures in all 9 locales.
- 2026-09-26: v1 SDK renders the payment window as an in-page iframe
  overlay (default `windowTarget: "iframe"`), NOT a `window.open`
  popup (`"popup"` mode throws in the current SDK). A second WebView
  modal via `onOpenWindow` is kept only as a safety net for nested
  auth popups. The docs sample key (`test_gck_docs_…`) fails SDK-side
  validation before any launcher renders and the failure is
  async-silent on device (no alert, no crash) — a real merchant test
  client key (결제위젯/결제창 연동 키) is required for any on-device
  Toss UI. expo-iap 5.8.0 changed nothing in price handling (types
  and Play mapping identical since 5.4.1/3.5.2); the transient
  ₩1,200 fallback on device was Play products still loading, and
  real prices (₩1,400/₩3,800) resolve seconds later. Martie does not
  read `productStatusAndroid` — loading vs NotFound both show the
  fallback.
- 2026-09-26: real merchant Toss test keys installed (client key in
  `.env.preview`, secret in Convex dev+prod). The Toss Pay window now
  renders on device. Checkout titles are real-app style
  (`purchase.toss.checkoutTitle`: "토스 결제"/"Toss Pay",
  `purchase.naver.checkoutTitle` unchanged); the generic
  `purchase.altBilling.checkoutTitle` key was removed.
- 2026-09-26: PG app-switch links (`intent://…#Intent;scheme=…`) are
  resolved to plain scheme URLs before `Linking.openURL`
  (`src/utils/externalUrl.ts`) — RN cannot open raw `intent://` URIs,
  which silently stranded the flow on Toss's waiting screen even with
  the Toss app installed. Falls back to `browser_fallback_url`.
- 2026-09-26: test-mode simulated approval. The Toss checkout shows
  "Simulate approval (TEST, no Toss app)" in pure `toss_test` mode
  when pointed at dev Convex; it drives the full success chain with
  a `MOCK-TOSS-` paymentKey. The server now permits this only on
  `blessed-chameleon-803`, with a test secret and no Google-report request
  (amount/product validation still applies). Previously verified
  on device: thank-you alert + exact +10 bulbs, repeatable, no
  double-grant. Requires `convex dev --once` + `.env.preview`
  pointed at the dev deployment + preview OTA.
- External checkout now requires sign-in before provider approval. Purchase
  recording and the bulb grant commit together on the server, and repeated
  provider callbacks return the existing result without another grant.

## Notes / limitations

- expo-iap 5.8.3 pins openiap-google 3.6.3 and openiap-apple 3.6.1.
  No local Expo IAP patch is required. 5.x migration:
  request keys `ios:`/`android:` -> `apple:`/`google:`; offer fields ->
  `displayPrice`/`price`/`subscriptionOffers[]`/`offerTokenAndroid`;
  `validateReceipt` -> `verifyPurchase`. UCB uses
  `enableBillingProgramAndroid: 'user-choice-billing'`, `requestPurchase`,
  and `onUserChoiceBillingAndroid`. With openiap-google 3.6.3 / PBL 9.1,
  generic availability/reporting-details calls reject UCB; its token comes
  from the listener. See [Google's UCB integration guide](https://developer.android.com/google/play/billing/alternative/alternative-billing-with-user-choice-in-app).
- The shared report action requires the provider. Reporting requires
  `GOOGLE_REPORT_ALT_BILLING=1`; reporting sandbox/license-test orders also
  requires `GOOGLE_REPORT_ALT_BILLING_TEST_ORDERS=1`. Pure `toss_test` and
  `naver_test` checkouts have no Google listener token and skip reporting.
  Live provider credentials require reporting and a nonempty token before
  approval. Sandbox classification is stored with the purchase so later key
  rotation cannot turn an earlier test order into a live report.
- `externalTransactionId` is a request parameter, not a request-body field;
  see the [Google API reference](https://developers.google.com/android-publisher/api-ref/rest/v3/externaltransactions/createexternaltransaction).
- Google report state and retries are durable on the purchase record.
  Exhausted reports remain visibly failed for intervention. A complete
  Play-installed physical-device license-test pass and production provider
  setup remain required before a separate live-release decision.
- Reporting splits 10% KR VAT (pre-tax vs tax) in micros per Play API spec.
- Naver approval retries read every payment-history page before granting and
  reject cancellations, missing pages, or a changing result count. Checkout
  success messages show the server's actual grant when the bulb cap applies.

### Google Play verification rollout (2.3.2)

The Google Play option remains available alongside developer billing. The
2.3.2 client verifies Google receipts with Convex and commits the purchase
and entitlement together before consuming or acknowledging. Interrupted
transactions can retry without granting bulbs twice. The account selected
when starting the purchase is attached to the Google billing request.

The authenticated legacy Google token endpoint remains available for existing
clients. New clients use server-side verification instead. Retiring the legacy
endpoint is a separate migration; this beta does not force an update or deploy
production backend changes. Anonymous token requests are rejected.

Build 2.3.2 from merged `main` with `preview-alternative-play`, then submit that
exact build ID using the same profile. It targets Play **internal testing**,
uses the EAS `preview` environment and the development Convex deployment, and
keeps production's `iap_only` configuration. Required preview variables are
`EXPO_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_TOSS_CLIENT_KEY`,
`EXPO_PUBLIC_NAVER_PAY_CLIENT_ID`, `EXPO_PUBLIC_NAVER_PAY_CHAIN_ID`, and
`EXPO_PUBLIC_NAVER_PAY_MODE=development`. Do not fall back to production secrets
when a preview variable is missing. Google UCB cancellation/retry and Toss/Naver
approval, grants, and reporting must be checked on the new Play-installed beta.
Do not publish this native build as an OTA for runtime 2.3.1.

Expo IAP 5.8.3 includes the Google 3.6.3 fix from OpenIAP #509. Both packages
are publicly available; this beta uses the published SDK without a Bun patch.
A new native build is required for the UCB cancellation/retry fix.

The iOS purchase path now verifies Apple's signed transaction with the official
App Store Server Library, then records and grants atomically before finishing.
Apple Sandbox receipts require `APPLE_IAP_ALLOW_SANDBOX=true` on the test Convex
deployment; production defaults to production receipts. Validation checks the
signed revocation fields and certificate revocation, not live transaction refund
status. Legacy public purchase/account mutations remain for shipped clients;
removing their trust in client-reported state needs a separate compatible-client
migration. This Android beta does not deploy or retire those production APIs.
