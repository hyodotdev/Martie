import {render} from '@testing-library/react-native';
import type {ReactNode} from 'react';
import React from 'react';

import MyQuizzesPage from '../../app/my-quizzes';

const mockUsePaginatedQuery = jest.fn();
const mockUseQuery = jest.fn();

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
    css: jest.requireActual('kstyled').css,
    styled,
  };
});

jest.mock('@shopify/flash-list', () => {
  const React = jest.requireActual('react');
  const {View} = jest.requireActual('react-native');

  const renderComponent = (component: any) => {
    if (!component) return null;
    if (React.isValidElement(component)) return component;
    return React.createElement(component);
  };

  return {
    FlashList: ({
      data = [],
      ListEmptyComponent,
      ListFooterComponent,
      ListHeaderComponent,
      renderItem,
    }: any) =>
      React.createElement(
        View,
        null,
        renderComponent(ListHeaderComponent),
        data.length > 0
          ? data.map((item: {_id: string}, index: number) =>
              React.createElement(
                React.Fragment,
                {key: item._id},
                renderItem({item, index}),
              ),
            )
          : renderComponent(ListEmptyComponent),
        renderComponent(ListFooterComponent),
      ),
  };
});

jest.mock('cpk-ui', () => {
  const React = jest.requireActual('react');
  const {Text} = jest.requireActual('react-native');

  const TextComponent = ({children, ...props}: any) =>
    React.createElement(Text, props, children);

  return {
    Typography: {
      Body2: TextComponent,
      Body3: TextComponent,
      Heading2: TextComponent,
    },
    useCPK: () => ({
      theme: {
        bg: {
          basic: '#ffffff',
          paper: '#f8fafc',
        },
        role: {
          primary: '#2563eb',
        },
        text: {
          basic: '#111111',
          placeholder: '#777777',
        },
      },
    }),
  };
});

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
}));

jest.mock('convex/react', () => ({
  PaginatedQueryReference: jest.fn(),
  usePaginatedQuery: (...args: unknown[]) => mockUsePaginatedQuery(...args),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('../../convex/_generated/api', () => ({
  api: {
    quizSubmission: {
      queries: {
        getMySubmissionsPaginated:
          'quizSubmission.queries.getMySubmissionsPaginated',
      },
    },
    user: {
      queries: {
        currentUser: 'user.queries.currentUser',
      },
    },
  },
}));

jest.mock('../../src/STRINGS', () => ({
  t: (key: string, params?: Record<string, number>) => {
    const strings: Record<string, string> = {
      'common.back': 'Back',
      'common.loading': 'Loading Martie',
      'myQuizzes.approved': 'Approved',
      'myQuizzes.feathersEarned': `${params?.count ?? 0} Feathers`,
      'myQuizzes.noQuizzes': 'No quizzes created yet.',
      'myQuizzes.pending': 'Under Review',
      'myQuizzes.rejected': 'Rejected',
      'myQuizzes.solveCount': `Solved by ${params?.count ?? 0}`,
      'myQuizzes.title': 'My Created Quizzes',
      'myQuizzes.totalFeathers': 'Total Feathers Earned',
    };

    return strings[key] ?? key;
  },
}));

jest.mock('../../src/hoc/withErrorBoundary', () => ({
  withErrorBoundary: (Component: any) => Component,
}));

jest.mock('../../src/uis/CustomLoadingIndicator', () => {
  const React = jest.requireActual('react');
  const {View} = jest.requireActual('react-native');

  return function CustomLoadingIndicator() {
    return React.createElement(View, {testID: 'loading-indicator'});
  };
});

jest.mock('../../src/utils/analytics', () => ({
  logScreenView: jest.fn(),
}));

const approvedSubmission = {
  _id: 'submission-approved',
  createdAt: '2026-07-10T09:00:00Z',
  feathersEarned: 7,
  question: 'What is Mars?',
  quizId: 'quiz-1',
  rejectionReason: undefined,
  solveCount: 12,
  status: 'approved',
};

const rejectedSubmission = {
  _id: 'submission-rejected',
  createdAt: '2026-07-09T09:00:00Z',
  feathersEarned: 0,
  question: 'Which answer is outdated?',
  quizId: undefined,
  rejectionReason: 'Needs a current source.',
  solveCount: 0,
  status: 'rejected',
};

describe('MyQuizzesPage accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({featherCount: 42});
    mockUsePaginatedQuery.mockReturnValue({
      isLoading: false,
      loadMore: jest.fn(),
      results: [approvedSubmission, rejectedSubmission],
      status: 'Exhausted',
    });
  });

  it('announces the total and submitted quiz rows as readable summaries', async () => {
    const {getByLabelText} = await render(<MyQuizzesPage />);

    const header = getByLabelText('Total Feathers Earned, 42');
    expect(header.props.accessibilityRole).toBe('text');

    const approvedRow = getByLabelText(
      'Approved, 2026-07-10, What is Mars?, Solved by 12, 7 Feathers',
    );
    expect(approvedRow.props.accessibilityRole).toBe('text');

    const rejectedRow = getByLabelText(
      'Rejected, 2026-07-09, Which answer is outdated?, Needs a current source.',
    );
    expect(rejectedRow.props.accessibilityRole).toBe('text');
  });

  it('announces the empty state as static text', async () => {
    mockUsePaginatedQuery.mockReturnValue({
      isLoading: false,
      loadMore: jest.fn(),
      results: [],
      status: 'Exhausted',
    });

    const {getByLabelText} = await render(<MyQuizzesPage />);

    const emptyState = getByLabelText('No quizzes created yet.');
    expect(emptyState.props.accessibilityRole).toBe('text');
  });

  it('announces load-more pagination as a busy progress indicator', async () => {
    mockUsePaginatedQuery.mockReturnValue({
      isLoading: true,
      loadMore: jest.fn(),
      results: [approvedSubmission],
      status: 'LoadingMore',
    });

    const {getByLabelText} = await render(<MyQuizzesPage />);

    const footerLoader = getByLabelText('Loading Martie');
    expect(footerLoader.props).toMatchObject({
      accessibilityLiveRegion: 'polite',
      accessibilityRole: 'progressbar',
      accessibilityState: {busy: true},
    });
  });

  it('omits malformed submission dates from accessibility summaries', async () => {
    mockUsePaginatedQuery.mockReturnValue({
      isLoading: false,
      loadMore: jest.fn(),
      results: [
        {
          ...approvedSubmission,
          _id: 'submission-without-date',
          createdAt: undefined,
          question: 'Which fact needs review?',
          status: 'pending',
        },
      ],
      status: 'Exhausted',
    });

    const {getByLabelText} = await render(<MyQuizzesPage />);

    expect(
      getByLabelText('Under Review, Which fact needs review?').props
        .accessibilityRole,
    ).toBe('text');
  });
});
