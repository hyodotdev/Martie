import {View} from 'react-native';
import {Typography, useCPK} from 'cpk-ui';
import {styled, css} from 'kstyled';
import {
  winRate,
  type BattleRecord,
  type BattleStatsRecord,
} from '../../../convex/battle/logic';
import {t} from '../../STRINGS';

/** "12W 3L 1D" in the reader's language. */
export function recordText(record: BattleRecord): string {
  return t('battle.recordShort', {
    wins: record.wins,
    losses: record.losses,
    draws: record.draws,
  });
}

/** My lifetime 1:1 record, shown on the battle hub. */
export default function BattleRecordCard({
  stats,
}: {
  stats: BattleStatsRecord;
}): JSX.Element {
  const {theme} = useCPK();
  const rate = winRate(stats);
  const columns = [
    {label: t('battle.winsLabel'), value: stats.wins, color: theme.role.success},
    {label: t('battle.lossesLabel'), value: stats.losses, color: theme.role.danger},
    {label: t('battle.drawsLabel'), value: stats.draws, color: theme.text.label},
  ];

  return (
    <Card
      accessibilityLabel={[
        t('battle.myRecord'),
        recordText(stats),
        rate === null ? '' : t('battle.winRate', {rate}),
      ]
        .filter(Boolean)
        .join(', ')}
    >
      <Header>
        <Typography.Heading5
          style={css`
            font-weight: 800;
          `}
        >
          🏆 {t('battle.myRecord')}
        </Typography.Heading5>
        <Typography.Body3
          style={css`
            font-weight: 800;
            color: ${theme.role.primary};
          `}
        >
          {rate === null ? '—' : t('battle.winRate', {rate})}
        </Typography.Body3>
      </Header>

      <Columns>
        {columns.map((column) => (
          <View
            key={column.label}
            style={css`
              flex: 1;
              align-items: center;
              gap: 2px;
            `}
          >
            <Typography.Heading2
              style={css`
                font-weight: 900;
                color: ${column.color};
              `}
            >
              {column.value}
            </Typography.Heading2>
            <Typography.Body4
              style={css`
                font-weight: 700;
                opacity: 0.6;
              `}
            >
              {column.label}
            </Typography.Body4>
          </View>
        ))}
      </Columns>

      {stats.streak > 1 || stats.bestStreak > 1 ? (
        <StreakRow>
          {stats.streak > 1 ? (
            <Chip
              style={css`
                background-color: ${theme.role.primary};
              `}
            >
              <Typography.Body4
                style={css`
                  color: #ffffff;
                  font-weight: 800;
                `}
              >
                🔥 {t('battle.streak', {count: stats.streak})}
              </Typography.Body4>
            </Chip>
          ) : null}
          {stats.bestStreak > 1 ? (
            <Chip
              style={css`
                background-color: ${theme.bg.basic};
              `}
            >
              <Typography.Body4
                style={css`
                  font-weight: 800;
                `}
              >
                {t('battle.bestStreak', {count: stats.bestStreak})}
              </Typography.Body4>
            </Chip>
          ) : null}
        </StreakRow>
      ) : null}
    </Card>
  );
}

const Card = styled.View`
  padding: 18px 20px;
  gap: 14px;
  border-radius: 20px;
  background-color: ${({theme}) => theme.bg.paper};
`;

const Header = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const Columns = styled.View`
  flex-direction: row;
`;

const StreakRow = styled.View`
  flex-direction: row;
  justify-content: center;
  gap: 8px;
`;

const Chip = styled.View`
  padding: 5px 12px;
  border-radius: 12px;
`;
