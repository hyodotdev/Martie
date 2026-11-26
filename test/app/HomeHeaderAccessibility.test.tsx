import {fireEvent, render} from '@testing-library/react-native';
import type {ReactNode} from 'react';
import React from 'react';

const mockJoinLeague = jest.fn();
const mockNavigate = jest.fn();
const mockPush = jest.fn();
const mockSetDisplayNameModalVisible = jest.fn();
const mockSetSignInRequireModalVisible = jest.fn();
const mockStartStandardQuiz = jest.fn();
const mockToast = jest.fn();
const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();
const mockUpdateBulbCount = jest.fn();
let mockBulbCount = 3;
let mockBulbLoading = false;
const mockAlertDialogClose = jest.fn();
const mockAlertDialogOpen = jest.fn();

jest.mock('kstyled', () => {
  const React = jest.requireActual('react');
  const ReactNative = jest.requireActual('react-native');

  const createStyled = (Component: any) => {
    const createComponent = () => {
      function StyledComponent({children, ...props}: {children?: ReactNode}) {
        return React.createElement(Component, props, children);
      }

      return StyledComponent;
    };
    const template = () => createComponent();
    template.__withStyles = () => createComponent();
    return template;
  };

  const styled = new Proxy(createStyled, {
    get: (_target, componentName: string) =>
      createStyled(ReactNative[componentName]),
  });

  return {
    styled,
    css: jest.requireActual('kstyled').css,
  };
});

jest.mock('cpk-ui', () => {
  const React = jest.requireActual('react');
  const {Text, TouchableOpacity} = jest.requireActual('react-native');

  const TextComponent = ({children, ...props}: any) =>
    React.createElement(Text, props, children);

  return {
    Button: ({disabled, onPress, text}: any) =>
      React.createElement(
        TouchableOpacity,
        {
          accessibilityLabel: text,
          accessibilityRole: 'button',
          disabled,
          onPress,
        },
        React.createElement(Text, null, text),
      ),
    Icon: () => React.createElement(Text),
    Typography: {
      Body1: TextComponent,
      Body2: TextComponent,
      Body3: TextComponent,
      Body4: TextComponent,
      Heading3: TextComponent,
      Heading4: TextComponent,
      Heading5: TextComponent,
    },
    useCPK: () => ({
      alertDialog: {
        close: mockAlertDialogClose,
        open: mockAlertDialogOpen,
      },
      theme: {
        bg: {basic: '#ffffff', paper: '#f8fafc'},
        role: {
          border: '#dddddd',
          primary: '#2563eb',
          success: '#16a34a',
        },
        text: {
          basic: '#111111',
          disabled: '#777777',
          label: '#555555',
          placeholder: '#999999',
        },
      },
    }),
  };
});

jest.mock('expo-image', () => {
  const React = jest.requireActual('react');
  const {View} = jest.requireActual('react-native');

  return {
    Image: (props: any) => React.createElement(View, props),
  };
});

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: {
    Light: 'Light',
    Soft: 'Soft',
  },
}));

jest.mock('@backpackapp-io/react-native-toast', () => {
  const toast = (...args: unknown[]) => mockToast(...args);
  toast.error = (...args: unknown[]) => mockToastError(...args);
  toast.success = (...args: unknown[]) => mockToastSuccess(...args);

  return {toast};
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0}),
}));

jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn(),
    set: jest.fn(),
  })),
  useMMKVBoolean: () => [false, jest.fn()],
  useMMKVString: () => [undefined, jest.fn()],
}));

jest.mock('convex/react', () => ({
  useConvexAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
  }),
  useMutation: () => mockJoinLeague,
  useQuery: (query: string) => {
    if (query === 'user.queries.currentUser') {
      return {
        currentStreak: 2,
        displayName: 'Hyo',
        featherCount: 12,
        level: 0,
      };
    }

    if (query === 'rank.queries.getMyRank') {
      return {position: 3};
    }

    if (query === 'dailyChallenge.queries.getToday') {
      return null;
    }

    if (query === 'league.queries.getMyLeague') {
      return null;
    }

    return undefined;
  },
}));

jest.mock('../../convex/_generated/api', () => ({
  api: {
    battle: {
      queries: {
        getMyBattleStats: 'battle.queries.getMyBattleStats',
      },
    },
    dailyChallenge: {
      queries: {
        getToday: 'dailyChallenge.queries.getToday',
      },
    },
    league: {
      mutations: {
        joinLeague: 'league.mutations.joinLeague',
      },
      queries: {
        getMyLeague: 'league.queries.getMyLeague',
      },
    },
    rank: {
      queries: {
        getMyRank: 'rank.queries.getMyRank',
      },
    },
    user: {
      queries: {
        currentUser: 'user.queries.currentUser',
      },
    },
  },
}));

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => callback(),
  useRouter: () => ({
    navigate: mockNavigate,
    push: mockPush,
  }),
}));

jest.mock('../../src/STRINGS', () => ({
  getLocale: () => 'en',
  t: (key: string, params?: Record<string, number>) => {
    const strings: Record<string, string> = {
      'article.title': 'Knowledge Blog',
      'common.changeDisplayName': 'Change Display Name',
      'common.cleverIndex': 'Clever Index',
      'common.dailyCheckInReward': 'Daily reward',
      'common.haveEarnedBulb': 'You have earned 3 bulb(s)!',
      'common.maxBulbReached': 'You have reached the maximum number of bulbs!',
      'common.notEnoughBulb': 'Not enough bulbs',
      'common.rank': 'th',
      'discover.title': 'Discover',
      'feather.count': `${params?.count ?? 0} Feathers`,
      'home.bulbRechargeInfo':
        'The bulb recharges every midnight. You can also get it by watching an ad.',
      'home.chargeBulb': 'Charge the bulb',
      'home.creatorCtaBody': 'Share a quiz with Martie',
      'home.creatorCtaButton': 'Create',
      'home.creatorCtaTitle': 'Create a Quiz',
      'home.exit': 'Exit',
      'home.takeAQuiz': 'Take a Quiz',
      'home.watchAd': 'Watch Ad',
      'league.joinLeague': 'Join League',
      'league.loginRequired': 'Sign in required',
      'my.hallOfFame': 'Hall of Fame',
      'my.hallOfFameDescription': 'Who knows the most common sense?',
      'my.preparingHallOfFame': 'Preparing Hall of Fame',
      'my.userName': '{name}',
      'purchase.certifiedBadgeTitle': 'Certified Badge',
      'purchase.certifiedBadgeToast': 'Thanks for certifying',
      'purchase.bulbs': 'Bulbs',
    };

    return strings[key] ?? key;
  },
}));

jest.mock('../../src/hooks/useFirstQuizModalTrigger', () => ({
  useFirstQuizModalTrigger: jest.fn(),
}));

jest.mock('../../src/hooks/useQuizzes', () => ({
  useQuizzes: () => ({
    isLoading: false,
    quizzes: [{_id: 'quiz-id'}],
  }),
}));

jest.mock('../../src/hooks/useBulbManager', () => ({
  useBulbManager: () => ({
    bulbCount: mockBulbCount,
    isLoading: mockBulbLoading,
    updateBulbCount: mockUpdateBulbCount,
    claimDailyCheckIn: jest
      .fn()
      .mockResolvedValue({granted: 0, pending: false}),
  }),
}));

jest.mock('../../src/hooks/useStandardQuizStart', () => ({
  useStandardQuizStart: () => ({
    isStartingStandardQuiz: false,
    startStandardQuiz: mockStartStandardQuiz,
  }),
}));

jest.mock('../../src/stores/signInRequireModalStore', () => ({
  useSignInRequireModalStore: (selector: any) =>
    selector({setVisible: mockSetSignInRequireModalVisible}),
}));

jest.mock('../../src/stores/displayNameModalState', () => ({
  useDisplayNameModalStore: () => ({
    setVisible: mockSetDisplayNameModalVisible,
  }),
}));

jest.mock('../../src/stores/userStore', () => ({
  useUserStore: (selector?: any) => {
    const state = {
      hasCertifiedBadge: true,
      isPremium: false,
    };

    return selector ? selector(state) : state;
  },
}));

jest.mock('../../src/uis/Bubble/Bubble', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../src/uis/Bubble/BubbleWithTypeWriter', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../src/uis/DailyChallenge/DailyStreakBanner', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../src/uis/DailyChallenge/DailyChallengeCard', () => ({
  DailyChallengeCardSkeleton: () => null,
  __esModule: true,
  default: () => null,
}));

jest.mock('../../src/uis/League/LeagueProgressCard', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../src/utils/analytics', () => ({
  LOG_EVENTS: {
    DAILY_RETURN_CTA_PRESSED: 'daily_return_cta_pressed',
    DAILY_RETURN_CTA_SHOWN: 'daily_return_cta_shown',
    LOGIN_PROMPT_SHOWN: 'login_prompt_shown',
  },
  logEvent: jest.fn(),
}));

jest.mock('../../src/utils/error', () => ({
  logError: jest.fn(),
}));

jest.mock('../../src/utils/notifee', () => ({
  cancelStreakReminderNotification: jest.fn(),
  createStreakReminderNotification: jest.fn(),
}));

jest.mock('../../src/icons', () => ({
  IC_MARTIE_BASIC: 'martie-basic',
  IC_MARTIE_SLEEP: 'martie-sleep',
  IC_BULB: 'bulb',
  IC_WORDMARK: 'wordmark',
  IC_TROPHY: 'trophy',
}));

// eslint-disable-next-line import/first
import TabIndexMobile from '../../app/_Tabs/TabIndex/TabIndexMobile';
// eslint-disable-next-line import/first
import TabIndexTablet from '../../app/_Tabs/TabIndex/TabIndexTablet';
// eslint-disable-next-line import/first
import MyCustomHeader from '../../app/_Tabs/components/MyCustomHeader';
// eslint-disable-next-line import/first
import CustomHeader from '../../app/_Tabs/components/CustomHeader';
// eslint-disable-next-line import/first
import SectionHeader from '../../app/_Tabs/components/SectionHeader';
// eslint-disable-next-line import/first
import ArticleHeader from '../../app/_Tabs/components/ArticleHeader';
// eslint-disable-next-line import/first
import DiscoverHeader from '../../app/_Tabs/components/DiscoverHeader';

describe('home and header accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBulbCount = 3;
    mockBulbLoading = false;
  });

  it('does not overwrite purchased bulbs while the server balance loads', async () => {
    mockBulbCount = 0;
    mockBulbLoading = true;
    const header = await render(<CustomHeader />);
    expect(mockUpdateBulbCount).not.toHaveBeenCalled();
    mockBulbCount = 35;
    mockBulbLoading = false;
    await header.rerender(<CustomHeader />);
    expect(header.getByLabelText('Charge the bulb, 35 Bulbs')).toBeTruthy();
    expect(mockUpdateBulbCount).not.toHaveBeenCalled();
  });

  it('does not refill an existing zero balance from the header', async () => {
    mockBulbCount = 0;
    await render(<CustomHeader />);
    expect(mockUpdateBulbCount).not.toHaveBeenCalled();
  });

  it('announces the Clever Index level card as a button on mobile and tablet', async () => {
    const mobile = await render(<TabIndexMobile />);
    const mobileCard = mobile.getByLabelText('Clever Index, Lv.0');

    expect(mobileCard.props.accessibilityRole).toBe('button');
    expect(mobileCard.props.accessibilityState).toEqual({disabled: false});

    await fireEvent.press(mobileCard);
    expect(mockNavigate).toHaveBeenCalledWith('/quiz-level');

    await mobile.unmount();
    mockNavigate.mockClear();

    const tablet = await render(<TabIndexTablet />);
    const tabletCard = tablet.getByLabelText('Clever Index, Lv.0');

    expect(tabletCard.props.accessibilityRole).toBe('button');
    expect(tabletCard.props.accessibilityState).toEqual({disabled: false});

    await fireEvent.press(tabletCard);
    expect(mockNavigate).toHaveBeenCalledWith('/quiz-level');
  });

  it('announces My header badge and display-name edit controls', async () => {
    const {getByLabelText} = await render(<MyCustomHeader />);

    const badge = getByLabelText('Certified Badge');
    expect(badge.props.accessibilityRole).toBe('button');

    await fireEvent.press(badge);
    expect(mockToast).toHaveBeenCalledWith('Thanks for certifying');

    const edit = getByLabelText('Change Display Name');
    expect(edit.props.accessibilityRole).toBe('button');

    await fireEvent.press(edit);
    expect(mockSetDisplayNameModalVisible).toHaveBeenCalledWith(true);
  });

  it('announces the home bulb recharge button with current count', async () => {
    const {getByLabelText, getByTestId} = await render(<CustomHeader />);
    const bulbButton = getByLabelText('Charge the bulb, 3 Bulbs');
    const wordmark = getByTestId('header-wordmark', {
      includeHiddenElements: true,
    });
    const bulbIcon = getByTestId('header-bulb-icon', {
      includeHiddenElements: true,
    });

    expect(bulbButton.props.accessible).toBe(true);
    expect(bulbButton.props.accessibilityRole).toBe('button');
    expect(bulbButton.props.accessibilityState).toEqual({busy: false});
    expect(bulbButton.props.accessibilityHint).toBe(
      'The bulb recharges every midnight. You can also get it by watching an ad.',
    );
    expect(wordmark.props.importantForAccessibility).toBe(
      'no-hide-descendants',
    );
    expect(bulbIcon.props.importantForAccessibility).toBe(
      'no-hide-descendants',
    );

    await fireEvent.press(bulbButton);
    expect(mockAlertDialogOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'The bulb recharges every midnight. You can also get it by watching an ad.',
        title: 'Charge the bulb',
      }),
    );
  });

  it('announces the Hall of Fame section with rank and feather context', async () => {
    const {getByLabelText} = await render(<SectionHeader />);
    const hallOfFame = getByLabelText(
      'Hall of Fame, Who knows the most common sense?, Hyo, 3th, 12 Feathers',
    );

    expect(hallOfFame.props.accessible).toBe(true);
    expect(hallOfFame.props.accessibilityRole).toBe('button');

    await fireEvent.press(hallOfFame);
    expect(mockPush).toHaveBeenCalledWith('/hall-of-fame');
  });

  it('announces article and discover tab titles as headers', async () => {
    const articleHeader = await render(<ArticleHeader />);
    const articleTitle = articleHeader.getByText('Knowledge Blog');

    expect(articleTitle.props.accessibilityRole).toBe('header');

    const discoverHeader = await render(<DiscoverHeader />);
    const discoverTitle = discoverHeader.getByText('Discover');

    expect(discoverTitle.props.accessibilityRole).toBe('header');
  });
});
