/**
 * @name ResultTablet
 *
 * 태블릿 화면용 퀴즈 결과 컴포넌트
 */
import {styled, css} from 'kstyled';
import {Button, Typography} from 'cpk-ui';
import Animated from 'react-native-reanimated';
import Bubble from '../../Bubble/Bubble';
import MartieCommentator from '../../MartieCommentator';
import {t} from '../../../STRINGS';
import {ScrollView, View} from 'react-native';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {useRouter} from 'expo-router';
import {Linking} from 'react-native';
import {ResultUIProps} from './types';
import {QuizOptionWithDescription} from '../../../types';
import {useModelStatus} from '../../../hooks/useModelStatus';

function ResultTablet({
  quiz,
  selectedOption,
  onContinue,
  isContinuePending,
  bubbleAnimatedStyle,
  imageAnimatedStyle,
  buttonAnimatedStyle,
  theme,
  isCorrect,
  allowStudyInDetail,
  isLastQuestion,
}: ResultUIProps): JSX.Element {
  const {push} = useRouter();
  const {isNotSupported, isError} = useModelStatus();
  const aiUnavailable = isNotSupported || isError;

  const handleStudyInDetail = () => {
    if (aiUnavailable) {
      const query = encodeURIComponent(quiz.description);
      Linking.openURL(`https://www.google.com/search?q=${query}`);
    } else {
      push({
        pathname: '/chat',
        params: {
          question: t('common.tellMeAboutQuestion', {
            question: quiz.description,
          }),
        },
      });
    }
  };

  return (
    <Container>
      <ScrollView
        contentContainerStyle={css`
          flex-grow: 1;
        `}
      >
        <Content
          style={css`
            max-width: 600px;
            width: 100%;
            align-self: center;
            padding: 0 24px;
          `}
        >
          <Animated.View
            style={[
              bubbleAnimatedStyle,
              css`
                padding: 0 32px;
                width: 100%;
                max-width: 500px;
              `,
            ]}
          >
            <Bubble
              style={css`
                margin-top: -66px;
              `}
              text={
                isCorrect ? (
                  <View
                    style={css`
                      justify-content: center;
                      align-items: center;
                      gap: 2px;
                    `}
                  >
                    <Typography.Heading5>
                      {selectedOption.description}
                    </Typography.Heading5>
                    <Typography.Heading5
                      style={css`
                        color: ${theme.role.success};
                      `}
                    >
                      {t('common.isCorrect')}
                    </Typography.Heading5>
                  </View>
                ) : (
                  <View
                    style={css`
                      justify-content: center;
                      align-items: center;
                      gap: 2px;
                    `}
                  >
                    <Typography.Heading5
                      style={css`
                        color: ${theme.role.danger};
                      `}
                    >
                      {t('common.isIncorrect')}
                    </Typography.Heading5>
                    <Typography.Heading5>
                      {t('common.answerIs', {
                        answer: quiz.options.find(
                          (opt: QuizOptionWithDescription) => opt.isAnswer,
                        )?.description,
                      })}
                    </Typography.Heading5>
                  </View>
                )
              }
              styles={{
                text: css`
                  font-size: 16px;
                  line-height: 22px;
                `,
              }}
            />
          </Animated.View>
          <Animated.View style={imageAnimatedStyle}>
            <MartieCommentator
              mood={isCorrect ? 'correct' : 'wrong'}
              seed={quiz._id}
              size={200}
            />
          </Animated.View>
        </Content>
      </ScrollView>
      <Animated.View
        style={[
          buttonAnimatedStyle,
          css`
            background-color: ${theme.bg.paper};
            padding: 24px;
            align-self: stretch;
            gap: 20px;
            border-top-left-radius: 16px;
            border-top-right-radius: 16px;
            align-items: center;
          `,
        ]}
      >
        {allowStudyInDetail && (
          <Button
            hapticFeedback={ImpactFeedbackStyle.Soft}
            onPress={handleStudyInDetail}
            text={
              aiUnavailable
                ? t('quizResult.searchOnWeb')
                : t('quizResult.studyInDetail')
            }
            borderRadius={24}
            disabled={isContinuePending}
            color="light"
            style={css`
              margin-top: 4px;
              max-width: 400px;
              width: 100%;
            `}
            styles={{
              container: css`
                padding: 8px 0;
                opacity: ${isContinuePending ? 0.7 : 1};
                background-color: ${theme.bg.basic};
              `,
              text: css`
                font-size: 16px;
                font-weight: bold;
              `,
            }}
          />
        )}
        <Typography.Body2
          style={css`
            font-weight: bold;
            text-align: center;
            max-width: 600px;
            font-size: 16px;
          `}
        >
          {quiz.answerDescription || ''}
        </Typography.Body2>
        <Button
          hapticFeedback={ImpactFeedbackStyle.Soft}
          onPress={onContinue}
          text={isLastQuestion ? t('common.complete') : t('common.nextQuestion')}
          borderRadius={12}
          disabled={isContinuePending}
          color={isCorrect ? 'success' : 'danger'}
          style={css`
            margin: 12px 8px 16px 8px;
            max-width: 400px;
            width: 80%;
          `}
          styles={{
            container: css`
              height: 60px;
              opacity: ${isContinuePending ? 0.7 : 1};
            `,
            text: css`
              font-size: 18px;
              font-weight: bold;
            `,
          }}
        />
      </Animated.View>
    </Container>
  );
}

const Container = styled.View`
  flex: 1;
`;

const Content = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 16px;
`;

export default ResultTablet;
