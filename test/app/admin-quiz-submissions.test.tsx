import {fireEvent, render} from '@testing-library/react-native';
import type {ReactNode} from 'react';
import React from 'react';

import AdminQuizSubmissionsPage from '../../app/admin-quiz-submissions';
import AdminQuizSubmissionDetailPage from '../../app/admin-quiz-submissions/[submissionId]';

const mockNavigate = jest.fn();
const mockUseLocalSearchParams = jest.fn();
const mockApproveSubmission = jest.fn();
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
      Body1: TextComponent,
      Body2: TextComponent,
      Body3: TextComponent,
      Body4: TextComponent,
      Heading4: TextComponent,
    },
    Button: ({
      accessibilityLabel,
      accessibilityRole = 'button',
      accessibilityState,
      disabled,
      onPress,
      text,
      touchableHighlightProps,
    }: any) =>
      React.createElement(
        Text,
        {
          ...touchableHighlightProps,
          accessibilityLabel: accessibilityLabel ?? text,
          accessibilityRole:
            touchableHighlightProps?.accessibilityRole ?? accessibilityRole,
          accessibilityState:
            touchableHighlightProps?.accessibilityState ?? accessibilityState,
          disabled,
          onPress,
        },
        text,
      ),
    useCPK: () => ({
      theme: {
        bg: {
          basic: '#ffffff',
          paper: '#f8fafc',
        },
        role: {
          border: '#d4d4d8',
          primary: '#2563eb',
        },
        text: {
          basic: '#111111',
          contrast: '#ffffff',
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
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  useRouter: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('convex/react', () => ({
  PaginatedQueryReference: jest.fn(),
  usePaginatedQuery: (...args: unknown[]) => mockUsePaginatedQuery(...args),
  useMutation: () => mockApproveSubmission,
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('../../convex/_generated/api', () => ({
  api: {
    quizSubmission: {
      mutations: {
        approveSubmission: 'quizSubmission.mutations.approveSubmission',
      },
      queries: {
        getAdminSubmissionDetail:
          'quizSubmission.queries.getAdminSubmissionDetail',
        getAdminSubmissionStats:
          'quizSubmission.queries.getAdminSubmissionStats',
        getAdminSubmissionsPaginated:
          'quizSubmission.queries.getAdminSubmissionsPaginated',
      },
    },
  },
}));

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: {
    Soft: 'Soft',
  },
}));

jest.mock('react-native-safe-area-context', () => {
  const {View} = jest.requireActual('react-native');

  return {
    SafeAreaView: View,
  };
});

jest.mock('@backpackapp-io/react-native-toast', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('../../src/STRINGS', () => ({
  t: (key: string, params?: Record<string, number>) => {
    const strings: Record<string, string> = {
      'adminQuizSubmissions.all': 'All',
      'adminQuizSubmissions.approve': 'Approve Quiz',
      'adminQuizSubmissions.approved': 'Approved',
      'adminQuizSubmissions.category': 'Category',
      'adminQuizSubmissions.correctAnswer': 'Correct Answer',
      'adminQuizSubmissions.correctLabel': 'Correct',
      'adminQuizSubmissions.detailTitle': 'Review Quiz',
      'adminQuizSubmissions.empty': 'No submitted quizzes here.',
      'adminQuizSubmissions.language': 'Language',
      'adminQuizSubmissions.noExplanation': 'No explanation provided.',
      'adminQuizSubmissions.notFound': 'Submission not found.',
      'adminQuizSubmissions.pending': 'Pending',
      'adminQuizSubmissions.performance': 'Performance',
      'adminQuizSubmissions.rejected': 'Rejected',
      'adminQuizSubmissions.rejectionReason': 'Rejection Reason',
      'adminQuizSubmissions.reviewedAt': `Reviewed on ${
        (params as Record<string, string> | undefined)?.date ?? ''
      }`,
      'adminQuizSubmissions.solveAttemptsLabel': 'Attempts',
      'adminQuizSubmissions.solveCount': `${params?.count ?? 0} attempts`,
      'adminQuizSubmissions.solvedUsers': `Solved by ${params?.count ?? 0} users`,
      'adminQuizSubmissions.solvedUsersLabel': 'Users',
      'adminQuizSubmissions.submitter': 'Submitter',
      'adminQuizSubmissions.title': 'Submitted Quizzes',
      'adminQuizSubmissions.total': 'Total',
      'common.back': 'Back',
      'common.loading': 'Loading Martie',
      'myQuizzes.approved': 'Approved',
      'myQuizzes.pending': 'Under Review',
      'myQuizzes.rejected': 'Rejected',
      'submitQuiz.explanation': 'Answer Explanation (Optional)',
      'submitQuiz.options': 'Options',
      'submitQuiz.question': 'Question',
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

jest.mock('../../src/utils/categoriesMap', () => ({
  categoriesMap: [
    {
      localizedString: 'Science',
      name: 'basicScience',
    },
    {
      localizedString: 'History',
      name: 'worldHistory',
    },
  ],
}));

const approvedSubmission = {
  _id: 'submission-approved',
  categoryName: 'basicScience',
  correctCount: 2,
  createdAt: '2026-07-12T09:00:00Z',
  question: 'What is a comet?',
  solvedUserCount: 3,
  solveCount: 5,
  status: 'approved',
  submitterEmail: 'ada@example.com',
  submitterName: 'Ada',
};

const pendingSubmission = {
  _id: 'submission-pending',
  categoryName: 'worldHistory',
  correctCount: 0,
  createdAt: '2026-07-11T09:00:00Z',
  question: 'Which treaty needs review?',
  solvedUserCount: 0,
  solveCount: 0,
  status: 'pending',
  submitterEmail: 'curator@example.com',
  submitterName: 'Unknown',
};

const detailSubmission = {
  _id: 'submission-detail',
  answerExplanation: undefined,
  categoryName: 'basicScience',
  correctCount: 0,
  createdAt: '2026-07-15T09:00:00Z',
  language: 'en',
  options: [
    {text: 'Ice and dust', isAnswer: true},
    {text: 'Hot plasma', isAnswer: false},
    {text: 'Molten rock', isAnswer: false},
    {text: 'Pure oxygen', isAnswer: false},
  ],
  question: 'What is a comet?',
  reviewerEmail: '',
  solvedUserCount: 0,
  solveCount: 0,
  status: 'pending',
  submitterEmail: 'ada@example.com',
  submitterName: 'Ada',
};

describe('AdminQuizSubmissionsPage accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({submissionId: 'submission-detail'});
    mockUseQuery.mockReturnValue({
      approved: 1,
      pending: 2,
      rejected: 1,
      total: 4,
    });
    mockUsePaginatedQuery.mockReturnValue({
      isLoading: false,
      loadMore: jest.fn(),
      results: [approvedSubmission, pendingSubmission],
      status: 'Exhausted',
    });
  });

  it('announces submission stats and filter selection', async () => {
    const {getByLabelText} = await render(<AdminQuizSubmissionsPage />);

    const stats = getByLabelText('Pending, 2, Approved, 1, Total, 4');
    expect(stats.props.accessibilityRole).toBe('text');

    const pendingFilter = getByLabelText('Pending');
    expect(pendingFilter.props).toMatchObject({
      accessibilityRole: 'button',
      accessibilityState: {selected: true},
    });

    expect(getByLabelText('Approved').props.accessibilityState).toEqual({
      selected: false,
    });
  });

  it('announces each submission row as a navigable summary', async () => {
    const {getByLabelText} = await render(<AdminQuizSubmissionsPage />);

    const approvedRow = getByLabelText(
      'Approved, 2026-07-12, What is a comet?, Science, Ada, Solved by 3 users, 5 attempts',
    );
    expect(approvedRow.props.accessibilityRole).toBe('button');

    const pendingRow = getByLabelText(
      'Under Review, 2026-07-11, Which treaty needs review?, History, curator@example.com',
    );
    await fireEvent.press(pendingRow);

    expect(mockNavigate).toHaveBeenCalledWith(
      '/admin-quiz-submissions/submission-pending',
    );
  });

  it('announces the empty state as static text', async () => {
    mockUsePaginatedQuery.mockReturnValue({
      isLoading: false,
      loadMore: jest.fn(),
      results: [],
      status: 'Exhausted',
    });

    const {getByLabelText} = await render(<AdminQuizSubmissionsPage />);

    const emptyState = getByLabelText('No submitted quizzes here.');
    expect(emptyState.props.accessibilityRole).toBe('text');
  });

  it('announces load-more pagination as a busy progress indicator', async () => {
    mockUsePaginatedQuery.mockReturnValue({
      isLoading: true,
      loadMore: jest.fn(),
      results: [approvedSubmission],
      status: 'LoadingMore',
    });

    const {getByLabelText} = await render(<AdminQuizSubmissionsPage />);

    const footerLoader = getByLabelText('Loading Martie');
    expect(footerLoader.props).toMatchObject({
      accessibilityLiveRegion: 'polite',
      accessibilityRole: 'progressbar',
      accessibilityState: {busy: true},
    });
  });
});

describe('AdminQuizSubmissionDetailPage accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({submissionId: 'submission-detail'});
    mockUseQuery.mockReturnValue(detailSubmission);
    mockApproveSubmission.mockResolvedValue(undefined);
  });

  it('announces the submission summary, section headers, options, and approve action', async () => {
    const {getByLabelText, getByText} = await render(
      <AdminQuizSubmissionDetailPage />,
    );

    expect(
      getByLabelText(
        'Under Review, 2026-07-15, Science, EN, Ada · ada@example.com',
      ).props.accessibilityRole,
    ).toBe('text');

    expect(getByText('Question').props.accessibilityRole).toBe('header');
    expect(getByText('What is a comet?').props.accessibilityRole).toBe('text');
    expect(
      getByLabelText('A, Ice and dust, Correct Answer').props
        .accessibilityRole,
    ).toBe('text');
    expect(getByLabelText('B, Hot plasma').props.accessibilityRole).toBe(
      'text',
    );
    expect(getByText('Correct Answer').props.accessibilityRole).toBe('header');
    expect(
      getByText('Answer Explanation (Optional)').props.accessibilityRole,
    ).toBe('header');
    expect(getByText('No explanation provided.').props.accessibilityRole).toBe(
      'text',
    );

    expect(getByLabelText('Approve Quiz').props).toMatchObject({
      accessibilityRole: 'button',
      accessibilityState: {busy: false, disabled: false},
    });
  });

  it('announces approved performance and review metadata', async () => {
    mockUseQuery.mockReturnValue({
      ...detailSubmission,
      answerExplanation: 'Comets are icy bodies orbiting the sun.',
      correctCount: 2,
      reviewedAt: '2026-07-15T12:00:00Z',
      reviewerEmail: 'reviewer@example.com',
      solvedUserCount: 3,
      solveCount: 5,
      status: 'approved',
    });

    const {getByLabelText, getByText} = await render(
      <AdminQuizSubmissionDetailPage />,
    );

    expect(getByText('Performance').props.accessibilityRole).toBe('header');
    expect(getByLabelText('Users, 3').props.accessibilityRole).toBe('text');
    expect(getByLabelText('Attempts, 5').props.accessibilityRole).toBe('text');
    expect(getByLabelText('Correct, 2').props.accessibilityRole).toBe('text');
    expect(
      getByLabelText('Reviewed on 2026-07-15, reviewer@example.com').props
        .accessibilityRole,
    ).toBe('text');
  });

  it('announces a missing submission as static text', async () => {
    mockUseQuery.mockReturnValue(null);

    const {getByLabelText} = await render(<AdminQuizSubmissionDetailPage />);

    expect(getByLabelText('Submission not found.').props.accessibilityRole).toBe(
      'text',
    );
  });
});
