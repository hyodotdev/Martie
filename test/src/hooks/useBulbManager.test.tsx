import {act, renderHook} from '@testing-library/react-native';
import {useBulbManager} from '../../../src/hooks/useBulbManager';

let mockUser: {_id: string} | null | undefined;
let mockServerBulbs: number | null | undefined;
let mockLocalBulbs: number | undefined;
const mockSetLocal = jest.fn();
const mockUpdateServer = jest.fn().mockResolvedValue(undefined);
const mockSyncServer = jest.fn().mockResolvedValue(undefined);
const mockInitializeServer = jest.fn().mockResolvedValue(undefined);

jest.mock('react-native-mmkv', () => ({
  useMMKVNumber: () => [mockLocalBulbs, mockSetLocal],
}));
jest.mock('../../../src/utils/storage', () => ({
  Storage: {BulbCount: 'BulbCount'},
}));
jest.mock('../../../convex/_generated/api', () => ({
  api: {
    user: {
      queries: {currentUser: 'currentUser', getBulbCount: 'getBulbCount'},
      mutations: {
        updateBulbCount: 'updateBulbCount',
        syncBulbCount: 'syncBulbCount',
        initializeBulbCount: 'initializeBulbCount',
      },
    },
  },
}));
jest.mock('convex/react', () => ({
  useQuery: (query: string) =>
    query === 'currentUser' ? mockUser : mockServerBulbs,
  useMutation: (mutation: string) => {
    if (mutation === 'updateBulbCount') return mockUpdateServer;
    if (mutation === 'syncBulbCount') return mockSyncServer;
    return mockInitializeServer;
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = undefined;
  mockServerBulbs = undefined;
  mockLocalBulbs = undefined;
});

it('does not initialize a guest balance before authentication resolves', () => {
  const {result} = renderHook(() => useBulbManager());
  expect(result.current.isLoading).toBe(true);
  expect(mockSetLocal).not.toHaveBeenCalled();
  expect(mockInitializeServer).not.toHaveBeenCalled();
  expect(mockUpdateServer).not.toHaveBeenCalled();
});

it('waits for the purchased server balance before syncing guest bulbs', async () => {
  mockUser = {_id: 'user-a'};
  mockLocalBulbs = 2;
  const {result, rerender} = renderHook(() => useBulbManager());
  expect(result.current.isLoading).toBe(true);
  expect(mockSyncServer).not.toHaveBeenCalled();
  mockServerBulbs = 35;
  await act(async () => rerender({}));
  expect(result.current.bulbCount).toBe(35);
  expect(mockSyncServer).toHaveBeenCalledWith({localBulbCount: 2});
  expect(mockUpdateServer).not.toHaveBeenCalled();
});

it('initializes only an unset guest balance and preserves a spent zero balance', () => {
  mockUser = null;
  mockServerBulbs = null;
  const {rerender} = renderHook(() => useBulbManager());
  expect(mockSetLocal).toHaveBeenCalledWith(2);
  mockSetLocal.mockClear();
  mockLocalBulbs = 0;
  rerender({});
  expect(mockSetLocal).not.toHaveBeenCalled();
  expect(mockUpdateServer).not.toHaveBeenCalled();
});

it('delegates signed-in initialization to the server without resetting the balance', () => {
  mockUser = {_id: 'user-a'};
  mockServerBulbs = 35;
  mockLocalBulbs = 0;
  const {result} = renderHook(() => useBulbManager());
  expect(result.current.bulbCount).toBe(35);
  expect(mockInitializeServer).toHaveBeenCalledTimes(1);
  expect(mockUpdateServer).not.toHaveBeenCalled();
});
