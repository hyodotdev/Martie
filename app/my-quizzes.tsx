/**
 * @name MyQuizzes
 *
 * 내가 출제한 퀴즈 목록 + Feather 통계
 */
import {styled, css} from 'kstyled';
import {FlashList} from '@shopify/flash-list';
import {Typography, useCPK} from 'cpk-ui';
import {Stack} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {t} from '../src/STRINGS';
import {ActivityIndicator, View} from 'react-native';
import {useCallback, useEffect, useMemo} from 'react';
import {api} from '../convex/_generated/api';
import {
  PaginatedQueryReference,
  usePaginatedQuery,
  useQuery,
} from 'convex/react';
import {logScreenView} from '../src/utils/analytics';
import {withErrorBoundary} from '../src/hoc/withErrorBoundary';
import CustomLoadingIndicator from '../src/uis/CustomLoadingIndicator';

type SubmissionStatus = 'pending' | 'approved' | 'rejected';

type Submission = {
  _id: string;
  question: string;
  status: SubmissionStatus;
  createdAt: string;
  quizId?: string;
  rejectionReason?: string;
  solveCount: number;
  feathersEarned: number;
};

const LIST_SIZE = 20;

const STATUS_COLORS: Record<SubmissionStatus, string> = {
  pending: '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
};

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

function MyQuizzesPage(): JSX.Element {
  const {theme} = useCPK();
  const currentUser = useQuery(api.user.queries.currentUser);
  const {
    results: submissions,
    status,
    loadMore,
    isLoading,
  } = usePaginatedQuery(
    api.quizSubmission.queries
      .getMySubmissionsPaginated as unknown as PaginatedQueryReference,
    {},
    {
      initialNumItems: LIST_SIZE,
    },
  );

  useEffect(() => {
    if (!__DEV__)
      logScreenView({
        screen_name: 'my_quizzes',
        screen_class: 'MyQuizzes',
      });
  }, []);

  const totalFeathers = currentUser?.featherCount ?? 0;

  const getStatusText = useCallback((status: SubmissionStatus) => {
    if (status === 'pending') return t('myQuizzes.pending');
    if (status === 'approved') return t('myQuizzes.approved');
    return t('myQuizzes.rejected');
  }, []);

  const totalFeathersAccessibilityLabel = useMemo(
    () => joinAccessibilityLabel([t('myQuizzes.totalFeathers'), totalFeathers]),
    [totalFeathers],
  );

  const handleLoadMore = useCallback(() => {
    if (status === 'CanLoadMore') {
      loadMore(LIST_SIZE);
    }
  }, [loadMore, status]);

  const renderSubmission = useCallback(
    ({item: sub}: {item: Submission}) => {
      const statusColor =
        STATUS_COLORS[sub.status as SubmissionStatus] || theme.text.basic;
      const submissionDate = formatSubmissionDate(sub.createdAt);
      const submissionAccessibilityLabel = joinAccessibilityLabel([
        getStatusText(sub.status),
        submissionDate,
        sub.question,
        sub.status === 'approved'
          ? t('myQuizzes.solveCount', {count: sub.solveCount})
          : undefined,
        sub.status === 'approved'
          ? t('myQuizzes.feathersEarned', {
              count: sub.feathersEarned,
            })
          : undefined,
        sub.status === 'rejected' ? sub.rejectionReason : undefined,
      ]);

      return (
        <SubmissionCard
          accessible={true}
          accessibilityLabel={submissionAccessibilityLabel}
          accessibilityRole="text"
        >
          <View
            style={css`
              flex-direction: row;
              justify-content: space-between;
              align-items: center;
              gap: 12px;
            `}
          >
            <StatusBadge $color={statusColor}>
              <StatusText $color={statusColor}>
                {getStatusText(sub.status)}
              </StatusText>
            </StatusBadge>
            <DateText>{submissionDate}</DateText>
          </View>

          <Typography.Body2 numberOfLines={2}>{sub.question}</Typography.Body2>

          {sub.status === 'approved' && (
            <StatsRow>
              <MetaText>
                {t('myQuizzes.solveCount', {count: sub.solveCount})}
              </MetaText>
              <MetaText>
                {t('myQuizzes.feathersEarned', {
                  count: sub.feathersEarned,
                })}
              </MetaText>
            </StatsRow>
          )}

          {sub.status === 'rejected' && sub.rejectionReason && (
            <RejectedText>{sub.rejectionReason}</RejectedText>
          )}
        </SubmissionCard>
      );
    },
    [getStatusText, theme.text.basic],
  );

  const ListHeader = useMemo(
    () => (
      <HeaderCard
        accessible={true}
        accessibilityLabel={totalFeathersAccessibilityLabel}
        accessibilityRole="text"
      >
        <Typography.Body3
          style={css`
            opacity: 0.6;
          `}
        >
          {t('myQuizzes.totalFeathers')}
        </Typography.Body3>
        <Typography.Heading2
          style={css`
            font-weight: 800;
          `}
        >
          {totalFeathers}
        </Typography.Heading2>
      </HeaderCard>
    ),
    [totalFeathers, totalFeathersAccessibilityLabel],
  );

  const ListEmpty = useCallback(() => {
    if (isLoading) return null;

    return (
      <EmptyCard
        accessible={true}
        accessibilityLabel={t('myQuizzes.noQuizzes')}
        accessibilityRole="text"
      >
        <Typography.Body2
          style={css`
            color: ${theme.text.placeholder};
          `}
        >
          {t('myQuizzes.noQuizzes')}
        </Typography.Body2>
      </EmptyCard>
    );
  }, [isLoading, theme.text.placeholder]);

  const ListFooter = useCallback(() => {
    if (isLoading && status === 'LoadingMore') {
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
  }, [isLoading, status, theme.role.primary]);

  const keyExtractor = useCallback((submission: Submission) => {
    return submission._id;
  }, []);

  if (status === 'LoadingFirstPage' && submissions.length === 0) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: t('myQuizzes.title'),
            headerBackTitle: t('common.back'),
          }}
        />
        <CustomLoadingIndicator />
      </>
    );
  }

  return (
    <Container>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('myQuizzes.title'),
          headerBackTitle: t('common.back'),
        }}
      />
      <FlashList
        data={submissions as Submission[]}
        keyExtractor={keyExtractor}
        renderItem={renderSubmission}
        ListHeaderComponent={ListHeader}
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
    </Container>
  );
}

const Container = styled(SafeAreaView)`
  flex: 1;
  background-color: ${({theme}) => theme.bg.basic};
`;

const HeaderCard = styled.View`
  background-color: ${({theme}) => theme.bg.paper};
  border-radius: 16px;
  padding: 20px;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
`;

const SubmissionCard = styled.View`
  background-color: ${({theme}) => theme.bg.paper};
  border-radius: 12px;
  padding: 16px;
  gap: 8px;
`;

const StatusBadge = styled.View<{$color: string}>`
  padding: 4px 10px;
  border-radius: 10px;
  background-color: ${({$color}) => `${$color}22`};
`;

const StatusText = styled(Typography.Body3)<{$color: string}>`
  color: ${({$color}) => $color};
  font-weight: bold;
  font-size: 11px;
`;

const DateText = styled(Typography.Body3)`
  color: ${({theme}) => theme.text.placeholder};
  font-size: 11px;
`;

const StatsRow = styled.View`
  flex-direction: row;
  gap: 16px;
  margin-top: 4px;
`;

const MetaText = styled(Typography.Body3)`
  color: ${({theme}) => theme.text.placeholder};
`;

const RejectedText = styled(Typography.Body3)`
  color: ${STATUS_COLORS.rejected};
`;

const EmptyCard = styled.View`
  align-items: center;
  padding: 40px;
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

export default withErrorBoundary(MyQuizzesPage);
