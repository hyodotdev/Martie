/**
 * @name QuizViewMobile
 *
 * 모바일 화면용 퀴즈 뷰 컴포넌트
 */
import {styled, css} from 'kstyled';
import {ScrollView, View} from 'react-native';
import Animated from 'react-native-reanimated';
import Bubble from '../Bubble/Bubble';
import {Image} from 'expo-image';
import {IC_MARTIE_BASIC} from '../../icons';
import {ImpactFeedbackStyle} from 'expo-haptics';
import ButtonMartie from '../ButtonMartie';
import {QuizViewUIProps} from './types';
import {QuizOptionWithDescription} from '../../types';
import {Typography, useCPK} from 'cpk-ui';
import {t} from '../../STRINGS';

function QuizViewMobile({
  quiz,
  onPressAnswer,
  isAnswerPending = false,
  bubbleAnimatedStyle,
  imageAnimatedStyle,
  buttonAnimatedStyle,
}: QuizViewUIProps): JSX.Element {
  const {theme} = useCPK();

  const handleAnswerPress = (option: QuizOptionWithDescription) => {
    if (!option) return;
    onPressAnswer(option);
  };

  return (
    <Container>
      <ContentArea>
        <Animated.View style={[bubbleAnimatedStyle]}>
          <Bubble
            text={quiz.description}
            style={css`
              margin-top: -28px;
            `}
            styles={{
              text: css`
                font-size: 16px;
                line-height: 22px;
              `,
            }}
          />
        </Animated.View>
        {quiz.creatorName && (
          <Typography.Body3
            numberOfLines={1}
            style={css`
              opacity: 0.6;
            `}
          >
            {t('quiz.createdBy', {name: quiz.creatorName})}
          </Typography.Body3>
        )}
        <Animated.View style={[imageAnimatedStyle]}>
          <Image
            source={IC_MARTIE_BASIC}
            style={css`
              width: 150px;
              height: 150px;
            `}
          />
        </Animated.View>
      </ContentArea>

      <Animated.View
        style={[
          buttonAnimatedStyle,
          css`
            background-color: ${theme.bg.basic};
            padding: 20px;
            align-self: stretch;
            border-top-left-radius: 16px;
            border-top-right-radius: 16px;
          `,
        ]}
      >
        <ScrollView>
          <View
            style={css`
              gap: 12px;
              padding: 16px 0;
            `}
          >
            {quiz.options?.map(
              (option: QuizOptionWithDescription, index: number) => (
                <ButtonMartie
                  hapticFeedback={ImpactFeedbackStyle.Soft}
                  key={index}
                  disabled={isAnswerPending}
                  onPress={() => option && handleAnswerPress(option)}
                  text={option?.description || ''}
                  borderRadius={12}
                  color="light"
                  styles={{
                    container: css`
                      min-height: 56px;
                      padding-top: 12px;
                      padding-bottom: 12px;
                    `,
                    text: css`
                      font-size: 16px;
                      text-align: center;
                    `,
                  }}
                />
              ),
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </Container>
  );
}

const Container = styled.View`
  flex: 1;
  justify-content: space-between;
`;

const ContentArea = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 16px;
`;

export default QuizViewMobile;
