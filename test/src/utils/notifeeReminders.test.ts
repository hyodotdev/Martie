import notifee from '@notifee/react-native';
import {logError} from '../../../src/utils/error';
import {
  createNextDailyReadyNotification,
  createStreakReminderNotification,
} from '../../../src/utils/notifee';

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    getNotificationSettings: jest.fn(),
    cancelTriggerNotification: jest.fn(),
    createTriggerNotification: jest.fn(),
  },
  AuthorizationStatus: {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  },
  TriggerType: {TIMESTAMP: 0},
}));

jest.mock('../../../src/utils/error', () => ({logError: jest.fn()}));
jest.mock('../../../src/utils/analytics', () => ({
  logEvent: jest.fn(),
  LOG_EVENTS: {NEXT_DAILY_NOTIFICATION_SCHEDULED: 'scheduled'},
}));

const settings = notifee.getNotificationSettings as jest.Mock;
const schedule = notifee.createTriggerNotification as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('reminder notifications', () => {
  it('schedules nothing, and logs no error, before notifications are allowed', async () => {
    for (const authorizationStatus of [-1, 0]) {
      settings.mockResolvedValue({authorizationStatus});
      await createStreakReminderNotification();
      await createNextDailyReadyNotification();
    }
    expect(schedule).not.toHaveBeenCalled();
    expect(logError).not.toHaveBeenCalled();
  });

  it('schedules every reminder once notifications are allowed', async () => {
    settings.mockResolvedValue({authorizationStatus: 1});
    await createStreakReminderNotification();
    expect(schedule).toHaveBeenCalledTimes(3);

    settings.mockResolvedValue({authorizationStatus: 2});
    await createNextDailyReadyNotification();
    expect(schedule).toHaveBeenCalledTimes(4);
  });
});
