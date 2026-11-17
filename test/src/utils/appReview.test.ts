import {Alert, Linking, Platform} from 'react-native';
import {storage, Storage} from '../../../src/utils/storage';
import {requestAppReviewIfEligible} from '../../../src/utils/appReview';
import {logEvent} from '../../../src/utils/analytics';

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Linking: {
    openURL: jest.fn(),
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((options) => options.ios),
  },
}));

jest.mock('../../../src/STRINGS', () => ({
  t: jest.fn((key: string) => key),
}));

jest.mock('../../../src/utils/analytics', () => ({
  logEvent: jest.fn(),
}));

jest.mock('../../../src/utils/storage', () => ({
  storage: {
    getNumber: jest.fn(),
    set: jest.fn(),
  },
  Storage: {
    AppReviewAskCount: 'AppReviewAskCount',
    AppReviewLastAskedAt: 'AppReviewLastAskedAt',
  },
}));

jest.mock('../../../src/utils/constants', () => ({
  APP_STORE_URLS: {
    ios: 'https://apps.apple.com/app/id6740057833',
    android: 'https://play.google.com/store/apps/details?id=dev.hyo.martie',
  },
}));

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function setStorageRead(values: Record<string, unknown>) {
  (storage.getNumber as jest.Mock).mockImplementation((key: string) => {
    const value = values[key];
    return typeof value === 'number' ? value : undefined;
  });
}

describe('requestAppReviewIfEligible', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    setStorageRead({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the prompt, records ask state, and opens the store on accept', () => {
    requestAppReviewIfEligible('perfect_daily');

    expect(Alert.alert).toHaveBeenCalledWith(
      'reviewPrompt.title',
      'reviewPrompt.body',
      expect.any(Array),
    );
    expect(storage.set).toHaveBeenCalledWith(
      Storage.AppReviewLastAskedAt,
      1700000000000,
    );
    expect(storage.set).toHaveBeenCalledWith(Storage.AppReviewAskCount, 1);
    expect(logEvent).toHaveBeenCalledWith('app_review_prompt_shown', {
      reason: 'perfect_daily',
    });

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    buttons[1].onPress();

    expect(logEvent).toHaveBeenCalledWith('app_review_prompt_accepted', {
      reason: 'perfect_daily',
    });
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://apps.apple.com/app/id6740057833',
    );
  });

  it('does not show again during the cooldown window', () => {
    setStorageRead({
      [Storage.AppReviewAskCount]: 1,
      [Storage.AppReviewLastAskedAt]: 1700000000000 - THIRTY_DAYS_MS + 1000,
    });

    requestAppReviewIfEligible('streak_milestone');

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('does not show after the maximum ask count', () => {
    setStorageRead({
      [Storage.AppReviewAskCount]: 3,
    });

    requestAppReviewIfEligible('perfect_daily');

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('uses the platform store URL selected by React Native', () => {
    (Platform.select as jest.Mock).mockImplementationOnce(
      (options) => options.android,
    );

    requestAppReviewIfEligible('streak_milestone');
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    buttons[1].onPress();

    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://play.google.com/store/apps/details?id=dev.hyo.martie',
    );
  });
});
