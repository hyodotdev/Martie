import {Typography, useCPK} from 'cpk-ui';
import {styled, css} from 'kstyled';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {
  BATTLE_STAKE_BULBS,
  otherRole,
  type BattleRole,
} from '../../../convex/battle/logic';
import {t} from '../../STRINGS';
import ButtonMartie from '../ButtonMartie';
import {MartieHost, PlayerAvatar, RIVAL_COLOR} from './BattleParts';
import type {BattleRoom} from './types';

type Props = {
  room: BattleRoom;
  myRole: BattleRole;
  isBusy: boolean;
  onRematch: () => void;
  onJoinRematch: (code: string) => void;
  onHome: () => void;
};

export type MyResult = 'win' | 'loss' | 'draw';

export function myResult(
  outcome: BattleRoom['outcome'],
  myRole: BattleRole,
): MyResult {
  if (outcome === 'draw' || outcome === null) return 'draw';
  return outcome === myRole ? 'win' : 'loss';
}

export default function BattleResult({
  room,
  myRole,
  isBusy,
  onRematch,
  onJoinRematch,
  onHome,
}: Props): JSX.Element {
  const {theme} = useCPK();
  const result = myResult(room.outcome, myRole);
  const me = myRole === 'host' ? room.host : room.guest;
  const opponent = myRole === 'host' ? room.guest : room.host;
  const myScore = myRole === 'host' ? room.hostScore : room.guestScore;
  const opponentScore = myRole === 'host' ? room.guestScore : room.hostScore;
  const opponentLeft =
    room.endReason === 'forfeit' && room.forfeitedBy === otherRole(myRole);

  const headline =
    result === 'win'
      ? t('battle.resultWin', {count: BATTLE_STAKE_BULBS * 2})
      : result === 'loss'
        ? t('battle.resultLoss')
        : t('battle.resultDraw');
  const color =
    result === 'win'
      ? theme.role.success
      : result === 'loss'
        ? theme.role.danger
        : theme.text.label;

  const mood = result === 'win' ? 'smile' : result === 'loss' ? 'sweat' : 'impressed';
  const mc =
    result === 'win'
      ? t('battle.mcWin')
      : result === 'loss'
        ? t('battle.mcLoss')
        : t('battle.mcDraw');
  const bulbDelta =
    result === 'win'
      ? `+${BATTLE_STAKE_BULBS * 2}`
      : result === 'draw'
        ? `+${BATTLE_STAKE_BULBS}`
        : '0';

  return (
    <Container>
      <MartieHost mood={mood} message={mc} size={96} />

      <Hero
        style={css`
          background-color: ${color + '14'};
          border-color: ${color};
        `}
      >
        <Typography.Heading1
          accessibilityLiveRegion="polite"
          style={css`
            text-align: center;
            font-size: 44px;
            line-height: 52px;
            font-weight: 900;
            color: ${color};
          `}
        >
          {result === 'win'
            ? t('battle.win')
            : result === 'loss'
              ? t('battle.loss')
              : t('battle.draw')}
        </Typography.Heading1>
        <Typography.Body1
          style={css`
            text-align: center;
            font-weight: 700;
          `}
        >
          {headline}
        </Typography.Body1>
        <BulbChip>
          <Typography.Body2
            style={css`
              font-weight: 900;
            `}
          >
            💡 {bulbDelta}
          </Typography.Body2>
        </BulbChip>
      </Hero>
      {result !== 'draw' && !opponentLeft && myScore === opponentScore ? (
        <Typography.Body3
          style={css`
            text-align: center;
            opacity: 0.7;
          `}
        >
          {t('battle.tieBreak')}
        </Typography.Body3>
      ) : null}
      {opponentLeft ? (
        <Typography.Body3
          style={css`
            text-align: center;
            opacity: 0.7;
          `}
        >
          {t('battle.opponentLeft', {name: opponent?.displayName ?? ''})}
        </Typography.Body3>
      ) : null}

      <ScoreCard
        accessibilityLabel={t('battle.score', {
          mine: myScore,
          theirs: opponentScore,
        })}
      >
        <PlayerColumn>
          {me ? (
            <PlayerAvatar player={me} size={52} ringColor={theme.role.primary} />
          ) : null}
          <Typography.Body4 numberOfLines={1} style={css`font-weight: 700;`}>
            {t('battle.me')}
          </Typography.Body4>
        </PlayerColumn>
        <Typography.Heading1
          style={css`
            font-weight: 900;
          `}
        >
          {t('battle.score', {mine: myScore, theirs: opponentScore})}
        </Typography.Heading1>
        <PlayerColumn>
          {opponent ? (
            <PlayerAvatar player={opponent} size={52} ringColor={RIVAL_COLOR} />
          ) : null}
          <Typography.Body4 numberOfLines={1} style={css`font-weight: 700;`}>
            {opponent?.displayName ?? ''}
          </Typography.Body4>
        </PlayerColumn>
      </ScoreCard>

      {room.rematchCode ? (
        <ButtonMartie
          hapticFeedback={ImpactFeedbackStyle.Medium}
          disabled={isBusy}
          onPress={() => room.rematchCode && onJoinRematch(room.rematchCode)}
          text={t('battle.joinRematch')}
          borderRadius={14}
          styles={{
            container: css`
              height: 52px;
              border-width: 0;
            `,
            text: css`
              font-size: 16px;
              font-weight: 800;
            `,
          }}
        />
      ) : (
        <ButtonMartie
          hapticFeedback={ImpactFeedbackStyle.Medium}
          disabled={isBusy}
          loading={isBusy}
          onPress={onRematch}
          text={t('battle.rematch')}
          borderRadius={14}
          styles={{
            container: css`
              height: 52px;
              border-width: 0;
            `,
            text: css`
              font-size: 16px;
              font-weight: 800;
            `,
          }}
        />
      )}
      <ButtonMartie
        onPress={onHome}
        text={t('battle.goHome')}
        borderRadius={14}
        color="light"
        styles={{
          container: css`
            height: 48px;
            border-width: 0;
          `,
          text: css`
            font-size: 15px;
            font-weight: 700;
          `,
        }}
      />
    </Container>
  );
}

const Container = styled.View`
  padding: 24px 20px 32px;
  gap: 16px;
`;

const Hero = styled.View`
  align-items: center;
  gap: 8px;
  padding: 22px 16px;
  border-radius: 24px;
  border-width: 2px;
`;

const BulbChip = styled.View`
  padding: 6px 14px;
  border-radius: 14px;
  background-color: ${({theme}) => theme.bg.basic};
`;

const PlayerColumn = styled.View`
  width: 84px;
  align-items: center;
  gap: 6px;
`;

const ScoreCard = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
  padding: 20px;
  border-radius: 16px;
  background-color: ${({theme}) => theme.bg.paper};
  border-width: 1px;
  border-color: ${({theme}) => theme.role.border};
`;
