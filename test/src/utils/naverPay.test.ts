import {runInNewContext} from 'node:vm';
import {BULB_PACK_SKUS} from '../../../src/utils/iapEntitlements';
import {
  buildNaverCheckoutHtml,
  buildNaverMerchantPayKey,
  buildNaverReturnUrl,
  getNaverConvexSiteUrl,
  getOrCreateNaverUserKey,
  splitNaverTaxAmounts,
} from '../../../src/utils/naverPay';
import {storage} from '../../../src/utils/storage';

jest.mock('../../../src/utils/storage', () => {
  const store: Record<string, string> = {};

  return {
    Storage: {NaverUserKey: 'NaverUserKey'},
    storage: {
      getString: jest.fn((key: string) => store[key]),
      set: jest.fn((key: string, value: string) => {
        store[key] = value;
      }),
    },
  };
});

describe('naverPay utils', () => {
  it('builds unique merchant pay keys within Naver limits', () => {
    const first = buildNaverMerchantPayKey(BULB_PACK_SKUS[0]);
    const second = buildNaverMerchantPayKey(BULB_PACK_SKUS[1]);

    for (const key of [first, second]) {
      expect(key).toMatch(/^[A-Za-z0-9-]+$/);
      expect(key.length).toBeLessThanOrEqual(64);
      expect(key.startsWith('npay-')).toBe(true);
    }

    expect(first).not.toBe(second);
    expect(first).toContain('10bulbs');
    expect(second).toContain('30bulbs');
  });

  it('reports fully taxable bulbs without classifying VAT as tax exempt', () => {
    expect(splitNaverTaxAmounts(1400)).toEqual({
      taxScopeAmount: 1400,
      taxExScopeAmount: 0,
    });
    expect(splitNaverTaxAmounts(3800)).toEqual({
      taxScopeAmount: 3800,
      taxExScopeAmount: 0,
    });

    const {taxScopeAmount, taxExScopeAmount} = splitNaverTaxAmounts(1400);
    expect(taxScopeAmount + taxExScopeAmount).toBe(1400);
  });

  it('derives the Convex site URL for the Naver returnUrl', () => {
    process.env.EXPO_PUBLIC_CONVEX_SITE_URL =
      'https://blessed-chameleon-803.convex.site/';
    expect(getNaverConvexSiteUrl()).toBe(
      'https://blessed-chameleon-803.convex.site',
    );
    expect(buildNaverReturnUrl()).toBe(
      'https://blessed-chameleon-803.convex.site/naverpay/return',
    );

    delete process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
    process.env.EXPO_PUBLIC_CONVEX_URL =
      'https://blessed-chameleon-803.convex.cloud';
    expect(getNaverConvexSiteUrl()).toBe(
      'https://blessed-chameleon-803.convex.site',
    );

    delete process.env.EXPO_PUBLIC_CONVEX_URL;
    expect(getNaverConvexSiteUrl()).toBe('');
    expect(buildNaverReturnUrl()).toBe('');
  });

  it('creates and reuses a persisted Naver user key', () => {
    const created = getOrCreateNaverUserKey();

    expect(created.startsWith('martie-naver-')).toBe(true);
    expect(created.length).toBeLessThanOrEqual(50);
    expect(storage.set).toHaveBeenCalledWith(
      'NaverUserKey',
      expect.any(String),
    );
    expect(getOrCreateNaverUserKey()).toBe(created);
  });

  it('builds a self-contained checkout page with order values', () => {
    const html = buildNaverCheckoutHtml({
      clientId: 'test-client',
      chainId: 'test-chain',
      mode: 'development',
      merchantUserKey: 'user-1',
      merchantPayKey: 'npay-test-1',
      productName: 'Martie bulbs',
      productId: BULB_PACK_SKUS[0],
      totalPayAmount: 1400,
      taxScopeAmount: 1400,
      taxExScopeAmount: 0,
      returnUrl: 'https://example.convex.site/naverpay/return',
    });

    expect(html).toContain('https://nsp.pay.naver.com/sdk/js/naverpay.min.js');
    expect(html).toContain('Naver.Pay.create');
    expect(html).toContain('npay-test-1');
    expect(html).toContain('ReactNativeWebView');

    const open = jest.fn();
    const naver = {Pay: {create: jest.fn(() => ({open}))}};
    const script = /<script>\s*([\s\S]*?)<\/script>/.exec(html)?.[1];
    expect(script).toBeDefined();
    runInNewContext(script ?? '', {
      Naver: naver,
      window: {
        Naver: naver,
        ReactNativeWebView: {postMessage: jest.fn()},
        addEventListener: (_event: string, callback: () => void) => callback(),
      },
      document: {getElementById: () => ({addEventListener: jest.fn()})},
    });
    expect(open).toHaveBeenCalledWith(
      expect.objectContaining({
        productCount: 1,
        productItems: [
          {
            categoryType: 'ETC',
            categoryId: 'ETC',
            uid: '10bulbs',
            name: 'Martie bulbs',
            payReferrer: 'ETC',
            count: 1,
          },
        ],
      }),
    );
  });
});
