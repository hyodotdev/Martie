import {act, renderHook} from '@testing-library/react-native';
import {useAsync} from '../../../src/hooks/useAsync';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {promise, resolve, reject};
}

describe('useAsync', () => {
  it('blocks duplicate executions before loading rerenders', async () => {
    const deferred = createDeferred<string>();
    const asyncFunction = jest.fn<Promise<string>, []>(() => deferred.promise);
    const {result} = renderHook(() => useAsync(asyncFunction));

    let firstCall: Promise<string | undefined>;
    let duplicateCall: Promise<string | undefined>;

    act(() => {
      firstCall = result.current.execute();
      duplicateCall = result.current.execute();
    });

    expect(asyncFunction).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(true);
    await expect(duplicateCall!).resolves.toBeUndefined();

    await act(async () => {
      deferred.resolve('sent');
      await expect(firstCall!).resolves.toBe('sent');
    });

    expect(result.current.loading).toBe(false);
  });

  it('releases the execution lock after a failure', async () => {
    const failedAttempt = createDeferred<string>();
    const successfulAttempt = createDeferred<string>();
    const asyncFunction = jest
      .fn<Promise<string>, []>()
      .mockReturnValueOnce(failedAttempt.promise)
      .mockReturnValueOnce(successfulAttempt.promise);
    const {result} = renderHook(() => useAsync(asyncFunction));

    let firstCall: Promise<string | undefined>;
    act(() => {
      firstCall = result.current.execute();
    });

    await act(async () => {
      failedAttempt.reject(new Error('network error'));
      await expect(firstCall!).rejects.toThrow('network error');
    });

    expect(result.current.loading).toBe(false);

    let retryCall: Promise<string | undefined>;
    act(() => {
      retryCall = result.current.execute();
    });

    expect(asyncFunction).toHaveBeenCalledTimes(2);

    await act(async () => {
      successfulAttempt.resolve('retried');
      await expect(retryCall!).resolves.toBe('retried');
    });

    expect(result.current.loading).toBe(false);
  });

  it('keeps execute stable while calling the latest async function', async () => {
    const firstFunction = jest.fn<Promise<string>, []>(() =>
      Promise.resolve('first'),
    );
    const latestFunction = jest.fn<Promise<string>, []>(() =>
      Promise.resolve('latest'),
    );
    let asyncFunction = firstFunction;
    const {result, rerender} = renderHook(() => useAsync(asyncFunction));
    const initialExecute = result.current.execute;

    asyncFunction = latestFunction;
    rerender(undefined);

    expect(result.current.execute).toBe(initialExecute);

    await act(async () => {
      await expect(result.current.execute()).resolves.toBe('latest');
    });

    expect(firstFunction).not.toHaveBeenCalled();
    expect(latestFunction).toHaveBeenCalledTimes(1);
  });
});
