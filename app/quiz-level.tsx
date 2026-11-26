import {styled, css} from 'kstyled';
import {Stack} from 'expo-router';
import {Typography, useCPK} from 'cpk-ui';
import {useRef} from 'react';
import {View, type ViewInstance} from 'react-native';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {captureRef} from 'react-native-view-shot';
import {shareAsync} from 'expo-sharing';

import {t} from '../src/STRINGS';
import {LOG_EVENTS, logEvent} from '../src/utils/analytics';
import {logError} from '../src/utils/error';
import {Image} from 'expo-image';
import {IC_MARTIE_SMILE} from '../src/icons';
import ProgressBar from '../src/uis/ProgressBar';
import {useQuery} from 'convex/react';
import {api} from '../convex/_generated/api';
import {GestureHandlerButton} from '../src/uis/GestureHandlerButton';

// Generate level thresholds with exponential growth
const generateLevelThresholds = (maxLevel: number = 10): number[] => {
  const thresholds: number[] = [];
  let currentThreshold = 100;
  let currentDifference = 200;

  thresholds.push(currentThreshold);

  for (let i = 1; i < maxLevel - 1; i++) {
    currentThreshold += currentDifference;
    thresholds.push(currentThreshold);
    currentDifference *= 2;
  }

  return thresholds;
};

const LEVEL_THRESHOLDS = generateLevelThresholds();

// Helper function to calculate level progress
const calculateLevelProgress = (
  level: number,
  totalPoints: number,
): {
  progress: number;
  currentLevelPoints: number;
  nextLevelPoints: number;
  pointsNeeded: number;
} => {
  const currentLevel = level || 1;
  const currentPoints = totalPoints || 0;

  if (currentLevel >= LEVEL_THRESHOLDS.length + 1) {
    return {
      progress: 100,
      currentLevelPoints: currentPoints,
      nextLevelPoints: currentPoints,
      pointsNeeded: 0,
    };
  }

  const previousLevelThreshold =
    currentLevel > 1 ? LEVEL_THRESHOLDS[currentLevel - 2] : 0;
  const nextLevelThreshold = LEVEL_THRESHOLDS[currentLevel - 1];
  const pointsForCurrentLevel = nextLevelThreshold - previousLevelThreshold;
  const pointsEarnedInCurrentLevel = currentPoints - previousLevelThreshold;
  const pointsNeeded = nextLevelThreshold - currentPoints;
  const progress = Math.min(
    100,
    Math.max(0, (pointsEarnedInCurrentLevel / pointsForCurrentLevel) * 100),
  );

  return {
    progress,
    currentLevelPoints: pointsEarnedInCurrentLevel,
    nextLevelPoints: pointsForCurrentLevel,
    pointsNeeded,
  };
};

function QuizLevel(): JSX.Element {
  const contentRef = useRef<ViewInstance>(null);
  const currentUser = useQuery(api.user.queries.currentUser);
  const {theme} = useCPK();

  const userName = currentUser?.displayName || '';
  const userLevel = currentUser?.level || 1;
  const userPoints = currentUser?.totalPoints || 0;
  const {progress, pointsNeeded} = calculateLevelProgress(
    userLevel,
    userPoints,
  );

  // Interstitial ad removed for this screen

  const capture = async (): Promise<void> => {
    if (!contentRef.current) {
      return;
    }

    try {
      const uri = await captureRef(contentRef, {
        format: 'png',
        quality: 0.8,
      });

      if (uri) {
        await shareAsync(uri, {
          dialogTitle: t('common.martieScore'),
          mimeType: 'image/png',
        });

        logEvent(LOG_EVENTS.CAPTURE_LEVEL_RESULT);
      } else {
        throw new Error('Failed to capture view');
      }
    } catch (error) {
      logError(error);
    }
  };

  return (
    <Container>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <GestureHandlerButton
              hapticFeedback={ImpactFeedbackStyle.Soft}
              borderRadius={12}
              text={t('common.screenCapture')}
              onPress={capture}
              styles={{
                container: css`
                  min-height: 38px;
                  padding: 0 14px;
                  background-color: ${theme.bg.bubble};
                  border-color: ${theme.role.border};
                  border-width: 1px;
                `,
                text: css`
                  color: ${theme.text.basic};
                  font-size: 14px;
                  font-weight: bold;
                `,
              }}
            />
          ),
        }}
      />
      <Content
        ref={contentRef}
        collapsable={false}
        style={css`
          padding-bottom: ${60 + 'px'};
        `}
      >
        <>
          <Typography.Heading2>
            {t('quizLevel.userCleverLevel', {userName})}
          </Typography.Heading2>
          <Image
            source={IC_MARTIE_SMILE}
            style={css`
              width: 150px;
              height: 150px;
            `}
          />
          <View
            style={css`
              padding: 0 48px;
              width: 100%;
              gap: 12px;
            `}
          >
            <View
              style={css`
                align-self: stretch;
                flex-direction: row;
                justify-content: space-between;
                align-items: center;
              `}
            >
              <Typography.Heading3>Lv.{userLevel}</Typography.Heading3>
              <Typography.Body1
                style={css`
                  color: ${theme.text.disabled};
                `}
              >
                Lv.{userLevel + 1}
              </Typography.Body1>
            </View>
            <View
              style={css`
                flex-direction: row;
              `}
            >
              <ProgressBar progress={progress} variant="striped" />
            </View>
          </View>
          <Typography.Body3
            style={css`
              font-weight: bold;
              text-align: center;
              padding: 0 48px;
            `}
          >
            {t('quizLevel.levelDescription', {pointsNeeded})}
          </Typography.Body3>
        </>
      </Content>
    </Container>
  );
}

export default QuizLevel;

const Container = styled.View`
  flex: 1;
  background-color: ${({theme}) => theme.bg.basic};
`;

const Content = styled.View`
  flex: 1;
  align-self: stretch;
  justify-content: center;
  align-items: center;
  gap: 56px;
`;
