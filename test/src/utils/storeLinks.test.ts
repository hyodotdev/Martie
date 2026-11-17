import {Linking} from 'react-native';

import {
  ANDROID_PACKAGE_NAME,
  APP_STORE_URLS,
  MARTIE_SHARE_URL,
} from '../../../src/utils/constants';
import {getMartieStoreUrls, openMartieStore} from '../../../src/utils/storeLinks';

describe('storeLinks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the Martie Android package for native and web store URLs', () => {
    expect(getMartieStoreUrls('android')).toEqual([
      `market://details?id=${ANDROID_PACKAGE_NAME}`,
      APP_STORE_URLS.android,
    ]);
    expect(getMartieStoreUrls('android').join(' ')).not.toContain(
      'kr.co.captainparrot',
    );
  });

  it('falls back to Play Store when the Android market URL cannot open', async () => {
    await openMartieStore('android');

    expect(Linking.canOpenURL).toHaveBeenCalledWith(
      `market://details?id=${ANDROID_PACKAGE_NAME}`,
    );
    expect(Linking.openURL).toHaveBeenCalledWith(APP_STORE_URLS.android);
  });

  it('opens the landing page on unsupported platforms', async () => {
    await openMartieStore('web');

    expect(Linking.canOpenURL).not.toHaveBeenCalled();
    expect(Linking.openURL).toHaveBeenCalledWith(MARTIE_SHARE_URL);
  });
});
