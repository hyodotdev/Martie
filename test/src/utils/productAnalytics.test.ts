import type {ProductEventBatch} from '../../../convex/analytics/types';
import {
  connectProductAnalytics,
  flushProductAnalytics,
  trackProductAnalyticsEvent,
  trackProductEvent,
} from '../../../src/utils/productAnalytics';

const mockValues = new Map<string, string | number>();
let mockSource: string | undefined;

jest.mock('../../../src/utils/storage', () => ({
  Storage: {
    ProductAnalyticsVisitor: 'ProductAnalyticsVisitor',
    ProductAnalyticsQueue: 'ProductAnalyticsQueue',
    FirstLaunchAt: 'FirstLaunchAt',
    Locale: 'Locale',
  },
  storage: {
    getString: (key: string) => {
      const value = mockValues.get(key);
      return typeof value === 'string' ? value : undefined;
    },
    getNumber: (key: string) => {
      const value = mockValues.get(key);
      return typeof value === 'number' ? value : undefined;
    },
    set: (key: string, value: string | number) => mockValues.set(key, value),
  },
}));
jest.mock('../../../src/utils/acquisition', () => ({
  getAcquisitionSource: () => mockSource,
}));
jest.mock('../../../src/STRINGS', () => ({getLocale: () => 'ko'}));

describe('first-party guest analytics delivery', () => {
  let disconnect: (() => void) | undefined;
  beforeEach(() => {
    Object.defineProperty(global, '__DEV__', {value: false, writable: true});
    mockValues.clear();
    mockSource = undefined;
    jest.useFakeTimers({doNotFake: ['nextTick', 'setImmediate']});
    jest.setSystemTime(new Date('2026-10-13T10:00:00+09:00'));
  });
  afterEach(() => {
    disconnect?.();
    jest.useRealTimers();
    Object.defineProperty(global, '__DEV__', {value: true, writable: true});
  });

  it('persists a guest identity and captures new installs before FirstLaunchAt is set', async () => {
    const send = jest
      .fn<Promise<void>, [ProductEventBatch]>()
      .mockResolvedValue();
    disconnect = connectProductAnalytics(send);
    mockValues.set('FirstLaunchAt', Date.now());
    trackProductAnalyticsEvent('app_launch', {});
    await flushProductAnalytics();
    const first = send.mock.calls[0][0];
    expect(first.isNewInstall).toBe(true);
    expect(first.events[0].source).toBe('unattributed');
    expect(first.events[0].language).toBe('ko');

    disconnect();
    const afterSignIn = jest
      .fn<Promise<void>, [ProductEventBatch]>()
      .mockResolvedValue();
    disconnect = connectProductAnalytics(afterSignIn);
    trackProductAnalyticsEvent('daily_quiz_completed', {});
    await flushProductAnalytics();
    expect(afterSignIn.mock.calls[0][0].visitorId).toBe(first.visitorId);
  });

  it('keeps existing installs out of new-install acquisition cohorts', async () => {
    mockValues.set('FirstLaunchAt', Date.parse('2026-08-01'));
    const send = jest
      .fn<Promise<void>, [ProductEventBatch]>()
      .mockResolvedValue();
    disconnect = connectProductAnalytics(send);
    trackProductEvent('visit');
    await flushProductAnalytics();
    expect(send.mock.calls[0][0].isNewInstall).toBe(false);
  });

  it('counts first opens after rollout even when the embedded binary already recorded launch', async () => {
    mockValues.set('FirstLaunchAt', Date.now() - 60_000);
    const send = jest
      .fn<Promise<void>, [ProductEventBatch]>()
      .mockResolvedValue();
    disconnect = connectProductAnalytics(send);
    trackProductEvent('visit');
    await flushProductAnalytics();
    expect(send.mock.calls[0][0].isNewInstall).toBe(true);
  });

  it('replays offline completion and next-day visits with their original timestamps', async () => {
    const offline = jest
      .fn<Promise<void>, [ProductEventBatch]>()
      .mockRejectedValue(new Error('offline'));
    disconnect = connectProductAnalytics(offline);
    mockSource = 'shorts_ko';
    trackProductEvent('daily_quiz_completed');
    await flushProductAnalytics();
    const first = offline.mock.calls[0][0];
    disconnect();
    jest.setSystemTime(new Date('2026-10-14T10:00:00+09:00'));
    trackProductEvent('visit');
    const recovered = jest
      .fn<Promise<void>, [ProductEventBatch]>()
      .mockResolvedValue();
    disconnect = connectProductAnalytics(recovered);
    await flushProductAnalytics();
    expect(recovered.mock.calls[0][0].visitorId).toBe(first.visitorId);
    expect(
      recovered.mock.calls[0][0].events.map((event) => event.occurredAt),
    ).toEqual([
      Date.parse('2026-10-13T10:00:00+09:00'),
      Date.parse('2026-10-14T10:00:00+09:00'),
    ]);
    expect(JSON.parse(String(mockValues.get('ProductAnalyticsQueue')))).toEqual(
      [],
    );
  });

  it('does not remove events captured while a batch is in flight', async () => {
    let acknowledge: (() => void) | undefined;
    const send = jest
      .fn<Promise<void>, [ProductEventBatch]>()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            acknowledge = resolve;
          }),
      )
      .mockResolvedValue();
    disconnect = connectProductAnalytics(send);
    trackProductEvent('visit');
    trackProductEvent('daily_quiz_completed');
    acknowledge?.();
    await flushProductAnalytics();
    await Promise.resolve();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][0].events[0].name).toBe('daily_quiz_completed');
  });

  it('does not collect development runs or unrelated event properties', async () => {
    const send = jest
      .fn<Promise<void>, [ProductEventBatch]>()
      .mockResolvedValue();
    disconnect = connectProductAnalytics(send);
    trackProductAnalyticsEvent('quiz_correct', {
      email: 'never-upload@example.com',
    });
    Object.defineProperty(global, '__DEV__', {value: true, writable: true});
    trackProductEvent('visit');
    await flushProductAnalytics();
    expect(send).not.toHaveBeenCalled();
  });

  it('recovers malformed local records without interrupting startup or delivery', async () => {
    mockValues.set('FirstLaunchAt', Date.parse('2026-08-01'));
    mockValues.set('ProductAnalyticsVisitor', '{broken');
    mockValues.set('ProductAnalyticsQueue', '{broken');
    const send = jest
      .fn<Promise<void>, [ProductEventBatch]>()
      .mockResolvedValue();
    disconnect = connectProductAnalytics(send);
    trackProductEvent('visit');
    await flushProductAnalytics();
    expect(send.mock.calls[0][0].isNewInstall).toBe(false);
    expect(send.mock.calls[0][0].events).toHaveLength(1);
  });
});
