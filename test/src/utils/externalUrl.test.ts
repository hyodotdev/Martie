import {Linking} from 'react-native';
import {
  openExternalCheckoutUrl,
  resolveAndroidIntentUrl,
} from '../../../src/utils/externalUrl';

jest.mock('react-native', () => ({
  Linking: {openURL: jest.fn()},
}));

const openURL = Linking.openURL as jest.Mock;

describe('resolveAndroidIntentUrl', () => {
  it('passes plain scheme and https urls through', () => {
    expect(resolveAndroidIntentUrl('supertoss://pay?x=1')).toBe(
      'supertoss://pay?x=1',
    );
    expect(resolveAndroidIntentUrl('https://example.com/a')).toBe(
      'https://example.com/a',
    );
  });

  it('rebuilds scheme urls from intent:// links', () => {
    expect(
      resolveAndroidIntentUrl(
        'intent://pay?orderId=1#Intent;scheme=supertoss;package=viva.republica.toss;end',
      ),
    ).toBe('supertoss://pay?orderId=1');
  });

  it('falls back to browser_fallback_url without a scheme', () => {
    expect(
      resolveAndroidIntentUrl(
        'intent://pay#Intent;package=viva.republica.toss;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fx;end',
      ),
    ).toBe('https://play.google.com/x');
  });

  it('passes malformed intent urls through unchanged', () => {
    expect(resolveAndroidIntentUrl('intent://pay')).toBe('intent://pay');
  });
});

describe('openExternalCheckoutUrl', () => {
  beforeEach(() => {
    openURL.mockReset();
  });

  it('opens the resolved url', async () => {
    openURL.mockResolvedValue(undefined);

    await expect(
      openExternalCheckoutUrl(
        'intent://pay#Intent;scheme=supertoss;package=viva.republica.toss;end',
      ),
    ).resolves.toBe(true);
    expect(openURL).toHaveBeenCalledWith('supertoss://pay');
  });

  it('tries the fallback url when the app cannot open', async () => {
    openURL
      .mockRejectedValueOnce(new Error('no activity'))
      .mockResolvedValueOnce(undefined);

    await expect(
      openExternalCheckoutUrl(
        'intent://pay#Intent;scheme=missingapp;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fx;end',
      ),
    ).resolves.toBe(true);
    expect(openURL).toHaveBeenNthCalledWith(2, 'https://play.google.com/x');
  });

  it('resolves false when nothing can open', async () => {
    openURL.mockRejectedValue(new Error('no activity'));

    await expect(
      openExternalCheckoutUrl('missingapp://pay'),
    ).resolves.toBe(false);
  });
});
