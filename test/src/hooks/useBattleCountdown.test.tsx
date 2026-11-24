import {act, renderHook} from '@testing-library/react-native';
import {useBattleCountdown, useNow} from '../../../src/hooks/useBattleCountdown';

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(10_000);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useBattleCountdown', () => {
  it('ticks down to zero on the server clock', () => {
    const {result} = renderHook(() => useBattleCountdown(13_000, 1000));
    expect(result.current).toBe(2000);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(1000);

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current).toBe(0);
  });

  it('restarts when the phase deadline changes', () => {
    const {result, rerender} = renderHook(
      ({endsAt}: {endsAt: number | null}) => useBattleCountdown(endsAt, 0),
      {initialProps: {endsAt: null as number | null}},
    );
    expect(result.current).toBe(0);
    rerender({endsAt: 25_000});
    expect(result.current).toBe(15_000);
  });
});

describe('useNow', () => {
  it('refreshes on its interval', () => {
    const {result} = renderHook(() => useNow(5000));
    expect(result.current).toBe(10_000);
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current).toBe(15_000);
  });
});
