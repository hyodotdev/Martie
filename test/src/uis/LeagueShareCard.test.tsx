import {render, fireEvent, waitFor} from '@testing-library/react-native';
import {Share} from 'react-native';
import {ThemeProvider} from 'kstyled';
import {light} from '../../../src/theme';
import LeagueShareCard from '../../../src/uis/ShareCard/LeagueShareCard';
import {captureRef} from 'react-native-view-shot';
import {shareAsync} from 'expo-sharing';

// Mock dependencies
jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(() => Promise.resolve('/tmp/mock-capture.png')),
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../src/STRINGS', () => ({
  t: jest.fn((key: string, params?: Record<string, number | string>) => {
    const strings: Record<string, string> = {
      'league.title': 'League',
      'league.bronze': 'Bronze',
      'league.silver': 'Silver',
      'league.gold': 'Gold',
      'league.diamond': 'Diamond',
      'league.master': 'Master',
      'league.rank': '{{rank}}th / {{total}}',
      'league.rankAccessibility': 'Rank {{rank}} of {{total}}',
      'league.weeklyXp': '+{{xp}} XP',
      'shareCard.shareText': 'Share Text',
      'shareCard.shareImage': 'Share Image',
    };
    const template = strings[key] ?? key;
    return template.replace(/{{(\w+)}}/g, (_, token: string) =>
      String(params?.[token] ?? ''),
    );
  }),
}));

jest.mock('cpk-ui', () => ({
  useCPK: () => ({
    theme: {
      role: {border: '#ccc', success: '#22C55E', danger: '#EF4444'},
      text: {basic: '#000'},
      bg: {paper: '#fff'},
    },
  }),
  Typography: {
    Heading2: ({children, ...props}: any) => {
      const React = jest.requireActual('react');
      const {Text} = jest.requireActual('react-native');
      return React.createElement(Text, props, children);
    },
    Heading3: ({children, ...props}: any) => {
      const React = jest.requireActual('react');
      const {Text} = jest.requireActual('react-native');
      return React.createElement(Text, props, children);
    },
    Body2: ({children, ...props}: any) => {
      const React = jest.requireActual('react');
      const {Text} = jest.requireActual('react-native');
      return React.createElement(Text, props, children);
    },
    Body3: ({children, ...props}: any) => {
      const React = jest.requireActual('react');
      const {Text} = jest.requireActual('react-native');
      return React.createElement(Text, props, children);
    },
  },
}));

jest.mock('../../../src/uis/ButtonMartie', () => {
  return {
    __esModule: true,
    default: ({accessibilityLabel, accessibilityRole, text, onPress}: any) => {
      const React = jest.requireActual('react');
      const {TouchableOpacity, Text} = jest.requireActual('react-native');
      return React.createElement(
        TouchableOpacity,
        {
          accessibilityLabel: accessibilityLabel ?? text,
          accessibilityRole: accessibilityRole ?? 'button',
          onPress,
        },
        React.createElement(Text, null, text),
      );
    },
  };
});

// SocialShareRow uses cpk-ui Icon + analytics — out of scope for this card test.
jest.mock('../../../src/uis/ShareCard/SocialShareRow', () => {
  return {
    __esModule: true,
    default: () => null,
  };
});

const renderWithTheme = async (props: any) =>
  await render(
    <ThemeProvider theme={light as any}>
      <LeagueShareCard {...props} />
    </ThemeProvider>,
  );

describe('LeagueShareCard', () => {
  const defaultProps = {
    tier: 'diamond',
    rank: 3,
    totalMembers: 30,
    weeklyXp: 250,
    displayName: 'TestUser',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('카드가 정상 렌더링된다', async () => {
    const {toJSON} = await renderWithTheme(defaultProps);
    expect(toJSON()).toBeTruthy();
  });

  it('티어 이모지를 올바르게 표시한다', async () => {
    const {getByText} = await renderWithTheme(defaultProps);
    expect(getByText('💎', {includeHiddenElements: true})).toBeTruthy();
  });

  it('순위를 올바르게 표시한다', async () => {
    const {getByText} = await renderWithTheme(defaultProps);
    expect(getByText('#3', {includeHiddenElements: true})).toBeTruthy();
    expect(getByText('/ 30', {includeHiddenElements: true})).toBeTruthy();
  });

  it('주간 XP를 올바르게 표시한다', async () => {
    const {getByText} = await renderWithTheme(defaultProps);
    expect(getByText('250 XP', {includeHiddenElements: true})).toBeTruthy();
  });

  it('유저 이름을 올바르게 표시한다', async () => {
    const {getByText} = await renderWithTheme(defaultProps);
    expect(getByText('@TestUser', {includeHiddenElements: true})).toBeTruthy();
  });

  it('리그 공유 카드를 하나의 접근성 요약으로 읽는다', async () => {
    const {getByLabelText} = await renderWithTheme(defaultProps);

    const summary = getByLabelText(
      'Diamond League, Rank 3 of 30, +250 XP, @TestUser',
    );

    expect(summary.props.accessible).toBe(true);
    expect(summary.props.accessibilityRole).toBe('image');
  });

  it('공유 버튼에 리그 카드 맥락을 함께 제공한다', async () => {
    const {getByLabelText} = await renderWithTheme(defaultProps);

    const textShareButton = getByLabelText('Share Text, Diamond League');
    const imageShareButton = getByLabelText('Share Image, Diamond League');

    expect(textShareButton.props.accessibilityRole).toBe('button');
    expect(imageShareButton.props.accessibilityRole).toBe('button');
  });

  it('Share Text 버튼을 누르면 네이티브 공유 시트가 열린다', async () => {
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({action: 'sharedAction'} as any);

    const {getByLabelText} = await renderWithTheme(defaultProps);
    await fireEvent.press(getByLabelText('Share Text, Diamond League'));

    await waitFor(() => {
      expect(shareSpy).toHaveBeenCalledTimes(1);
      const shareMessage = shareSpy.mock.calls[0][0].message as string;
      expect(shareMessage).toContain('💎');
      expect(shareMessage).toContain('#3 / 30');
      expect(shareMessage).toContain('+250 XP');
      expect(shareMessage).toContain('@TestUser');
      expect(shareMessage).toContain('https://hyo.dev/martie');
    });

    shareSpy.mockRestore();
  });

  it('Share Image 버튼을 누르면 이미지를 캡처해서 공유한다', async () => {
    const {getByLabelText} = await renderWithTheme(defaultProps);
    await fireEvent.press(getByLabelText('Share Image, Diamond League'));

    await waitFor(() => {
      expect(captureRef).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({format: 'png', quality: 0.9}),
      );
      expect(shareAsync).toHaveBeenCalledWith('/tmp/mock-capture.png', {
        mimeType: 'image/png',
      });
    });
  });

  it('bronze 티어도 올바르게 렌더링된다', async () => {
    const {getByText} = await renderWithTheme({...defaultProps, tier: 'bronze'});
    expect(getByText('🥉', {includeHiddenElements: true})).toBeTruthy();
  });

  it('master 티어도 올바르게 렌더링된다', async () => {
    const {getByText} = await renderWithTheme({...defaultProps, tier: 'master'});
    expect(getByText('👑', {includeHiddenElements: true})).toBeTruthy();
  });

  it('알 수 없는 티어면 기본 이모지를 사용한다', async () => {
    const {getByText} = await renderWithTheme({...defaultProps, tier: 'unknown'});
    expect(getByText('🏆', {includeHiddenElements: true})).toBeTruthy();
  });

  it('커스텀 appUrl이 공유 텍스트에 반영된다', async () => {
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({action: 'sharedAction'} as any);

    const {getByLabelText} = await renderWithTheme({
      ...defaultProps,
      appUrl: 'https://custom.url',
    });
    await fireEvent.press(getByLabelText('Share Text, Diamond League'));

    await waitFor(() => {
      const shareMessage = shareSpy.mock.calls[0][0].message as string;
      expect(shareMessage).toContain('https://custom.url');
      expect(shareMessage).not.toContain('https://hyo.dev/martie');
    });

    shareSpy.mockRestore();
  });
});
