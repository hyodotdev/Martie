import {act, renderHook, waitFor} from '@testing-library/react-native';
import {AppState, type AppStateStatus} from 'react-native';
import {BATTLE_HEARTBEAT_MS} from '../../../convex/battle/logic';
import {useBattleRoom} from '../../../src/hooks/useBattleRoom';

let mockAuth = {isAuthenticated: true, isLoading: false};
let mockRoom: {status: string; myRole: string | null} | null | undefined;
const mockJoin = jest.fn();
const mockHeartbeat = jest.fn();
const mockLeave = jest.fn().mockResolvedValue({ok: true});

jest.mock('../../../convex/_generated/api', () => ({
  api: {
    battle: {
      queries: {getRoom: 'getRoom'},
      mutations: {joinRoom: 'joinRoom', heartbeat: 'heartbeat', leave: 'leave'},
    },
  },
}));
jest.mock('convex/react', () => ({
  useConvexAuth: () => mockAuth,
  useQuery: () => mockRoom,
  useMutation: (name: string) =>
    name === 'joinRoom' ? mockJoin : name === 'heartbeat' ? mockHeartbeat : mockLeave,
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(1000);
  mockAuth = {isAuthenticated: true, isLoading: false};
  mockRoom = {status: 'waiting', myRole: 'guest'};
  mockJoin.mockResolvedValue({ok: true, role: 'guest', serverNow: 6000});
  // The server clock runs 5 s ahead of the device in every reply.
  mockHeartbeat.mockImplementation(() =>
    Promise.resolve({serverNow: Date.now() + 5000}),
  );
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useBattleRoom', () => {
  it('takes the seat once and syncs the clock from the reply', async () => {
    const {result, rerender} = await renderHook(() => useBattleRoom('abcd2345'));
    await waitFor(() => expect(result.current.hasJoined).toBe(true));
    await rerender({});
    expect(mockJoin).toHaveBeenCalledTimes(1);
    expect(mockJoin).toHaveBeenCalledWith({code: 'abcd2345'});
    // Server said 6000 when the device clock read ~1000 (plus waitFor ticks).
    expect(result.current.offsetMs).toBeGreaterThan(4900);
    expect(result.current.offsetMs).toBeLessThanOrEqual(5000);
  });

  it('beats at once, then on the interval while the room is live', async () => {
    const {result} = await renderHook(() => useBattleRoom('abcd2345'));
    await waitFor(() => expect(result.current.hasJoined).toBe(true));
    expect(mockHeartbeat).toHaveBeenCalledTimes(1);
    await act(async () => {
      jest.advanceTimersByTime(BATTLE_HEARTBEAT_MS * 2);
    });
    expect(mockHeartbeat).toHaveBeenCalledTimes(3);
  });

  it('beats again when the app comes back to the foreground', async () => {
    let onChange: ((state: AppStateStatus) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, handler) => {
      onChange = handler;
      return {remove: jest.fn()};
    });
    const {result} = await renderHook(() => useBattleRoom('abcd2345'));
    await waitFor(() => expect(result.current.hasJoined).toBe(true));
    const before = mockHeartbeat.mock.calls.length;
    await act(() => onChange?.('background'));
    expect(mockHeartbeat).toHaveBeenCalledTimes(before);
    await act(() => onChange?.('active'));
    expect(mockHeartbeat).toHaveBeenCalledTimes(before + 1);
  });

  it('does not join while signed out', async () => {
    mockAuth = {isAuthenticated: false, isLoading: false};
    await renderHook(() => useBattleRoom('abcd2345'));
    expect(mockJoin).not.toHaveBeenCalled();
  });

  it('reports why the seat was refused', async () => {
    mockRoom = {status: 'waiting', myRole: null};
    mockJoin.mockResolvedValue({ok: false, reason: 'full'});
    const {result} = await renderHook(() => useBattleRoom('abcd2345'));
    await waitFor(() => expect(result.current.joinError).toBe('full'));
    await act(async () => {
      jest.advanceTimersByTime(BATTLE_HEARTBEAT_MS);
    });
    expect(mockHeartbeat).not.toHaveBeenCalled();
  });

  it('leave calls the server', async () => {
    const {result} = await renderHook(() => useBattleRoom('abcd2345'));
    await act(async () => {
      await result.current.leave();
    });
    expect(mockLeave).toHaveBeenCalledWith({code: 'abcd2345'});
  });
});
