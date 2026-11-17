import type {
  ProductSubscriptionIOS,
  ProductSubscriptionAndroid,
  SubscriptionOffer,
} from '../../src/utils/iap';
import {SUB_MONTHLY, SUB_YEARLY} from '../../src/utils/iapEntitlements';
import {
  getAndroidSubscriptionOffer,
  getSubscriptionTerms,
} from '../../src/utils/subscriptionOffers';

const offer = (
  basePlanId: string,
  billingPeriod: string,
  recurrenceMode: number,
  formattedPrice: string,
): SubscriptionOffer => ({
  id: basePlanId,
  basePlanIdAndroid: basePlanId,
  offerTokenAndroid: `${basePlanId}-${billingPeriod}`,
  displayPrice: formattedPrice,
  price: 1,
  type: 'introductory',
  pricingPhasesAndroid: {
    pricingPhaseList: [
      {
        billingCycleCount: 0,
        billingPeriod,
        recurrenceMode,
        formattedPrice,
        priceAmountMicros: '9990000',
        priceCurrencyCode: 'USD',
      },
    ],
  },
});

describe('Google Play subscription offer selection', () => {
  it('selects the monthly prepaid plan even when the annual offer is first', () => {
    const annual = offer('premium-year', 'P1Y', 1, '$99.99');
    const monthly = offer('premium', 'P1M', 3, '$9.99');
    expect(
      getAndroidSubscriptionOffer({
        id: SUB_MONTHLY,
        subscriptionOffers: [annual, monthly],
      }),
    ).toBe(monthly);
  });

  it('selects the annual plan rather than a monthly plan on the yearly SKU', () => {
    const monthly = offer('premum', 'P1M', 1, '$99.99');
    const annual = offer('premium', 'P1Y', 1, '$99.99');
    expect(
      getAndroidSubscriptionOffer({
        id: SUB_YEARLY,
        subscriptionOffers: [monthly, annual],
      }),
    ).toBe(annual);
  });

  it.each([
    offer('premium-year', 'P1Y', 1, '$99.99'),
    offer('premium', 'P1Y', 3, '$9.99'),
    offer('premium', 'P1M', 2, '$9.99'),
    offer('premium', 'P1M', 1, '$9.99'),
    offer('premium', 'P1M', 3, ''),
    {...offer('premium', 'P1M', 3, '$9.99'), offerTokenAndroid: ''},
  ])('does not fall back to incompatible or incomplete terms', (invalid) => {
    expect(
      getAndroidSubscriptionOffer({
        id: SUB_MONTHLY,
        subscriptionOffers: [invalid],
      }),
    ).toBeUndefined();
  });
});

const appleProduct = (): ProductSubscriptionIOS => ({
  id: SUB_MONTHLY,
  platform: 'ios',
  type: 'subs',
  typeIOS: 'auto-renewable-subscription',
  title: 'Premium',
  description: 'Premium',
  displayNameIOS: 'Premium',
  displayPrice: '$9.99',
  currency: 'USD',
  introductoryPricePaymentModeIOS: 'empty',
  isFamilyShareableIOS: false,
  jsonRepresentationIOS: '{}',
  subscriptionPeriodNumberIOS: '1',
  subscriptionPeriodUnitIOS: 'month',
});

describe('App Store subscription disclosures', () => {
  it('uses the loaded localized price for an auto-renewing monthly plan', () => {
    expect(getSubscriptionTerms(appleProduct())).toEqual({
      price: '$9.99',
      autoRenews: true,
    });
  });

  it('rejects a yearly period on the monthly product and missing prices', () => {
    expect(
      getSubscriptionTerms({
        ...appleProduct(),
        subscriptionPeriodUnitIOS: 'year',
      }),
    ).toBeNull();
    expect(
      getSubscriptionTerms({...appleProduct(), displayPrice: ''}),
    ).toBeNull();
    expect(getSubscriptionTerms(undefined)).toBeNull();
  });
});

const androidProduct = (
  offers: SubscriptionOffer[],
): ProductSubscriptionAndroid => ({
  id: SUB_MONTHLY,
  platform: 'android',
  type: 'subs',
  title: 'Premium',
  description: 'Premium',
  nameAndroid: 'Premium',
  currency: 'USD',
  displayPrice: '$99.99',
  subscriptionOffers: offers,
});

describe('store-specific subscription terms', () => {
  it('displays the selected Google prepaid price instead of the product-level annual price', () => {
    const monthly = offer('premium', 'P1M', 3, '$9.99');
    const product = androidProduct([
      offer('premium-year', 'P1Y', 1, '$99.99'),
      monthly,
    ]);
    expect(getSubscriptionTerms(product)).toEqual({
      price: '$9.99',
      autoRenews: false,
    });
    expect(getAndroidSubscriptionOffer(product)).toBe(monthly);
  });

  it.each(['amazon', 'horizon'] as const)(
    'preserves %s product prices and the existing offer choice',
    (store) => {
      const nativeOffer = offer('native-monthly', 'P1M', 1, '$9.99');
      const product = {...androidProduct([nativeOffer]), displayPrice: '$9.99'};
      expect(getAndroidSubscriptionOffer(product, store)).toBe(nativeOffer);
      expect(getSubscriptionTerms(product, store)).toEqual({
        price: '$9.99',
        autoRenews: true,
      });
      expect(getAndroidSubscriptionOffer(product)).toBeUndefined();
    },
  );

  it('does not invent a price when a non-Google store has not loaded it', () => {
    expect(
      getSubscriptionTerms({...androidProduct([]), displayPrice: ''}, 'amazon'),
    ).toBeNull();
  });
});
