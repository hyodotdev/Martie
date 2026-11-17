import * as Patch from '@codemagic/react-native-patch';

import {checkOtaUpdate} from '../../../src/hooks/useOtaUpdate';

jest.mock('@codemagic/react-native-patch', () => ({
  InstallMode: {ON_NEXT_RESTART: 'ON_NEXT_RESTART'},
  checkForUpdate: jest.fn(),
  downloadUpdate: jest.fn(),
  installUpdate: jest.fn(),
  restartApp: jest.fn(),
  notifyAppReady: jest.fn(),
}));
jest.mock('../../../src/utils/analytics', () => ({logEvent: jest.fn()}));
jest.mock('../../../src/utils/error', () => ({logError: jest.fn()}));

const patch = jest.mocked(Patch);
const remotePackage = {label: 'v2'};

describe('checkOtaUpdate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    patch.notifyAppReady.mockResolvedValue(undefined as never);
    patch.restartApp.mockResolvedValue(undefined as never);
    patch.installUpdate.mockResolvedValue(undefined as never);
  });
  afterEach(() => jest.useRealTimers());

  it('skips development builds', async () => {
    await expect(checkOtaUpdate()).resolves.toBe('disabled');
    expect(patch.checkForUpdate).not.toHaveBeenCalled();
  });

  it('reports the running bundle healthy when up to date', async () => {
    patch.checkForUpdate.mockResolvedValue({action: 'up-to-date'} as never);
    await expect(checkOtaUpdate(4000, true)).resolves.toBe('up_to_date');
    expect(patch.notifyAppReady).toHaveBeenCalledTimes(1);
    expect(patch.restartApp).not.toHaveBeenCalled();
  });

  it('downloads, installs and restarts into an update', async () => {
    patch.checkForUpdate.mockResolvedValue({
      action: 'ota-update',
      remotePackage,
    } as never);
    patch.downloadUpdate.mockResolvedValue({label: 'local'} as never);
    await expect(checkOtaUpdate(4000, true)).resolves.toBe('applied');
    expect(patch.downloadUpdate).toHaveBeenCalledWith(remotePackage);
    expect(patch.installUpdate).toHaveBeenCalledWith(
      {label: 'local'},
      {installMode: 'ON_NEXT_RESTART'},
    );
    expect(patch.restartApp).toHaveBeenCalledTimes(1);
    expect(patch.notifyAppReady).not.toHaveBeenCalled();
  });

  it('reverts to the store bundle when updates are withdrawn', async () => {
    const revert = {action: 'embedded-revert'};
    patch.checkForUpdate.mockResolvedValue(revert as never);
    await expect(checkOtaUpdate(4000, true)).resolves.toBe('applied');
    expect(patch.downloadUpdate).not.toHaveBeenCalled();
    expect(patch.installUpdate).toHaveBeenCalledWith(revert, {
      installMode: 'ON_NEXT_RESTART',
    });
  });

  it('keeps the current bundle when the check fails', async () => {
    patch.checkForUpdate.mockRejectedValue(new Error('offline'));
    await expect(checkOtaUpdate(4000, true)).resolves.toBe('failed');
    expect(patch.notifyAppReady).toHaveBeenCalledTimes(1);
  });

  it('installs a late download for the next launch without restarting', async () => {
    jest.useFakeTimers();
    let finishDownload: (value: unknown) => void = () => {};
    patch.checkForUpdate.mockResolvedValue({
      action: 'ota-update',
      remotePackage,
    } as never);
    patch.downloadUpdate.mockReturnValue(
      new Promise((resolve) => {
        finishDownload = resolve;
      }) as never,
    );
    const outcome = checkOtaUpdate(4000, true);
    await jest.advanceTimersByTimeAsync(4000);
    await expect(outcome).resolves.toBe('timeout');
    finishDownload({label: 'local'});
    await jest.runAllTimersAsync();
    expect(patch.installUpdate).toHaveBeenCalledTimes(1);
    expect(patch.restartApp).not.toHaveBeenCalled();
  });

  it('gives up on a slow network', async () => {
    jest.useFakeTimers();
    patch.checkForUpdate.mockReturnValue(new Promise(() => {}) as never);
    const outcome = checkOtaUpdate(4000, true);
    jest.advanceTimersByTime(4000);
    await expect(outcome).resolves.toBe('timeout');
    expect(patch.notifyAppReady).toHaveBeenCalledTimes(1);
  });
});
