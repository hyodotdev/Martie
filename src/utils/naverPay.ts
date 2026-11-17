import {
  getBulbPackShortId,
  getTossAmountKrw,
  randomHex,
} from './alternativeBilling';
import {Storage, storage} from './storage';

// Naver Pay 결제형 (단건) integration for alternative-billing PG tests.
// Docs: https://docs.pay.naver.com/docs/onetime-payment/payment/payment-auth-window

export const NAVER_PAY_CLIENT_ID =
  process.env.EXPO_PUBLIC_NAVER_PAY_CLIENT_ID ?? '';
export const NAVER_PAY_CHAIN_ID =
  process.env.EXPO_PUBLIC_NAVER_PAY_CHAIN_ID ?? '';
export const NAVER_PAY_MODE =
  process.env.EXPO_PUBLIC_NAVER_PAY_MODE ?? 'development';
export const NAVER_PAY_SDK_URL =
  'https://nsp.pay.naver.com/sdk/js/naverpay.min.js';
export const NAVER_PAYMENT_METHOD_TEST = 'naver_test';
export const NAVER_PAYMENT_METHOD_ALT = 'naver_alternative_billing';

export const isNaverDevMode = (): boolean => NAVER_PAY_MODE !== 'production';

// KRW pack amounts are PG-agnostic; reuse the verified Play-price table.
export const getNaverAmountKrw = getTossAmountKrw;

export const getNaverConvexSiteUrl = (): string => {
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

export const buildNaverReturnUrl = (
  siteUrl: string = getNaverConvexSiteUrl(),
): string => (siteUrl ? `${siteUrl}/naverpay/return` : '');

export const splitNaverTaxAmounts = (
  totalKrw: number,
): {taxScopeAmount: number; taxExScopeAmount: number} => {
  return {taxScopeAmount: totalKrw, taxExScopeAmount: 0};
};

// Naver merchantPayKey: max 64 bytes, unique per order.
export const buildNaverMerchantPayKey = (productId: string): string => {
  const shortId = getBulbPackShortId(productId).replace(/[^A-Za-z0-9]/g, '');
  const time = Date.now().toString(36);

  return `npay-${shortId}-${time}-${randomHex(8)}`.slice(0, 64);
};

// Non-identifiable stable user key (Naver forbids personal IDs here).
export const getOrCreateNaverUserKey = (): string => {
  const existing = storage.getString(Storage.NaverUserKey);

  if (existing) {
    return existing;
  }

  const created = `martie-naver-${randomHex(12)}`;
  storage.set(Storage.NaverUserKey, created);

  return created;
};

export type NaverCheckoutHtmlParams = {
  clientId: string;
  chainId: string;
  mode: string;
  merchantUserKey: string;
  merchantPayKey: string;
  productName: string;
  productId: string;
  totalPayAmount: number;
  taxScopeAmount: number;
  taxExScopeAmount: number;
  returnUrl: string;
};

// Self-contained checkout page: loads the official Naver Pay JS SDK and
// opens the payment window (page type, stays inside the app WebView).
export const buildNaverCheckoutHtml = (
  params: NaverCheckoutHtmlParams,
): string => {
  const stringify = (value: string): string => JSON.stringify(value);

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fff;font-family:sans-serif}
#naverPayBtn{border:0;border-radius:12px;background:#03C75A;color:#fff;font-size:16px;font-weight:700;padding:14px 28px}
</style>
</head>
<body>
<button id="naverPayBtn" type="button">Naver Pay</button>
<script src="${NAVER_PAY_SDK_URL}"></script>
<script>
  function send(type, data) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify(Object.assign({type: type}, data || {})),
    );
  }
  function openNaverPay() {
    try {
      if (!window.Naver || !Naver.Pay) {
        send('sdk-error', {});
        return;
      }
      var oPay = Naver.Pay.create({
        mode: ${stringify(params.mode)},
        clientId: ${stringify(params.clientId)},
        chainId: ${stringify(params.chainId)},
      });
      oPay.open({
        merchantUserKey: ${stringify(params.merchantUserKey)},
        merchantPayKey: ${stringify(params.merchantPayKey)},
        productName: ${stringify(params.productName)},
        productCount: 1,
        productItems: [{
          categoryType: 'ETC',
          categoryId: 'ETC',
          uid: ${stringify(getBulbPackShortId(params.productId))},
          name: ${stringify(params.productName)},
          payReferrer: 'ETC',
          count: 1,
        }],
        totalPayAmount: ${params.totalPayAmount},
        taxScopeAmount: ${params.taxScopeAmount},
        taxExScopeAmount: ${params.taxExScopeAmount},
        returnUrl: ${stringify(params.returnUrl)},
      });
      send('opened', {});
    } catch (err) {
      send('sdk-error', {message: String(err && err.message ? err.message : err)});
    }
  }
  document.getElementById('naverPayBtn').addEventListener('click', openNaverPay);
  window.addEventListener('load', openNaverPay);
</script>
</body>
</html>`;
};
