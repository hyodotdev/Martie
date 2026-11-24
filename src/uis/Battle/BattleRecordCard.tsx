import {View} from 'react-native';
import {Typography, useCPK} from 'cpk-ui';
import {styled, css} from 'kstyled';
import {
  winRate,
  type BattleRecord,
  type BattleStatsRecord,
} from '../../../convex/battle/logic';
import {t} from '../../STRINGS';
import {CREAM, INK, Sticker} from './Sticker';

/** "12W 3L 1D" in the reader's language. */
export function recordText(record: BattleRecord): string {
  return t('battle.recordShort', {
    wins: record.wins,
    losses: record.losses,
    draws: record.draws,
  });
}

/** Wins, losses and draws side by side in their result colors. */
export function RecordColumns({
  record,
  ink,
}: {
  record: BattleRecord;
  // Fixed text color for cards that keep their own palette in dark mode.
  ink?: string;
}): JSX.Element {
  const {theme} = useCPK();
  const columns = [
    {label: t('battle.winsLabel'), value: record.wins, color: theme.role.success},
    {label: t('battle.lossesLabel'), value: record.losses, color: theme.role.danger},
    {label: t('battle.drawsLabel'), value: record.draws, color: ink ?? theme.text.label},
  ];
  return (
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
            style={[
              css`
                font-weight: 700;
                opacity: 0.6;
              `,
              ink ? {color: ink} : null,
            ]}
          >
            {column.label}
          </Typography.Body4>
        </View>
      ))}
    </Columns>
  );
}

/** Wins, draws and losses as one inked bar, so the balance reads at a glance. */
function ResultBar({record}: {record: BattleRecord}): JSX.Element {
  const {theme} = useCPK();
  const segments = [
    {key: 'wins', count: record.wins, color: theme.role.success},
    {key: 'draws', count: record.draws, color: '#C9C3B3'},
    {key: 'losses', count: record.losses, color: theme.role.danger},
  ].filter((segment) => segment.count > 0);
  return (
    <Bar>
      {segments.map((segment) => (
        <View
          key={segment.key}
          style={{flex: segment.count, backgroundColor: segment.color}}
        />
      ))}
    </Bar>
  );
}

/** My lifetime 1:1 record: the first thing on the battle hub. */
export default function BattleRecordCard({
  stats,
}: {
  stats: BattleStatsRecord;
}): JSX.Element {
  const {theme} = useCPK();
  const rate = winRate(stats);
  const played = stats.wins + stats.losses + stats.draws;

  return (
    <Sticker offset={3} radius={22} faceStyle={{backgroundColor: ARENA_BG}}>
      <Body
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
              color: ${INK};
              font-weight: 900;
            `}
          >
            🏆 {t('battle.myRecord')}
          </Typography.Heading5>
          {rate === null ? null : (
            // The win rate is stamped on, slightly crooked.
            <Stamp
              style={{
                backgroundColor: theme.role.primary,
                transform: [{rotate: '4deg'}],
              }}
            >
              <Typography.Body3
                style={css`
                  color: #ffffff;
                  font-weight: 900;
                `}
              >
                {t('battle.winRate', {rate})}
              </Typography.Body3>
            </Stamp>
          )}
        </Header>

        <RecordColumns record={stats} ink={INK} />
        {played > 0 ? <ResultBar record={stats} /> : null}

        <StreakRow>
          {stats.streak > 1 ? (
            <Stamp
              style={{
                backgroundColor: theme.role.primary,
                transform: [{rotate: '-3deg'}],
              }}
            >
              <Typography.Body4
                style={css`
                  color: #ffffff;
                  font-weight: 900;
                `}
              >
                🔥 {t('battle.streak', {count: stats.streak})}
              </Typography.Body4>
            </Stamp>
          ) : null}
          {stats.bestStreak > 1 ? (
            <Stamp style={{backgroundColor: CREAM}}>
              <Typography.Body4
                style={css`
                  color: ${INK};
                  font-weight: 800;
                `}
              >
                {t('battle.bestStreak', {count: stats.bestStreak})}
              </Typography.Body4>
            </Stamp>
          ) : null}
          <Stamp style={{backgroundColor: CREAM}}>
            <Typography.Body4
              style={css`
                color: ${INK};
                font-weight: 800;
              `}
            >
              {t('battle.totalGames', {count: played})}
            </Typography.Body4>
          </Stamp>
        </StreakRow>
      </Body>
    </Sticker>
  );
}

const ARENA_BG = '#FFF1C9';

const Body = styled.View`
  padding: 16px 18px 18px;
  gap: 14px;
`;

const Header = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const Columns = styled.View`
  flex-direction: row;
`;

const Bar = styled.View`
  flex-direction: row;
  height: 16px;
  overflow: hidden;
  border-radius: 9px;
  border-width: 1.5px;
  border-color: ${INK};
  background-color: ${CREAM};
`;

const StreakRow = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
`;

const Stamp = styled.View`
  padding: 4px 12px;
  border-radius: 10px;
  border-width: 1.5px;
  border-color: ${INK};
`;
