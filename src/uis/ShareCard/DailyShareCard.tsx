import React, {useRef, useCallback} from 'react';
import {View} from 'react-native';
import {Typography, useCPK} from 'cpk-ui';
import {styled, css} from 'kstyled';
import {captureRef} from 'react-native-view-shot';
import {shareAsync} from 'expo-sharing';
import {Share} from 'react-native';
import {t} from '../../STRINGS';
import ButtonMartie from '../ButtonMartie';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {logEvent, LOG_EVENTS} from '../../utils/analytics';
import SocialShareRow from './SocialShareRow';
import {MARTIE_SHARE_URL} from '../../utils/constants';

type Props = {
  challengeNumber: number;
  results: {isCorrect: boolean}[];
  totalTimeMs: number;
  currentStreak: number;
  appUrl?: string;
};

export default function DailyShareCard({
  challengeNumber,
  results,
  totalTimeMs,
  currentStreak,
  appUrl = MARTIE_SHARE_URL,
}: Props): JSX.Element {
  const {theme} = useCPK();
  const cardRef = useRef<View>(null);
  const correctCount = results.filter((r) => r.isCorrect).length;
  const timeSeconds = Math.round(totalTimeMs / 1000);
  const resultAccessibilityItems = results.map((result, index) =>
    t(
      result.isCorrect
        ? 'shareCard.questionCorrect'
        : 'shareCard.questionIncorrect',
      {number: index + 1},
    ),
  );
  const cardAccessibilityLabel = [
    t('shareCard.title', {number: challengeNumber}),
    t('daily.correctCount', {
      correct: correctCount,
      total: results.length,
    }),
    t('shareCard.time', {seconds: timeSeconds}),
    t('shareCard.streak', {count: currentStreak}),
    ...resultAccessibilityItems,
  ].join(', ');

  // 텍스트 공유용 이모지 (OS 공유 시트)
  const emojiResult = results
    .map((r) => (r.isCorrect ? '🟩' : '🟥'))
    .join('');

  const shareText = [
    t('shareCard.title', {number: challengeNumber}) + ' 🐦',
    '',
    `${emojiResult}  ${correctCount}/${results.length}`,
    `⏱ ${t('shareCard.time', {seconds: timeSeconds})}  🔥 ${t('shareCard.streak', {count: currentStreak})}`,
    '',
    appUrl,
  ].join('\n');

  const handleCopyText = useCallback(async () => {
    logEvent(LOG_EVENTS.SHARE_INITIATED, {
      source: 'daily_result',
      variant: 'text',
      challengeNumber,
      correctCount,
      currentStreak,
    });
    const result = await Share.share({message: shareText});
    if (result.action === Share.sharedAction) {
      logEvent(LOG_EVENTS.SHARE_COMPLETED, {
        source: 'daily_result',
        variant: 'text',
      });
    }
  }, [shareText, challengeNumber, correctCount, currentStreak]);

  const handleShareImage = useCallback(async () => {
    if (!cardRef.current) return;
    logEvent(LOG_EVENTS.SHARE_INITIATED, {
      source: 'daily_result',
      variant: 'image',
      challengeNumber,
      correctCount,
      currentStreak,
    });
    const uri = await captureRef(cardRef, {
      format: 'png',
      quality: 0.9,
    });
    await shareAsync(uri, {
      mimeType: 'image/png',
    });
    // expo-sharing returns no action; this signals sheet closure, not actual share
    logEvent(LOG_EVENTS.SHARE_SHEET_CLOSED, {
      source: 'daily_result',
      variant: 'image',
    });
  }, [challengeNumber, correctCount, currentStreak]);

  return (
    <View
      style={css`
        gap: 12px;
        padding: 0 16px;
        width: 100%;
      `}
    >
      <CardContainer
        ref={cardRef}
        accessible
        accessibilityLabel={cardAccessibilityLabel}
        accessibilityRole="image"
        collapsable={false}
        testID="daily-share-card-summary"
      >
        <CardTitle>{t('shareCard.title', {number: challengeNumber})}</CardTitle>

        <DotRow>
          {results.map((r, i) => (
            <ResultDot
              key={i}
              $correct={r.isCorrect}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Typography.Body3
                style={css`
                  font-size: 18px;
                  font-weight: 800;
                  color: ${r.isCorrect
                    ? theme.role.success
                    : theme.role.danger};
                `}
              >
                {r.isCorrect ? '✓' : '✗'}
              </Typography.Body3>
            </ResultDot>
          ))}
        </DotRow>

        <StatsRow>
          <StatItem>
            <StatValue>
              {correctCount}/{results.length}
            </StatValue>
          </StatItem>
          <StatDivider />
          <StatItem>
            <StatLabel>⏱</StatLabel>
            <StatValue>{timeSeconds}s</StatValue>
          </StatItem>
          <StatDivider />
          <StatItem>
            <StatLabel>🔥</StatLabel>
            <StatValue>{currentStreak}</StatValue>
          </StatItem>
        </StatsRow>
      </CardContainer>

      <SocialShareRow
        text={shareText.split('\n').slice(0, -2).join('\n')}
        url={appUrl}
        source="daily_result"
        extras={{challengeNumber, correctCount, currentStreak}}
      />

      <View
        style={css`
          flex-direction: row;
          gap: 8px;
          align-self: stretch;
        `}
      >
        <View style={css`flex: 1;`}>
          <ButtonMartie
            hapticFeedback={ImpactFeedbackStyle.Light}
            onPress={handleCopyText}
            text={t('shareCard.shareText')}
            borderRadius={12}
            color="light"
            styles={{
              container: css`
                min-height: 44px;
                border-width: 1px;
                border-color: ${theme.role.border};
                background-color: transparent;
              `,
              text: css`
                font-size: 14px;
                font-weight: 700;
              `,
            }}
          />
        </View>
        <View style={css`flex: 1;`}>
          <ButtonMartie
            hapticFeedback={ImpactFeedbackStyle.Soft}
            onPress={handleShareImage}
            text={t('shareCard.shareImage')}
            borderRadius={12}
            styles={{
              container: css`
                min-height: 44px;
                border-width: 0;
              `,
              text: css`
                font-size: 14px;
                font-weight: 700;
              `,
            }}
          />
        </View>
      </View>
    </View>
  );
}

const CardContainer = styled.View`
  padding: 22px 20px;
  background-color: ${({theme}) => theme.bg.paper};
  border-radius: 16px;
  gap: 18px;
  align-items: center;
  border-width: 1px;
  border-color: ${({theme}) => theme.role.border};
`;

const CardTitle = styled.Text`
  color: ${({theme}) => theme.text.placeholder};
  font-size: 15px;
  font-weight: 800;
  text-align: center;
`;

const DotRow = styled.View`
  flex-direction: row;
  justify-content: center;
  gap: 10px;
`;

const ResultDot = styled.View<{$correct: boolean}>`
  width: 38px;
  height: 38px;
  border-radius: 11px;
  border-width: 2px;
  border-color: ${({$correct, theme}) =>
    $correct ? theme.role.success : theme.role.danger};
  background-color: ${({$correct, theme}) =>
    `${$correct ? theme.role.success : theme.role.danger}24`};
  align-items: center;
  justify-content: center;
`;

const StatsRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 14px;
`;

const StatItem = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 4px;
`;

const StatLabel = styled.Text`
  font-size: 14px;
`;

const StatValue = styled.Text`
  font-size: 16px;
  font-weight: 800;
  color: ${({theme}) => theme.text.basic};
`;

const StatDivider = styled.View`
  width: 1px;
  height: 14px;
  background-color: ${({theme}) => theme.role.border};
`;
