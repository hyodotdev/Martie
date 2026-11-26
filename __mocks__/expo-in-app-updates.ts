// Google Play's in-app update module has no native side under Jest.
export const AppUpdateType = {FLEXIBLE: 0, IMMEDIATE: 1} as const;
export const checkForUpdate = jest.fn(async () => ({updateAvailable: false}));
export const startUpdate = jest.fn(async () => false);
export const checkAndStartUpdate = jest.fn(async () => false);
export const addUpdateListener = jest.fn(() => () => undefined);
