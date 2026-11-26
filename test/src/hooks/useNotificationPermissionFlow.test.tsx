import React from 'react';
import {render, waitFor} from '@testing-library/react-native';
import notifee, {AuthorizationStatus} from '@notifee/react-native';
import {storage, Storage} from '../../../src/utils/storage';
import {ensureFirstLaunchTimestamp} from '../../../src/utils/acquisition';
import {requestNotificationPermission} from '../../../src/utils/notifee';
import {
  requestFirstDailyNotificationPermission,
  useNotificationPermissionFlow,
} from '../../../src/hooks/useNotificationPermissionFlow';

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    getNotificationSettings: jest.fn(),
  },
  AuthorizationStatus: {
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  },
}));

jest.mock('../../../src/utils/notifee', () => ({
  requestNotificationPermission: jest.fn(),
}));

jest.mock('../../../src/utils/acquisition', () => ({
  ensureFirstLaunchTimestamp: jest.fn(() => 1700000000000),
}));

jest.mock('../../../src/utils/error', () => ({
  logError: jest.fn(),
}));

jest.mock('../../../src/utils/storage', () => ({
  storage: {
    getBoolean: jest.fn(),
    getNumber: jest.fn(),
    set: jest.fn(),
  },
  Storage: {
    DidFinishFirstDaily: 'DidFinishFirstDaily',
    FirstLaunchAt: 'FirstLaunchAt',
    NotiPermissionAskedAt: 'NotiPermissionAskedAt',
    NotiPermissionAskCount: 'NotiPermissionAskCount',
    NotiPermissionGranted: 'NotiPermissionGranted',
  },
}));

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function HookHarness(): null {
  useNotificationPermissionFlow();
  return null;
}

function setStorageRead(values: Record<string, unknown>) {
  (storage.getNumber as jest.Mock).mockImplementation((key: string) => {
    const value = values[key];
    return typeof value === 'number' ? value : undefined;
  });
  (storage.getBoolean as jest.Mock).mockImplementation((key: string) => {
    const value = values[key];
    return typeof value === 'boolean' ? value : undefined;
  });
}

describe('useNotificationPermissionFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setStorageRead({});
    (notifee.getNotificationSettings as jest.Mock).mockResolvedValue({
      authorizationStatus: AuthorizationStatus.DENIED,
    });
    (requestNotificationPermission as jest.Mock).mockResolvedValue(false);
  });

  it('does not ask for notification permission on cold launch before first daily completion', async () => {
    setStorageRead({
      [Storage.NotiPermissionAskCount]: 0,
      [Storage.DidFinishFirstDaily]: false,
    });

    await render(<HookHarness />);

    await waitFor(() => {
      expect(storage.getBoolean).toHaveBeenCalledWith(
        Storage.DidFinishFirstDaily,
      );
    });
    expect(ensureFirstLaunchTimestamp).toHaveBeenCalled();
    expect(requestNotificationPermission).not.toHaveBeenCalled();
  });

  it('asks once after the first daily completion', async () => {
    (requestNotificationPermission as jest.Mock).mockResolvedValue(true);
    setStorageRead({
      [Storage.NotiPermissionAskCount]: 0,
    });

    await expect(requestFirstDailyNotificationPermission()).resolves.toBe(true);

    expect(storage.set).toHaveBeenCalledWith(
      Storage.NotiPermissionAskCount,
      1,
    );
    expect(requestNotificationPermission).toHaveBeenCalledWith(
      undefined,
      'onboarding',
    );
    expect(storage.set).toHaveBeenCalledWith(
      Storage.NotiPermissionGranted,
      true,
    );
  });

  it('does not re-ask the first daily prompt if it already asked once', async () => {
    setStorageRead({
      [Storage.NotiPermissionAskCount]: 1,
    });

    await expect(requestFirstDailyNotificationPermission()).resolves.toBe(false);

    expect(requestNotificationPermission).not.toHaveBeenCalled();
  });

  it('runs the D2 retry only after a full day has elapsed', async () => {
    const now = 1700000000000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    setStorageRead({
      [Storage.NotiPermissionAskCount]: 1,
      [Storage.NotiPermissionAskedAt]: now - ONE_DAY_MS - 1,
    });

    await render(<HookHarness />);

    await waitFor(() => {
      expect(requestNotificationPermission).toHaveBeenCalledWith(
        undefined,
        'd2_retry',
      );
    });
    expect(storage.set).toHaveBeenCalledWith(
      Storage.NotiPermissionAskCount,
      2,
    );
  });

  it('does not run the D2 retry before the delay has elapsed', async () => {
    const now = 1700000000000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    setStorageRead({
      [Storage.NotiPermissionAskCount]: 1,
      [Storage.NotiPermissionAskedAt]: now - ONE_DAY_MS + 1000,
    });

    await render(<HookHarness />);

    await waitFor(() => {
      expect(storage.getNumber).toHaveBeenCalledWith(
        Storage.NotiPermissionAskedAt,
      );
    });
    expect(requestNotificationPermission).not.toHaveBeenCalled();
  });
});
