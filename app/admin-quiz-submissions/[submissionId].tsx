/**
 * @name AdminQuizSubmissionDetail
 *
 * 관리자용 퀴즈 제출 상세 검토 화면
 */
import {styled, css} from 'kstyled';
import {Button, Typography, useCPK} from 'cpk-ui';
import {Stack, useLocalSearchParams} from 'expo-router';
import {useMutation, useQuery} from 'convex/react';
import {ScrollView, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {toast} from '@backpackapp-io/react-native-toast';
import {useState} from 'react';

import {api} from '../../convex/_generated/api';
import type {Id} from '../../convex/_generated/dataModel';
import {t} from '../../src/STRINGS';
import {categoriesMap} from '../../src/utils/categoriesMap';
import {withErrorBoundary} from '../../src/hoc/withErrorBoundary';
import CustomLoadingIndicator from '../../src/uis/CustomLoadingIndicator';

type SubmissionStatus = 'pending' | 'approved' | 'rejected';

type AdminSubmissionDetail = {
  _id: Id<'quizSubmissions'>;
  answerExplanation?: string;
  categoryName: string;
  correctCount: number;
  createdAt: string;
  language: 'en' | 'ko' | 'ja';
  options: {
    text: string;
    isAnswer: boolean;
  }[];
  question: string;
  quizId?: Id<'quizzes'>;
  rejectionReason?: string;
  reviewedAt?: string;
  reviewerEmail: string;
  solvedUserCount: number;
  solveCount: number;
  status: SubmissionStatus;
  submitterEmail: string;
  submitterName: string;
};

const STATUS_COLORS: Record<SubmissionStatus, string> = {
  pending: '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
};

function AdminQuizSubmissionDetailPage(): JSX.Element {
  const {theme} = useCPK();
  const {submissionId} = useLocalSearchParams<{submissionId: string}>();
  const [loading, setLoading] = useState(false);
  const approveSubmission = useMutation(
    api.quizSubmission.mutations.approveSubmission,
  );

  const submission = useQuery(
    api.quizSubmission.queries.getAdminSubmissionDetail,
    submissionId
      ? {submissionId: submissionId as Id<'quizSubmissions'>}
      : 'skip',
  ) as AdminSubmissionDetail | null | undefined;

  const getCategoryLabel = (categoryName: string): string => {
    return (
      categoriesMap.find((category) => category.name === categoryName)
        ?.localizedString ||
      categoryName ||
      '-'
    );
  };

  const getStatusText = (status: SubmissionStatus): string => {
    if (status === 'pending') return t('myQuizzes.pending');
    if (status === 'approved') return t('myQuizzes.approved');
    return t('myQuizzes.rejected');
  };

  const handleApprove = async () => {
    if (!submission) return;

    setLoading(true);
    try {
      await approveSubmission({submissionId: submission._id});
      toast.success(t('adminQuizSubmissions.approveSuccess'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('error.message'));
    } finally {
      setLoading(false);
    }
  };

  if (submission === undefined) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: t('adminQuizSubmissions.detailTitle'),
            headerBackTitle: t('common.back'),
          }}
        />
        <CustomLoadingIndicator />
      </>
    );
  }

  if (!submission) {
    return (
      <Container>
        <Stack.Screen
          options={{
            headerShown: true,
            title: t('adminQuizSubmissions.detailTitle'),
            headerBackTitle: t('common.back'),
          }}
        />
        <EmptyCard
          accessible={true}
          accessibilityLabel={t('adminQuizSubmissions.notFound')}
          accessibilityRole="text"
        >
          <Typography.Body2
            style={css`
              color: ${theme.text.placeholder};
            `}
          >
            {t('adminQuizSubmissions.notFound')}
          </Typography.Body2>
        </EmptyCard>
      </Container>
    );
  }

  const statusColor = STATUS_COLORS[submission.status];
  const correctAnswer = submission.options.find((option) => option.isAnswer);
  const createdDate = submission.createdAt.split('T')[0];
  const submitterLabel = submission.submitterEmail
    ? `${submission.submitterName} · ${submission.submitterEmail}`
    : submission.submitterName;
  const summaryAccessibilityLabel = [
    getStatusText(submission.status),
    createdDate,
    getCategoryLabel(submission.categoryName),
    submission.language.toUpperCase(),
    submitterLabel,
  ]
    .filter(Boolean)
    .join(', ');
  const correctAnswerText = correctAnswer?.text || '-';
  const explanationText =
    submission.answerExplanation || t('adminQuizSubmissions.noExplanation');
  const reviewedAtAccessibilityLabel = submission.reviewedAt
    ? [
        t('adminQuizSubmissions.reviewedAt', {
          date: submission.reviewedAt.split('T')[0],
        }),
        submission.reviewerEmail,
      ]
        .filter(Boolean)
        .join(', ')
    : undefined;

  return (
    <Container>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('adminQuizSubmissions.detailTitle'),
          headerBackTitle: t('common.back'),
          headerShadowVisible: false,
        }}
      />
      <Content
        showsVerticalScrollIndicator={false}
        contentContainerStyle={css`
          padding: 16px 20px 40px;
          gap: 14px;
        `}
      >
        <HeaderCard
          accessible={true}
          accessibilityLabel={summaryAccessibilityLabel}
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
                {getStatusText(submission.status)}
              </StatusText>
            </StatusBadge>
            <Typography.Body4
              style={css`
                color: ${theme.text.placeholder};
              `}
            >
              {createdDate}
            </Typography.Body4>
          </View>
          <InfoGrid>
            <InfoItem
              label={t('adminQuizSubmissions.category')}
              value={getCategoryLabel(submission.categoryName)}
            />
            <InfoItem
              label={t('adminQuizSubmissions.language')}
              value={submission.language.toUpperCase()}
            />
            <InfoItem
              label={t('adminQuizSubmissions.submitter')}
              value={submitterLabel}
            />
          </InfoGrid>
        </HeaderCard>

        <Card>
          <SectionTitle accessibilityRole="header">
            {t('submitQuiz.question')}
          </SectionTitle>
          <Typography.Body1
            accessibilityRole="text"
            style={css`
              line-height: 24px;
              font-weight: 700;
            `}
          >
            {submission.question}
          </Typography.Body1>
        </Card>

        <Card>
          <SectionTitle accessibilityRole="header">
            {t('submitQuiz.options')}
          </SectionTitle>
          {submission.options.map((option, index) => {
            const optionLetter = String.fromCharCode(65 + index);
            const optionAccessibilityLabel = [
              optionLetter,
              option.text,
              option.isAnswer ? t('adminQuizSubmissions.correctAnswer') : null,
            ]
              .filter(Boolean)
              .join(', ');

            return (
              <OptionRow
                key={`${option.text}-${index}`}
                $answer={option.isAnswer}
                accessible={true}
                accessibilityLabel={optionAccessibilityLabel}
                accessibilityRole="text"
              >
                <OptionLetter $answer={option.isAnswer}>
                  {optionLetter}
                </OptionLetter>
                <Typography.Body2
                  style={css`
                    flex: 1;
                    font-weight: ${option.isAnswer ? 800 : 500};
                  `}
                >
                  {option.text}
                </Typography.Body2>
              </OptionRow>
            );
          })}
        </Card>

        <Card>
          <SectionTitle accessibilityRole="header">
            {t('adminQuizSubmissions.correctAnswer')}
          </SectionTitle>
          <Typography.Body2 accessibilityRole="text">
            {correctAnswerText}
          </Typography.Body2>
        </Card>

        <Card>
          <SectionTitle accessibilityRole="header">
            {t('submitQuiz.explanation')}
          </SectionTitle>
          <Typography.Body2
            accessibilityRole="text"
            style={css`
              color: ${submission.answerExplanation
                ? theme.text.basic
                : theme.text.placeholder};
              line-height: 22px;
            `}
          >
            {explanationText}
          </Typography.Body2>
        </Card>

        {submission.status === 'approved' && (
          <Card>
            <SectionTitle accessibilityRole="header">
              {t('adminQuizSubmissions.performance')}
            </SectionTitle>
            <MetricRow>
              <MetricItem
                accessible={true}
                accessibilityLabel={`${t(
                  'adminQuizSubmissions.solvedUsersLabel',
                )}, ${submission.solvedUserCount}`}
                accessibilityRole="text"
              >
                <MetricValue>{submission.solvedUserCount}</MetricValue>
                <MetricLabel>
                  {t('adminQuizSubmissions.solvedUsersLabel')}
                </MetricLabel>
              </MetricItem>
              <MetricItem
                accessible={true}
                accessibilityLabel={`${t(
                  'adminQuizSubmissions.solveAttemptsLabel',
                )}, ${submission.solveCount}`}
                accessibilityRole="text"
              >
                <MetricValue>{submission.solveCount}</MetricValue>
                <MetricLabel>
                  {t('adminQuizSubmissions.solveAttemptsLabel')}
                </MetricLabel>
              </MetricItem>
              <MetricItem
                accessible={true}
                accessibilityLabel={`${t('adminQuizSubmissions.correctLabel')}, ${
                  submission.correctCount
                }`}
                accessibilityRole="text"
              >
                <MetricValue>{submission.correctCount}</MetricValue>
                <MetricLabel>
                  {t('adminQuizSubmissions.correctLabel')}
                </MetricLabel>
              </MetricItem>
            </MetricRow>
          </Card>
        )}

        {submission.status === 'rejected' && submission.rejectionReason && (
          <Card>
            <SectionTitle accessibilityRole="header">
              {t('adminQuizSubmissions.rejectionReason')}
            </SectionTitle>
            <Typography.Body2
              accessibilityRole="text"
              style={css`
                color: ${STATUS_COLORS.rejected};
              `}
            >
              {submission.rejectionReason}
            </Typography.Body2>
          </Card>
        )}

        {submission.reviewedAt && (
          <MetaText
            accessible={true}
            accessibilityLabel={reviewedAtAccessibilityLabel}
            accessibilityRole="text"
          >
            {t('adminQuizSubmissions.reviewedAt', {
              date: submission.reviewedAt.split('T')[0],
            })}
            {submission.reviewerEmail ? ` · ${submission.reviewerEmail}` : ''}
          </MetaText>
        )}

        {submission.status === 'pending' && (
          <Button
            hapticFeedback={ImpactFeedbackStyle.Soft}
            loading={loading}
            disabled={loading}
            text={t('adminQuizSubmissions.approve')}
            onPress={handleApprove}
            accessibilityLabel={t('adminQuizSubmissions.approve')}
            touchableHighlightProps={{
              accessibilityRole: 'button',
              accessibilityState: {busy: loading, disabled: loading},
            }}
            borderRadius={16}
            styles={{
              container: css`
                height: 54px;
                border-width: 0;
              `,
            }}
          />
        )}
      </Content>
    </Container>
  );
}

function InfoItem({label, value}: {label: string; value: string}): JSX.Element {
  return (
    <View
      style={css`
        gap: 4px;
      `}
    >
      <InfoLabel>{label}</InfoLabel>
      <Typography.Body3>{value}</Typography.Body3>
    </View>
  );
}

const Container = styled(SafeAreaView)`
  flex: 1;
  background-color: ${({theme}) => theme.bg.basic};
`;

const Content = styled(ScrollView)`
  flex: 1;
`;

const HeaderCard = styled.View`
  background-color: ${({theme}) => theme.bg.paper};
  border-radius: 16px;
  padding: 16px;
  gap: 16px;
`;

const Card = styled.View`
  background-color: ${({theme}) => theme.bg.paper};
  border-radius: 16px;
  padding: 16px;
  gap: 12px;
`;

const EmptyCard = styled.View`
  margin: 20px;
  align-items: center;
  justify-content: center;
  background-color: ${({theme}) => theme.bg.paper};
  border-radius: 16px;
  padding: 40px 20px;
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

const InfoGrid = styled.View`
  gap: 12px;
`;

const InfoLabel = styled(Typography.Body4)`
  color: ${({theme}) => theme.text.placeholder};
`;

const SectionTitle = styled(Typography.Body3)`
  color: ${({theme}) => theme.text.placeholder};
  font-weight: 800;
`;

const OptionRow = styled.View<{$answer: boolean}>`
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${({$answer, theme}) =>
    $answer ? theme.role.primary : theme.role.border};
  background-color: ${({$answer, theme}) =>
    $answer ? `${theme.role.primary}1F` : theme.bg.basic};
`;

const OptionLetter = styled(Typography.Body3)<{$answer: boolean}>`
  width: 30px;
  height: 30px;
  border-radius: 15px;
  text-align: center;
  line-height: 30px;
  color: ${({$answer, theme}) =>
    $answer ? theme.text.contrast : theme.text.basic};
  background-color: ${({$answer, theme}) =>
    $answer ? theme.role.primary : theme.bg.paper};
  font-weight: 800;
`;

const MetricRow = styled.View`
  flex-direction: row;
  gap: 10px;
`;

const MetricItem = styled.View`
  flex: 1;
  align-items: center;
  background-color: ${({theme}) => theme.bg.basic};
  border-radius: 12px;
  padding: 12px 8px;
  gap: 4px;
`;

const MetricValue = styled(Typography.Heading4)`
  font-weight: 800;
`;

const MetricLabel = styled(Typography.Body4)`
  color: ${({theme}) => theme.text.placeholder};
  text-align: center;
`;

const MetaText = styled(Typography.Body4)`
  color: ${({theme}) => theme.text.placeholder};
  text-align: center;
`;

export default withErrorBoundary(AdminQuizSubmissionDetailPage);
