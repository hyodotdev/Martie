import React from 'react';
import {Pressable, View} from 'react-native';
import {Typography, useCPK} from 'cpk-ui';
import {styled, css} from 'kstyled';
import {t} from '../../STRINGS';
import ButtonMartie from '../ButtonMartie';
import {ImpactFeedbackStyle} from 'expo-haptics';

type UserResult = {
  quizId: string;
  isCorrect: boolean;
};

type Props = {
  categoryName: string | null;
  isCompleted: boolean;
  userResults: UserResult[];
  challengeNumber: number;
  onPress: () => void;
  onShare: () => void;
};

export default function DailyChallengeCard({
  categoryName,
  isCompleted,
  userResults,
  challengeNumber,
  onPress,
  onShare,
}: Props): JSX.Element {
  const {theme} = useCPK();
  const correctCount = userResults.filter((r) => r.isCorrect).length;

  if (isCompleted) {
    return (
      <Container>
        <HeaderRow>
          <Typography.Body2
            style={css`
              font-weight: 700;
              color: ${theme.role.success};
            `}
          >
            ✅ {t('daily.completed')}
          </Typography.Body2>
          <NumberBadge>
            <NumberText>#{challengeNumber}</NumberText>
          </NumberBadge>
        </HeaderRow>
        <EmojiRow>
          <View
            style={css`
              flex-direction: row;
              gap: 6px;
            `}
          >
            {userResults.map((r) => (
              <View
                key={r.quizId}
                style={css`
                  width: 28px;
                  height: 28px;
                  border-radius: 6px;
                  border-width: 2px;
                  border-color: ${r.isCorrect
                    ? theme.role.success
                    : theme.role.danger};
                  background-color: ${r.isCorrect
                    ? theme.role.success + '1A'
                    : theme.role.danger + '1A'};
                  align-items: center;
                  justify-content: center;
                `}
              >
                <Typography.Body4
                  style={css`
                    font-size: 14px;
                    font-weight: 800;
                    color: ${r.isCorrect
                      ? theme.role.success
                      : theme.role.danger};
                  `}
                >
                  {r.isCorrect ? '✓' : '✗'}
                </Typography.Body4>
              </View>
            ))}
          </View>
          <Typography.Heading5>
            {t('daily.correctCount', {
              correct: correctCount,
              total: userResults.length,
            })}
          </Typography.Heading5>
        </EmojiRow>
        <ButtonMartie
          hapticFeedback={ImpactFeedbackStyle.Light}
          onPress={onShare}
          text={t('daily.shareResult')}
          borderRadius={20}
          color="light"
          styles={{
            container: css`
              height: 44px;
              border-width: 0;
              background-color: ${theme.bg.basic};
            `,
            text: css`
              font-size: 14px;
              font-weight: 700;
            `,
          }}
        />
      </Container>
    );
  }

  return (
    <Pressable
      accessibilityLabel={[
        t('daily.title'),
        `#${challengeNumber}`,
        categoryName,
        t('daily.questionsCount', {count: 5}),
      ]
        .filter((part): part is string => Boolean(part))
        .join(', ')}
      accessibilityRole="button"
      onPress={onPress}
    >
      <HeroContainer>
        <HeaderRow>
          <View
            style={css`
              gap: 4px;
            `}
          >
            <Typography.Heading5
              style={css`
                font-weight: 800;
              `}
            >
              {t('daily.title')}
            </Typography.Heading5>
            {categoryName && (
              <CategoryRow>
                <CategoryDot />
                <Typography.Body3
                  numberOfLines={1}
                  style={css`
                    opacity: 0.7;
                    flex-shrink: 1;
                  `}
                >
                  {categoryName} · {t('daily.questionsCount', {count: 5})}
                </Typography.Body3>
              </CategoryRow>
            )}
          </View>
          <NumberBadge>
            <NumberText>#{challengeNumber}</NumberText>
          </NumberBadge>
        </HeaderRow>
        <ButtonMartie
          hapticFeedback={ImpactFeedbackStyle.Soft}
          onPress={onPress}
          text={t('daily.tryNow')}
          borderRadius={14}
          styles={{
            container: css`
              height: 50px;
              border-width: 0;
            `,
            text: css`
              font-size: 16px;
              font-weight: 800;
              letter-spacing: 0.5px;
            `,
          }}
        />
      </HeroContainer>
    </Pressable>
  );
}

export function DailyChallengeCardSkeleton(): JSX.Element {
  return (
    <HeroContainer>
      <HeaderRow>
        <View
          style={css`
            flex: 1;
            gap: 8px;
          `}
        >
          <SkeletonLine $width={54} $height={20} />
          <SkeletonLine $width={76} $height={14} />
        </View>
        <SkeletonBadge />
      </HeaderRow>
      <SkeletonButton />
    </HeroContainer>
  );
}

const Container = styled.View`
  padding: 16px;
  background-color: ${({theme}) => theme.bg.paper};
  border-radius: 16px;
  margin: 0 16px;
  gap: 14px;
  border-width: 1px;
  border-color: ${({theme}) => theme.role.border};
`;

const HeroContainer = styled.View`
  padding: 20px;
  background-color: ${({theme}) => theme.bg.paper};
  border-radius: 16px;
  margin: 0 16px;
  gap: 16px;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.06;
  shadow-radius: 8px;
  elevation: 3;
  border-width: 1px;
  border-color: ${({theme}) => theme.role.border};
`;

const HeaderRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
`;

const CategoryRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 6px;
`;

const CategoryDot = styled.View`
  width: 6px;
  height: 6px;
  border-radius: 3px;
  background-color: ${({theme}) => theme.role.primary};
`;

const NumberBadge = styled.View`
  background-color: ${({theme}) => theme.bg.basic};
  border-width: 1px;
  border-color: ${({theme}) => theme.role.border};
  padding: 4px 10px;
  border-radius: 12px;
`;

const NumberText = styled.Text`
  color: ${({theme}) => theme.text.label};
  font-size: 12px;
  font-weight: 700;
`;

const EmojiRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 14px;
`;

const SkeletonLine = styled.View<{$width: number; $height: number}>`
  width: ${({$width}) => `${$width}%`};
  height: ${({$height}) => `${$height}px`};
  border-radius: 999px;
  background-color: ${({theme}) => theme.role.border};
  opacity: 0.9;
`;

const SkeletonBadge = styled.View`
  width: 54px;
  height: 30px;
  border-radius: 999px;
  background-color: ${({theme}) => theme.role.border};
`;

const SkeletonButton = styled.View`
  height: 50px;
  border-radius: 14px;
  background-color: ${({theme}) => `${theme.role.primary}24`};
`;
