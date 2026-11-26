import {fireEvent, render} from '@testing-library/react-native';
import type {ReactNode} from 'react';
import React from 'react';

const mockNavigate = jest.fn();
const mockUsePaginatedQuery = jest.fn();
const mockUseQuery = jest.fn();

const article = {
  _id: 'article-id-1',
  categoryName: 'BASIC_SCIENCE',
  key: 'article-1',
  publishedAt: '2026-06-21',
  storageThumbnailUrl: null,
  thumbnailUrl: 'https://example.com/article.png',
};

const langData = [
  {key: 'article-1_title', value: 'How stars form'},
  {key: 'article-1_summary', value: 'A quick guide'},
];

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

jest.mock('@shopify/flash-list', () => {
  const React = jest.requireActual('react');
  const {View} = jest.requireActual('react-native');

  return {
    FlashList: ({
      data,
      ListEmptyComponent,
      ListFooterComponent,
      ListHeaderComponent,
      renderItem,
    }: any) =>
      React.createElement(
        View,
        null,
        ListHeaderComponent ? React.createElement(ListHeaderComponent) : null,
        data.length > 0
          ? data.map((item: {key: string}, index: number) =>
              React.createElement(
                React.Fragment,
                {key: item.key},
                renderItem({item, index}),
              ),
            )
          : ListEmptyComponent
            ? React.createElement(ListEmptyComponent)
            : null,
        ListFooterComponent ? React.createElement(ListFooterComponent) : null,
      ),
  };
});

jest.mock('cpk-ui', () => {
  const React = jest.requireActual('react');
  const {Text, TouchableOpacity} = jest.requireActual('react-native');

  const TextComponent = ({children, ...props}: any) =>
    React.createElement(Text, props, children);

  return {
    Button: ({onPress, text, touchableHighlightProps}: any) =>
      React.createElement(
        TouchableOpacity,
        {
          accessibilityLabel: text,
          onPress,
          ...touchableHighlightProps,
        },
        React.createElement(Text, null, text),
      ),
    Typography: {
      Body2: TextComponent,
      Body3: TextComponent,
      Body4: TextComponent,
      Heading5: TextComponent,
    },
    useCPK: () => ({
      theme: {
        bg: {basic: '#ffffff', paper: '#f8fafc'},
        role: {primary: '#2563eb'},
        text: {
          basic: '#111111',
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

jest.mock('expo-router', () => ({
  useRouter: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('convex/react', () => ({
  usePaginatedQuery: (...args: unknown[]) => mockUsePaginatedQuery(...args),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('../../convex/_generated/api', () => ({
  api: {
    article: {
      queries: {
        list: 'article.queries.list',
        listPaginated: 'article.queries.listPaginated',
      },
    },
    articleLanguage: {
      queries: {
        getByKeysAndLanguage: 'articleLanguage.queries.getByKeysAndLanguage',
      },
    },
    quizResult: {
      query: {
        getResultsStatsByCategory:
          'quizResult.query.getResultsStatsByCategory',
      },
    },
    reviewQueue: {
      queries: {
        getPendingCount: 'reviewQueue.queries.getPendingCount',
      },
    },
  },
}));

jest.mock('../../src/STRINGS', () => ({
  t: (key: string, mapObj?: {page?: string}) => {
    const strings: Record<string, string> = {
      'article.empty': 'No articles yet',
      'article.title': 'Knowledge Blog',
      'common.all': 'All',
      'common.loading': 'Loading Martie',
      'common.loadingPage': 'Loading {{page}}',
      'discover.myRadar': 'My Knowledge Radar',
      'discover.noStats': 'Solve quizzes to see stats',
      'discover.recommendedReads': 'Recommended Reads',
      'discover.recommendedReadsSeeMore': 'See more recommended reads',
      'discover.reviewEmpty': 'No mistakes to review',
      'discover.seeMore': 'See more',
      'discover.title': 'Discover',
    };

    return (strings[key] ?? key).replace('{{page}}', mapObj?.page ?? '');
  },
}));

jest.mock('../../src/hooks/useLocale', () => ({
  useLocale: () => ({locale: 'en'}),
}));

jest.mock('../../src/utils/categoriesMap', () => ({
  categoriesMap: [
    {localizedString: 'Science', name: 'BASIC_SCIENCE'},
    {localizedString: 'History', name: 'WORLD_HISTORY'},
  ],
}));

// eslint-disable-next-line import/first
import TabDiscoverMobile from '../../app/_Tabs/TabArticle/TabDiscoverMobile';
// eslint-disable-next-line import/first
import TabArticleMobile from '../../app/_Tabs/TabArticle/TabArticleMobile';

describe('Discover article accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePaginatedQuery.mockReturnValue({
      isLoading: false,
      loadMore: jest.fn(),
      results: [article],
      status: 'CanLoadMore',
    });
    mockUseQuery.mockImplementation((query) => {
      if (query === 'quizResult.query.getResultsStatsByCategory') {
        return [];
      }
      if (query === 'reviewQueue.queries.getPendingCount') {
        return 0;
      }
      if (query === 'article.queries.list') {
        return [article];
      }
      if (query === 'articleLanguage.queries.getByKeysAndLanguage') {
        return langData;
      }

      return undefined;
    });
  });

  it('announces recommended preview entries and the see more action', async () => {
    const {getByLabelText} = await render(<TabDiscoverMobile />);

    const seeMore = getByLabelText('See more recommended reads');
    expect(seeMore.props.accessibilityRole).toBe('button');

    await fireEvent.press(seeMore);
    expect(mockNavigate).toHaveBeenCalledWith('/article-list');

    const articleCard = getByLabelText(
      'How stars form, Science, A quick guide',
    );
    expect(articleCard.props.accessibilityRole).toBe('button');

    await fireEvent.press(articleCard);
    expect(mockNavigate).toHaveBeenCalledWith({
      params: {key: 'article-1'},
      pathname: '/article-detail',
    });
  });

  it('announces the discover skeleton as one busy progress indicator', async () => {
    mockUseQuery.mockReturnValue(undefined);

    const {getByLabelText} = await render(<TabDiscoverMobile />);

    const skeleton = getByLabelText('Loading Discover');

    expect(skeleton.props).toMatchObject({
      accessibilityLiveRegion: 'polite',
      accessibilityRole: 'progressbar',
      accessibilityState: {busy: true},
    });
  });

  it('announces article list filters, selection state, and article cards', async () => {
    const {getByLabelText} = await render(<TabArticleMobile />);

    const allFilter = getByLabelText('All');
    expect(allFilter.props.accessibilityRole).toBe('button');
    expect(allFilter.props.accessibilityState).toEqual({selected: true});

    const scienceFilter = getByLabelText('Science');
    expect(scienceFilter.props.accessibilityRole).toBe('button');
    expect(scienceFilter.props.accessibilityState).toEqual({selected: false});

    await fireEvent.press(scienceFilter);
    expect(getByLabelText('Science').props.accessibilityState).toEqual({
      selected: true,
    });

    const articleCard = getByLabelText(
      'How stars form, Science, A quick guide, 2026-06-21',
    );
    expect(articleCard.props.accessibilityRole).toBe('button');

    await fireEvent.press(articleCard);
    expect(mockNavigate).toHaveBeenCalledWith({
      params: {key: 'article-1'},
      pathname: '/article-detail',
    });
  });

  it('announces an empty article list as static text', async () => {
    mockUsePaginatedQuery.mockReturnValue({
      isLoading: false,
      loadMore: jest.fn(),
      results: [],
      status: 'Exhausted',
    });

    const {getByText} = await render(<TabArticleMobile />);

    expect(getByText('No articles yet')).toBeTruthy();
  });

  it('announces the article list skeleton as one busy progress indicator', async () => {
    mockUsePaginatedQuery.mockReturnValue({
      isLoading: true,
      loadMore: jest.fn(),
      results: [],
      status: 'LoadingFirstPage',
    });

    const {getByLabelText} = await render(<TabArticleMobile />);

    const skeleton = getByLabelText('Loading Knowledge Blog');

    expect(skeleton.props).toMatchObject({
      accessibilityLiveRegion: 'polite',
      accessibilityRole: 'progressbar',
      accessibilityState: {busy: true},
    });
  });
});
