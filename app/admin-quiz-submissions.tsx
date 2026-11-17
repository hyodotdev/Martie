/**
 * @name AdminQuizSubmissions
 *
 * 관리자용 퀴즈 제출 검토 목록
 */
import {styled, css} from 'kstyled';
import {FlashList} from '@shopify/flash-list';
import {Stack, useRouter} from 'expo-router';
import {Typography, useCPK} from 'cpk-ui';
import {type ReactElement, useCallback, useMemo, useState} from 'react';
import {ActivityIndicator, Pressable, ScrollView, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  PaginatedQueryReference,
  usePaginatedQuery,
  useQuery,
} from 'convex/react';

import {api} from '../convex/_generated/api';
import {t} from '../src/STRINGS';
import {categoriesMap} from '../src/utils/categoriesMap';
import {withErrorBoundary} from '../src/hoc/withErrorBoundary';
import CustomLoadingIndicator from '../src/uis/CustomLoadingIndicator';

type SubmissionStatus = 'pending' | 'approved' | 'rejected';
type FilterStatus = 'all' | SubmissionStatus;

type AdminSubmission = {
  _id: string;
  categoryName: string;
  correctCount: number;
  createdAt: string;
  question: string;
  solvedUserCount: number;
  solveCount: number;
  status: SubmissionStatus;
  submitterEmail: string;
  submitterName: string;
};

const LIST_SIZE = 20;

const STATUS_COLORS: Record<SubmissionStatus, string> = {
  pending: '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
};

const UNKNOWN_SUBMITTER_LABEL = 'Unknown';

const joinAccessibilityLabel = (
  parts: (number | string | null | undefined)[],
): string => {
  return parts
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(', ');
};

const formatSubmissionDate = (
  createdAt?: string | null,
): string | undefined => {
  return createdAt?.split('T')[0];
};

const getSubmitterLabel = ({
  submitterEmail,
  submitterName,
}: {
  submitterEmail: string;
  submitterName: string;
}): string => {
  const name = submitterName.trim();
  const email = submitterEmail.trim();

  if (name && name !== UNKNOWN_SUBMITTER_LABEL) {
    return name;
  }

  return email || name || UNKNOWN_SUBMITTER_LABEL;
};

function AdminQuizSubmissionsPage(): JSX.Element {
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const stats = useQuery(api.quizSubmission.queries.getAdminSubmissionStats);

  const statsAccessibilityLabel = useMemo(
    () =>
      joinAccessibilityLabel([
        t('adminQuizSubmissions.pending'),
        stats?.pending ?? 0,
        t('adminQuizSubmissions.approved'),
        stats?.approved ?? 0,
        t('adminQuizSubmissions.total'),
        stats?.total ?? 0,
      ]),
    [stats?.approved, stats?.pending, stats?.total],
  );

  const ListHeader = useMemo(
    () => (
      <HeaderContainer>
        <StatsCard
          accessible={true}
          accessibilityLabel={statsAccessibilityLabel}
          accessibilityRole="text"
        >
          <StatItem>
            <StatValue>{stats?.pending ?? 0}</StatValue>
            <StatLabel>{t('adminQuizSubmissions.pending')}</StatLabel>
          </StatItem>
          <StatDivider />
          <StatItem>
            <StatValue>{stats?.approved ?? 0}</StatValue>
            <StatLabel>{t('adminQuizSubmissions.approved')}</StatLabel>
          </StatItem>
          <StatDivider />
          <StatItem>
            <StatValue>{stats?.total ?? 0}</StatValue>
            <StatLabel>{t('adminQuizSubmissions.total')}</StatLabel>
          </StatItem>
        </StatsCard>

        <FilterRow horizontal showsHorizontalScrollIndicator={false}>
          {(
            [
              ['pending', t('adminQuizSubmissions.pending')],
              ['approved', t('adminQuizSubmissions.approved')],
              ['rejected', t('adminQuizSubmissions.rejected')],
              ['all', t('adminQuizSubmissions.all')],
            ] as [FilterStatus, string][]
          ).map(([value, label]) => (
            <FilterChip
              key={value}
              onPress={() => setFilter(value)}
              $selected={filter === value}
              accessibilityLabel={label}
              accessibilityRole="button"
              accessibilityState={{selected: filter === value}}
            >
              <FilterText $selected={filter === value}>{label}</FilterText>
            </FilterChip>
          ))}
        </FilterRow>
      </HeaderContainer>
    ),
    [
      filter,
      stats?.approved,
      stats?.pending,
      stats?.total,
      statsAccessibilityLabel,
    ],
  );

  return (
    <Container>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('adminQuizSubmissions.title'),
          headerBackTitle: t('common.back'),
          headerShadowVisible: false,
        }}
      />
      <SubmissionList key={filter} filter={filter} listHeader={ListHeader} />
    </Container>
  );
}

function SubmissionList({
  filter,
  listHeader,
}: {
  filter: FilterStatus;
  listHeader: ReactElement;
}): JSX.Element {
  const {theme} = useCPK();
  const {navigate} = useRouter();
  const {
    results: submissions,
    status: paginationStatus,
    loadMore,
    isLoading,
  } = usePaginatedQuery(
    api.quizSubmission.queries
      .getAdminSubmissionsPaginated as unknown as PaginatedQueryReference,
    {
      status: filter === 'all' ? undefined : filter,
    },
    {
      initialNumItems: LIST_SIZE,
    },
  );

  const getCategoryLabel = useCallback((categoryName: string): string => {
    return (
      categoriesMap.find((category) => category.name === categoryName)
        ?.localizedString ||
      categoryName ||
      '-'
    );
  }, []);

  const getStatusText = useCallback((status: SubmissionStatus): string => {
    if (status === 'pending') return t('myQuizzes.pending');
    if (status === 'approved') return t('myQuizzes.approved');
    return t('myQuizzes.rejected');
  }, []);

  const handleLoadMore = useCallback(() => {
    if (paginationStatus === 'CanLoadMore') {
      loadMore(LIST_SIZE);
    }
  }, [loadMore, paginationStatus]);

  const renderSubmission = useCallback(
    ({item: submission}: {item: AdminSubmission}) => {
      const statusColor = STATUS_COLORS[submission.status];
      const submissionDate = formatSubmissionDate(submission.createdAt);
      const submitterLabel = getSubmitterLabel(submission);
      const approvedStats =
        submission.status === 'approved'
          ? [
              t('adminQuizSubmissions.solvedUsers', {
                count: submission.solvedUserCount,
              }),
              t('adminQuizSubmissions.solveCount', {
                count: submission.solveCount,
              }),
            ]
          : [];
      const submissionAccessibilityLabel = joinAccessibilityLabel([
        getStatusText(submission.status),
        submissionDate,
        submission.question,
        getCategoryLabel(submission.categoryName),
        submitterLabel,
        ...approvedStats,
      ]);

      return (
        <SubmissionCard
          accessible={true}
          accessibilityLabel={submissionAccessibilityLabel}
          accessibilityRole="button"
          onPress={() => navigate(`/admin-quiz-submissions/${submission._id}`)}
        >
          <View
            style={css`
              flex-direction: row;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
            `}
          >
            <StatusBadge $color={statusColor}>
              <StatusText $color={statusColor}>
                {getStatusText(submission.status)}
              </StatusText>
            </StatusBadge>
            <Typography.Body4
              style={css`
                color: ${theme.text.placeholder};
              `}
            >
              {submissionDate}
            </Typography.Body4>
          </View>

          <Typography.Body1
            numberOfLines={2}
            style={css`
              font-weight: 700;
            `}
          >
            {submission.question}
          </Typography.Body1>

          <MetaText>
            {getCategoryLabel(submission.categoryName)} · {submitterLabel}
          </MetaText>

          {submission.status === 'approved' && (
            <MetaText>
              {t('adminQuizSubmissions.solvedUsers', {
                count: submission.solvedUserCount,
              })}{' '}
              ·{' '}
              {t('adminQuizSubmissions.solveCount', {
                count: submission.solveCount,
              })}
            </MetaText>
          )}
        </SubmissionCard>
      );
    },
    [getCategoryLabel, getStatusText, navigate, theme.text.placeholder],
  );

  const keyExtractor = useCallback(
    (submission: AdminSubmission) => submission._id,
    [],
  );

  const ListEmpty = useCallback(() => {
    if (isLoading) return null;

    return (
      <EmptyCard
        accessible={true}
        accessibilityLabel={t('adminQuizSubmissions.empty')}
        accessibilityRole="text"
      >
        <Typography.Body2
          style={css`
            color: ${theme.text.placeholder};
          `}
        >
          {t('adminQuizSubmissions.empty')}
        </Typography.Body2>
      </EmptyCard>
    );
  }, [isLoading, theme.text.placeholder]);

  const ListFooter = useCallback(() => {
    if (isLoading && paginationStatus === 'LoadingMore') {
      return (
        <FooterLoader>
          <ActivityIndicator
            accessibilityLabel={t('common.loading')}
            accessibilityLiveRegion="polite"
            accessibilityRole="progressbar"
            accessibilityState={{busy: true}}
            size="small"
            color={theme.role.primary}
          />
        </FooterLoader>
      );
    }

    return <FooterSpacer />;
  }, [isLoading, paginationStatus, theme.role.primary]);

  if (paginationStatus === 'LoadingFirstPage' && submissions.length === 0) {
    return <CustomLoadingIndicator />;
  }

  return (
    <FlashList
      data={submissions as AdminSubmission[]}
      keyExtractor={keyExtractor}
      renderItem={renderSubmission}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={ListEmpty}
      ListFooterComponent={ListFooter}
      ItemSeparatorComponent={Separator}
      contentContainerStyle={css`
        padding: 16px 20px 0;
      `}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      removeClippedSubviews={false}
    />
  );
}

const Container = styled(SafeAreaView)`
  flex: 1;
  background-color: ${({theme}) => theme.bg.basic};
`;

const HeaderContainer = styled.View`
  gap: 14px;
  margin-bottom: 14px;
`;

const StatsCard = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: ${({theme}) => theme.bg.paper};
  border-radius: 16px;
  padding: 16px;
`;

const StatItem = styled.View`
  flex: 1;
  align-items: center;
  gap: 4px;
`;

const StatValue = styled(Typography.Heading4)`
  font-weight: 800;
`;

const StatLabel = styled(Typography.Body4)`
  color: ${({theme}) => theme.text.placeholder};
`;

const StatDivider = styled.View`
  width: 1px;
  height: 34px;
  background-color: ${({theme}) => theme.role.border};
`;

const FilterRow = styled(ScrollView)`
  margin: 0 -20px;
  padding: 0 20px;
`;

const FilterChip = styled(Pressable)<{$selected: boolean}>`
  min-height: 38px;
  justify-content: center;
  border-radius: 19px;
  border-width: 1px;
  padding: 0 14px;
  margin-right: 8px;
  border-color: ${({$selected, theme}) =>
    $selected ? theme.role.primary : theme.role.border};
  background-color: ${({$selected, theme}) =>
    $selected ? theme.role.primary : theme.bg.paper};
`;

const FilterText = styled(Typography.Body3)<{$selected: boolean}>`
  color: ${({$selected, theme}) =>
    $selected ? theme.text.contrast : theme.text.basic};
  font-weight: 700;
`;

const SubmissionCard = styled(Pressable)`
  background-color: ${({theme}) => theme.bg.paper};
  border-radius: 14px;
  padding: 16px;
  gap: 10px;
`;

const StatusBadge = styled.View<{$color: string}>`
  align-self: flex-start;
  padding: 4px 10px;
  border-radius: 10px;
  background-color: ${({$color}) => `${$color}22`};
`;

const StatusText = styled(Typography.Body4)<{$color: string}>`
  color: ${({$color}) => $color};
  font-weight: 800;
`;

const MetaText = styled(Typography.Body3)`
  color: ${({theme}) => theme.text.placeholder};
`;

const EmptyCard = styled.View`
  align-items: center;
  justify-content: center;
  background-color: ${({theme}) => theme.bg.paper};
  border-radius: 14px;
  padding: 40px 20px;
`;

const Separator = styled.View`
  height: 12px;
`;

const FooterLoader = styled.View`
  padding: 20px;
  align-items: center;
`;

const FooterSpacer = styled.View`
  height: 96px;
`;

export default withErrorBoundary(AdminQuizSubmissionsPage);
