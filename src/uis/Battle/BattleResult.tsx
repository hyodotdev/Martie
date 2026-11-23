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
import {PlayerAvatar} from './BattleLobby';
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

  return (
    <Container>
      <Typography.Heading2
        accessibilityLiveRegion="polite"
        style={css`
          text-align: center;
          font-weight: 900;
          color: ${color};
        `}
      >
        {result === 'win'
          ? t('battle.win')
          : result === 'loss'
            ? t('battle.loss')
            : t('battle.draw')}
      </Typography.Heading2>
      <Typography.Body1
        style={css`
          text-align: center;
          font-weight: 700;
        `}
      >
        {headline}
      </Typography.Body1>
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
        {me ? <PlayerAvatar player={me} size={48} /> : null}
        <Typography.Heading1
          style={css`
            font-weight: 900;
          `}
        >
          {t('battle.score', {mine: myScore, theirs: opponentScore})}
        </Typography.Heading1>
        {opponent ? <PlayerAvatar player={opponent} size={48} /> : null}
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
  padding: 32px 20px;
  gap: 16px;
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
