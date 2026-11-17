import React from 'react';
import {Typography} from 'cpk-ui';
import {styled, css} from 'kstyled';
import {t} from '../../STRINGS';

type Props = {
  currentStreak: number;
  bulbCount: number;
  isBulbLoading?: boolean;
  isStreakLoading?: boolean;
};

export default function DailyStreakBanner({
  currentStreak,
  bulbCount,
  isBulbLoading = false,
  isStreakLoading = false,
}: Props): JSX.Element {
  return (
    <Container>
      <Chip>
        <ChipEmoji>
          {isStreakLoading || currentStreak > 0 ? '🔥' : '💤'}
        </ChipEmoji>
        <Typography.Body3
          style={css`
            font-weight: 700;
          `}
        >
          {isStreakLoading
            ? '...'
            : currentStreak > 0
              ? t('daily.streak', {count: currentStreak})
              : t('daily.streak', {count: 0})}
        </Typography.Body3>
      </Chip>
      <Chip>
        <ChipEmoji>💡</ChipEmoji>
        <Typography.Body3
          style={css`
            font-weight: 700;
          `}
        >
          {isBulbLoading ? '...' : bulbCount}
        </Typography.Body3>
      </Chip>
    </Container>
  );
}

const Container = styled.View`
  flex-direction: row;
  gap: 8px;
  margin: 0 16px;
`;

const Chip = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background-color: ${({theme}) => theme.bg.paper};
  border-width: 1px;
  border-color: ${({theme}) => theme.role.border};
  border-radius: 20px;
`;

const ChipEmoji = styled.Text`
  font-size: 16px;
`;
