/**
 * @name QuizResultItem
 *
 * See the style guide: https://github.com/hyochan/style-guide/blob/main/docs/REACT.md
 */
import {styled, css} from 'kstyled';
import {StyleProp, ViewStyle} from 'react-native';
import {QuizResultWithDetails} from '../types';
import {Button, Typography, useCPK} from 'cpk-ui';
import {t} from '../STRINGS';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {useRouter} from 'expo-router';

type Props = {
  item: QuizResultWithDetails;
  style?: StyleProp<ViewStyle>;
};

export default function QuizResultItem({item, style}: Props): JSX.Element {
  const {theme} = useCPK();
  const {push} = useRouter();

  return (
    <Container style={style}>
      <Typography.Body3
        style={css`
          margin-bottom: 8px;
          color: ${item.quizStats.correct === 0
            ? theme.text.danger
            : theme.text.success};
          font-weight: bold;
        `}
      >
        {t('quizResult.correctnessWithAttempts', {
          corrects: item.quizStats.correct,
          attempts: item.quizStats.attempts,
        })}
      </Typography.Body3>
      <Typography.Body1
        style={css`
          font-weight: bold;
          margin-bottom: 15px;
        `}
      >
        {item.quizTitle}
      </Typography.Body1>
      <Button
        hapticFeedback={ImpactFeedbackStyle.Soft}
        onPress={() =>
          push({
            pathname: '/chat',
            params: {
              question: t('common.tellMeAboutQuestion', {
                question: item.quizTitle,
              }),
            },
          })
        }
        text={t('quizResult.studyInDetail')}
        styles={{
          container: css`
            background-color: ${theme.bg.basic};
            border-width: 0;
          `,
          text: css`
            font-weight: bold;
            font-size: 14px;
            color: ${theme.text.basic};
          `,
        }}
        borderRadius={16}
      />
    </Container>
  );
}
const Container = styled.View`
  background-color: ${({theme}) => theme.bg.paper};
  border-radius: 20px;
  padding: 16px 20px;
`;
