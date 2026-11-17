import {BULB_PACK_SKUS} from './iapEntitlements';

export const TOSS_CLIENT_KEY = process.env.EXPO_PUBLIC_TOSS_CLIENT_KEY ?? '';
export const TOSS_CURRENCY = 'KRW';
// Test-mode simulated approval: paymentKeys with this prefix skip the Toss
// API in convex/toss.ts (test secrets only) so the full success chain can
// be verified without opening the Toss app. Must stay in sync server-side.
export const MOCK_TOSS_PAYMENT_KEY_PREFIX = 'MOCK-TOSS-';

// Mirrors MOCK_PAYMENT_DEPLOYMENT in convex/toss.ts: only the dev deployment
// honors mock keys, so the simulate button is offered only there. Matching
// an allowlist (not "anything but prod") keeps it hidden behind custom
// domains such as martie-server.hyo.dev.
const MOCK_PAYMENT_DEPLOYMENT = 'https://blessed-chameleon-803.convex.cloud';

export const isMockApprovalAvailable = (convexUrl: string): boolean =>
  convexUrl.replace(/\/+$/, '') === MOCK_PAYMENT_DEPLOYMENT;
export const TOSS_PAYMENT_METHOD_ALT = 'toss_alternative_billing';
export const TOSS_PAYMENT_METHOD_TEST = 'toss_test';

// Toss Pay (토스페이) payment-window integration. The Toss rail offers
// Toss Pay only (no other PG methods); the v1 window opens straight on
// the Toss Pay QR screen. Docs: https://docs.tosspayments.com/guides/v1/payment-window
export const TOSS_PAY_SDK_URL = 'https://js.tosspayments.com/v1/payment';
export const TOSS_PAY_WINDOW_METHOD = '토스페이';

// Fallback KRW amounts used when Play product prices are unavailable
// (e.g. store products failed to load in a test build).
// Verified against Play Console KR pricing on 2026-09-26.
export const FALLBACK_BULB_PACK_KRW: Record<string, number> = {
  [BULB_PACK_SKUS[0]]: 1400,
  [BULB_PACK_SKUS[1]]: 3800,
};

const BULB_COUNTS: Record<string, number> = {
  [BULB_PACK_SKUS[0]]: 10,
  [BULB_PACK_SKUS[1]]: 30,
};

export const getAltBillingBulbCount = (productId: string): number =>
  BULB_COUNTS[productId] ?? 0;

export const isTossTestKey = (clientKey: string): boolean =>
  clientKey.startsWith('test_');

export const getBulbPackShortId = (productId: string): string =>
  productId.replace(/^dev\.hyo\.martie\./u, '');

export type PlayOfferPrice = {
  priceCurrencyCode?: string;
  priceAmountMicros?: string | number;
};

export const getTossAmountKrw = (
  offer: PlayOfferPrice | undefined,
  productId: string,
): number => {
  if (
    offer?.priceCurrencyCode === TOSS_CURRENCY &&
    offer.priceAmountMicros != null
  ) {
    const micros = Number(offer.priceAmountMicros);

    if (Number.isFinite(micros) && micros > 0) {
      return Math.round(micros / 1_000_000);
    }
  }

  return FALLBACK_BULB_PACK_KRW[productId] ?? 0;
};

export const randomHex = (length: number): string => {
  let out = '';

  for (let i = 0; i < length; i++) {
    out += Math.floor(Math.random() * 16).toString(16);
  }

  return out;
};

// Toss orderId rule: 6-64 chars of [A-Za-z0-9-_=], unique per order.
export const buildTossOrderId = (productId: string): string => {
  const shortId = getBulbPackShortId(productId).replace(/[^A-Za-z0-9]/g, '');
  const time = Date.now().toString(36);

  return `martie-${shortId}-${time}-${randomHex(8)}`.slice(0, 64);
};

export const getTossConvexSiteUrl = (): string => {
  const explicit = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;

  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }

  const cloud = process.env.EXPO_PUBLIC_CONVEX_URL ?? '';

  if (cloud.includes('.convex.cloud')) {
    return cloud.replace('.convex.cloud', '.convex.site').replace(/\/+$/, '');
  }

  return '';
};

export const buildTossReturnUrl = (
  siteUrl: string = getTossConvexSiteUrl(),
): string => (siteUrl ? `${siteUrl}/toss/return` : '');

export type TossPayWindowHtmlParams = {
  clientKey: string;
  orderId: string;
  orderName: string;
  amountKrw: number;
  successUrl: string;
  failUrl: string;
};

// Self-contained checkout page: loads the official Toss v1 payment JS and
// opens the payment window preset to Toss Pay. The app WebView intercepts
// the success/fail redirect; postMessage reports lifecycle for the loader.
export const buildTossPayWindowHtml = (
  params: TossPayWindowHtmlParams,
): string => {
  const stringify = (value: string): string => JSON.stringify(value);

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fff;font-family:sans-serif}
#tossPayBtn{border:0;border-radius:12px;background:#0064FF;color:#fff;font-size:16px;font-weight:700;padding:14px 28px}
</style>
</head>
<body>
<button id="tossPayBtn" type="button">Toss Pay</button>
<script src="${TOSS_PAY_SDK_URL}"></script>
<script>
  function send(type, data) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify(Object.assign({type: type}, data || {})),
    );
  }
  function openTossPay() {
    try {
      if (typeof TossPayments === 'undefined') {
        send('sdk-error', {});
        return;
      }
      TossPayments(${stringify(params.clientKey)}).requestPayment(
        ${stringify(TOSS_PAY_WINDOW_METHOD)},
        {
          amount: ${params.amountKrw},
          orderId: ${stringify(params.orderId)},
          orderName: ${stringify(params.orderName)},
          successUrl: ${stringify(params.successUrl)},
          failUrl: ${stringify(params.failUrl)},
        },
      );
      send('opened', {});
    } catch (err) {
      send('sdk-error', {message: String(err && err.message ? err.message : err)});
    }
  }
  document.getElementById('tossPayBtn').addEventListener('click', openTossPay);
  window.addEventListener('load', openTossPay);
</script>
</body>
</html>`;
};
