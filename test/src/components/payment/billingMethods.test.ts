import {
  BILLING_METHODS,
  billingMethodCopy,
  isBillingMethodReady,
} from '../../../../src/components/payment/billingMethods';
import de from '../../../../assets/langs/de.json';
import en from '../../../../assets/langs/en.json';
import es from '../../../../assets/langs/es.json';
import fr from '../../../../assets/langs/fr.json';
import ja from '../../../../assets/langs/ja.json';
import ko from '../../../../assets/langs/ko.json';
import th from '../../../../assets/langs/th.json';
import tw from '../../../../assets/langs/tw.json';
import vi from '../../../../assets/langs/vi.json';

describe('billingMethods', () => {
  it('lists Google Play first, then Toss, then Naver Pay', () => {
    expect(BILLING_METHODS).toEqual(['googlePlay', 'toss', 'naver']);
  });

  it('always enables Google Play', () => {
    expect(
      isBillingMethodReady('googlePlay', {tossReady: false, naverReady: false}),
    ).toBe(true);
  });

  it('gates Toss and Naver rows on their client keys', () => {
    expect(
      isBillingMethodReady('toss', {tossReady: true, naverReady: false}),
    ).toBe(true);
    expect(
      isBillingMethodReady('toss', {tossReady: false, naverReady: true}),
    ).toBe(false);
    expect(
      isBillingMethodReady('naver', {tossReady: false, naverReady: true}),
    ).toBe(true);
    expect(
      isBillingMethodReady('naver', {tossReady: true, naverReady: false}),
    ).toBe(false);
  });

  it('resolves every sheet copy key in all 9 locales', () => {
    const locales = {de, en, es, fr, ja, ko, th, tw, vi};
    const keys = [
      'purchase.altBilling.chooseTitle',
      'purchase.altBilling.chooseMessage',
      'purchase.altBilling.billingChoiceDisclosure',
      'purchase.altBilling.missingClientKey',
      'purchase.altBilling.testModeSandboxNote',
      ...BILLING_METHODS.flatMap((method) => [
        billingMethodCopy[method].titleKey,
        billingMethodCopy[method].descKey,
      ]),
    ];

    for (const [name, strings] of Object.entries(locales)) {
      for (const key of keys) {
        const value = key
          .split('.')
          .reduce<unknown>(
            (node, part) =>
              typeof node === 'object' && node !== null
                ? (node as Record<string, unknown>)[part]
                : undefined,
            strings,
          );
        expect(typeof value === 'string' && value.length > 0).toBe(true);
      }
      expect(name).toBeTruthy();
    }
  });
});
