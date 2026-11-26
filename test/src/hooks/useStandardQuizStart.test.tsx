import {act, renderHook} from '@testing-library/react-native';
import {useStandardQuizStart} from '../../../src/hooks/useStandardQuizStart';
import {useUserStore} from '../../../src/stores/userStore';
import {LOG_EVENTS, logEvent} from '../../../src/utils/analytics';

const mockToastError = jest.fn();

jest.mock('@backpackapp-io/react-native-toast', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

jest.mock('../../../src/utils/analytics', () => ({
  LOG_EVENTS: {
    BULB_DEPLETED: 'bulb_depleted',
  },
  logEvent: jest.fn(),
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return {promise, resolve};
}

type UpdateBulbCount = (
  count: number,
  operation?: 'set' | 'add' | 'subtract',
) => Promise<void>;

describe('useStandardQuizStart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUserStore.setState({isPremium: false});
  });

  it('blocks duplicate starts while bulb spending is pending', async () => {
    const deferred = createDeferred<void>();
    const updateBulbCount = jest.fn<
      ReturnType<UpdateBulbCount>,
      Parameters<UpdateBulbCount>
    >(() => deferred.promise);
    const navigate = jest.fn();
    const {result} = await renderHook(() =>
      useStandardQuizStart({
        bulbCount: 2,
        quizCount: 5,
        updateBulbCount,
        navigate,
      }),
    );

    let firstStart!: Promise<void | undefined>;
    let duplicateStart!: Promise<void | undefined>;

    await act(() => {
      firstStart = result.current.startStandardQuiz();
      duplicateStart = result.current.startStandardQuiz();
    });

    expect(updateBulbCount).toHaveBeenCalledTimes(1);
    expect(updateBulbCount).toHaveBeenCalledWith(1, 'subtract');
    expect(result.current.isStartingStandardQuiz).toBe(true);
    await expect(duplicateStart).resolves.toBeUndefined();

    await act(async () => {
      deferred.resolve();
      await firstStart;
    });

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/quiz');
    expect(result.current.isStartingStandardQuiz).toBe(false);
  });

  it('does not spend bulbs for premium users', async () => {
    useUserStore.setState({isPremium: true});
    const updateBulbCount = jest.fn<
      ReturnType<UpdateBulbCount>,
      Parameters<UpdateBulbCount>
    >(() => Promise.resolve());
    const navigate = jest.fn();
    const {result} = await renderHook(() =>
      useStandardQuizStart({
        bulbCount: 0,
        quizCount: 5,
        updateBulbCount,
        navigate,
      }),
    );

    await act(async () => {
      await result.current.startStandardQuiz();
    });

    expect(updateBulbCount).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/quiz');
  });

  it.each([0, -1])(
    'keeps users on home when bulb count is %i',
    async (bulbCount) => {
      const updateBulbCount = jest.fn<
        ReturnType<UpdateBulbCount>,
        Parameters<UpdateBulbCount>
      >(() => Promise.resolve());
      const navigate = jest.fn();
      const {result} = await renderHook(() =>
        useStandardQuizStart({
          bulbCount,
          quizCount: 5,
          updateBulbCount,
          navigate,
        }),
      );

      await act(async () => {
        await result.current.startStandardQuiz();
      });

      expect(logEvent).toHaveBeenCalledWith(LOG_EVENTS.BULB_DEPLETED, {
        source: 'start_quiz',
      });
      expect(mockToastError).toHaveBeenCalled();
      expect(updateBulbCount).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    },
  );
});
