import React from 'react';
import {Pressable, View} from 'react-native';
import {Typography} from 'cpk-ui';
import {styled, css} from 'kstyled';
import {t} from '../../STRINGS';
import ButtonMartie from '../ButtonMartie';
import {ImpactFeedbackStyle} from 'expo-haptics';

type Props = {
  pendingCount: number;
  onPress: () => void;
};

export default function ReviewCard({pendingCount, onPress}: Props): JSX.Element {
  if (pendingCount === 0) {
    const reviewEmptyLabel = t('discover.reviewEmpty');

    return (
      <Container
        accessible={true}
        accessibilityLabel={reviewEmptyLabel}
        accessibilityRole="text"
      >
        <View
          style={css`
            flex-direction: row;
            align-items: center;
            gap: 10px;
          `}
        >
          <EmojiText>✅</EmojiText>
          <Typography.Body2
            style={css`
              font-weight: 700;
            `}
          >
            {reviewEmptyLabel}
          </Typography.Body2>
        </View>
      </Container>
    );
  }

  const reviewTitleLabel = t('discover.reviewTitle');
  const reviewButtonLabel = t('discover.reviewButton');
  const reviewCountLabel = t('discover.reviewCount', {count: pendingCount});
  const reviewAccessibilityLabel = [
    reviewTitleLabel,
    reviewCountLabel,
    reviewButtonLabel,
  ].join(', ');

  return (
    <Pressable
      accessible={true}
      accessibilityLabel={reviewAccessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
    >
      <Container>
        <View
          style={css`
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          `}
        >
          <View
            style={css`
              flex-direction: row;
              align-items: center;
              gap: 10px;
            `}
          >
            <EmojiText>❌</EmojiText>
            <View style={css`gap: 2px;`}>
              <Typography.Body2
                style={css`
                  font-weight: 700;
                `}
              >
                {reviewTitleLabel}
              </Typography.Body2>
              <Typography.Body3
                style={css`
                  opacity: 0.6;
                `}
              >
                {reviewCountLabel}
              </Typography.Body3>
            </View>
          </View>
          <CountBadge>
            <Typography.Body3
              style={css`
                font-weight: 800;
                color: #ef4444;
              `}
            >
              {pendingCount}
            </Typography.Body3>
          </CountBadge>
        </View>
        <ButtonMartie
          hapticFeedback={ImpactFeedbackStyle.Soft}
          onPress={onPress}
          text={reviewButtonLabel}
          borderRadius={14}
          touchableHighlightProps={{
            accessible: false,
            accessibilityElementsHidden: true,
            importantForAccessibility: 'no-hide-descendants',
          }}
          styles={{
            container: css`
              height: 44px;
              border-width: 0;
            `,
            text: css`
              font-size: 15px;
              font-weight: 700;
            `,
          }}
        />
      </Container>
    </Pressable>
  );
}

const Container = styled.View`
  padding: 16px;
  background-color: ${({theme}) => theme.bg.paper};
  border-radius: 16px;
  margin: 0 16px;
  gap: 12px;
`;

const EmojiText = styled.Text`
  font-size: 22px;
`;

const CountBadge = styled.View`
  background-color: #fef2f2;
  padding: 4px 12px;
  border-radius: 12px;
`;
