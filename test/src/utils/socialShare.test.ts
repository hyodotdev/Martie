import {Linking, Share} from 'react-native';
import {shareToSocial, withShareSource} from '../../../src/utils/socialShare';

jest.mock('react-native', () => ({
  Linking: {
    openURL: jest.fn(),
  },
  Share: {
    share: jest.fn(),
    sharedAction: 'sharedAction',
  },
}));

jest.mock('../../../src/utils/analytics', () => ({
  LOG_EVENTS: {
    SHARE_INITIATED: 'share_initiated',
    SHARE_COMPLETED: 'share_completed',
    SHARE_SHEET_CLOSED: 'share_sheet_closed',
  },
  logEvent: jest.fn(),
}));

jest.mock('../../../src/utils/error', () => ({
  logError: jest.fn(),
}));

describe('socialShare', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Linking.openURL as jest.Mock).mockResolvedValue(undefined);
    (Share.share as jest.Mock).mockResolvedValue({
      action: Share.sharedAction,
    });
  });

  it('공유 source query를 교체한다', () => {
    expect(
      withShareSource('https://hyo.dev/martie?source=old', 'line'),
    ).toBe('https://hyo.dev/martie?source=share_line');
  });

  it('X Web Intent를 연다', async () => {
    await shareToSocial({
      platform: 'twitter',
      source: 'daily_result',
      text: 'Today',
      url: 'https://hyo.dev/martie',
    });

    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining('https://twitter.com/intent/tweet?'),
    );
    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining('source%3Dshare_twitter'),
    );
  });

  it('LINE 공유 URL을 연다', async () => {
    await shareToSocial({
      platform: 'line',
      source: 'daily_result',
      text: 'Today',
      url: 'https://hyo.dev/martie',
    });

    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining('https://line.me/R/share?text='),
    );
    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining('source%3Dshare_line'),
    );
  });

  it('LINE intent를 열 수 없으면 시스템 공유 시트로 fallback한다', async () => {
    (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('blocked'));

    await shareToSocial({
      platform: 'line',
      source: 'daily_result',
      text: 'Today',
      url: 'https://hyo.dev/martie',
    });

    expect(Share.share).toHaveBeenCalledWith({
      message: expect.stringContaining('https://hyo.dev/martie?source=share_line'),
    });
  });
});
