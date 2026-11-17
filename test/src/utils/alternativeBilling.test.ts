import {BULB_PACK_SKUS} from '../../../src/utils/iapEntitlements';
import {
  buildTossOrderId,
  buildTossPayWindowHtml,
  buildTossReturnUrl,
  FALLBACK_BULB_PACK_KRW,
  getAltBillingBulbCount,
  getBulbPackShortId,
  getTossAmountKrw,
  isMockApprovalAvailable,
  isTossTestKey,
  MOCK_TOSS_PAYMENT_KEY_PREFIX,
  TOSS_PAY_SDK_URL,
  TOSS_PAY_WINDOW_METHOD,
} from '../../../src/utils/alternativeBilling';

describe('alternativeBilling utils', () => {
  it('maps bulb packs to bulb counts', () => {
    expect(getAltBillingBulbCount(BULB_PACK_SKUS[0])).toBe(10);
    expect(getAltBillingBulbCount(BULB_PACK_SKUS[1])).toBe(30);
    expect(getAltBillingBulbCount('unknown.sku')).toBe(0);
  });

  it('detects Toss test keys', () => {
    expect(isTossTestKey('test_ck_abc')).toBe(true);
    expect(isTossTestKey('live_ck_abc')).toBe(false);
    expect(isTossTestKey('')).toBe(false);
  });

  it('shortens Martie SKUs for order ids', () => {
    expect(getBulbPackShortId('dev.hyo.martie.10bulbs')).toBe('10bulbs');
    expect(getBulbPackShortId('dev.hyo.martie.30bulbs')).toBe('30bulbs');
  });

  it('derives KRW amounts from Play offer prices', () => {
    expect(
      getTossAmountKrw(
        {priceCurrencyCode: 'KRW', priceAmountMicros: 1200000000},
        BULB_PACK_SKUS[0],
      ),
    ).toBe(1200);
    expect(
      getTossAmountKrw(
        {priceCurrencyCode: 'KRW', priceAmountMicros: '1500000000'},
        BULB_PACK_SKUS[0],
      ),
    ).toBe(1500);
  });

  it('falls back to fixed KRW amounts without KRW offer prices', () => {
    expect(getTossAmountKrw(undefined, BULB_PACK_SKUS[0])).toBe(
      FALLBACK_BULB_PACK_KRW[BULB_PACK_SKUS[0]],
    );
    expect(
      getTossAmountKrw(
        {priceCurrencyCode: 'USD', priceAmountMicros: 990000},
        BULB_PACK_SKUS[0],
      ),
    ).toBe(FALLBACK_BULB_PACK_KRW[BULB_PACK_SKUS[0]]);
    expect(
      getTossAmountKrw(
        {priceCurrencyCode: 'KRW', priceAmountMicros: 'not-a-number'},
        BULB_PACK_SKUS[0],
      ),
    ).toBe(FALLBACK_BULB_PACK_KRW[BULB_PACK_SKUS[0]]);
    expect(getTossAmountKrw(undefined, 'unknown.sku')).toBe(0);
  });

  it('builds Toss-safe unique order ids', () => {
    const first = buildTossOrderId(BULB_PACK_SKUS[0]);
    const second = buildTossOrderId(BULB_PACK_SKUS[0]);

    for (const orderId of [first, second]) {
      expect(orderId).toMatch(/^[A-Za-z0-9\-_=]+$/);
      expect(orderId.length).toBeGreaterThanOrEqual(6);
      expect(orderId.length).toBeLessThanOrEqual(64);
      expect(orderId).toContain('10bulbs');
    }

    expect(first).not.toBe(second);
  });

  it('pins the mock payment key prefix (mirrored in convex/toss.ts)', () => {
    expect(MOCK_TOSS_PAYMENT_KEY_PREFIX).toBe('MOCK-TOSS-');
  });

  it('offers mock approval only off the prod backend', () => {
    expect(
      isMockApprovalAvailable('https://blessed-chameleon-803.convex.cloud'),
    ).toBe(true);
    expect(
      isMockApprovalAvailable('https://proficient-vole-163.convex.cloud'),
    ).toBe(false);
    expect(isMockApprovalAvailable('https://martie-server.hyo.dev')).toBe(
      false,
    );
    expect(isMockApprovalAvailable('')).toBe(false);
  });

  it('pins the v1 Toss Pay window SDK contract', () => {
    expect(TOSS_PAY_SDK_URL).toBe('https://js.tosspayments.com/v1/payment');
    expect(TOSS_PAY_WINDOW_METHOD).toBe('토스페이');
  });

  it('builds the return url from the Convex site', () => {
    expect(
      buildTossReturnUrl('https://thankful-dachshund-999.convex.site'),
    ).toBe('https://thankful-dachshund-999.convex.site/toss/return');
    expect(buildTossReturnUrl('')).toBe('');
  });

  it('builds a self-contained Toss Pay window page', () => {
    const html = buildTossPayWindowHtml({
      clientKey: 'test_ck_sample',
      orderId: 'martie-10bulbs-abc123',
      orderName: 'Martie 10 bulbs',
      amountKrw: 1400,
      successUrl: 'https://example.convex.site/toss/return',
      failUrl: 'https://example.convex.site/toss/return',
    });

    expect(html).toContain(TOSS_PAY_SDK_URL);
    expect(html).toContain(JSON.stringify(TOSS_PAY_WINDOW_METHOD));
    expect(html).toContain('martie-10bulbs-abc123');
    expect(html).toContain('https://example.convex.site/toss/return');
    expect(html).toContain('amount: 1400');
    // Bridge protocol consumed by app/toss-checkout.tsx onMessage.
    expect(html).toContain("send('opened', {})");
    expect(html).toContain("send('sdk-error', {})");
    expect(html).toContain('id="tossPayBtn"');
  });
});
