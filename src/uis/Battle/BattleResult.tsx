import {Typography, useCPK} from 'cpk-ui';
import {styled, css} from 'kstyled';
import {
  BATTLE_STAKE_BULBS,
  otherRole,
  type BattleRole,
} from '../../../convex/battle/logic';
import {t} from '../../STRINGS';
import {HeadToHead, MartieHost, PlayerAvatar, RIVAL_COLOR} from './BattleParts';
import {Burst, CREAM, INK, SUN, Sticker, StickerButton} from './Sticker';
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
  // A win gets the bulb's gold; a loss a cool wash of the rival's indigo.
  const burstColor =
    result === 'win' ? SUN : result === 'loss' ? '#DCDEF2' : CREAM;

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

      <Sticker offset={3} radius={24} faceStyle={{backgroundColor: '#FFF1C9'}}>
        <HeroBody>
          <Burst size={170} color={burstColor}>
            <Typography.Heading1
              accessibilityLiveRegion="polite"
              style={[
                css`
                  color: ${INK};
                  font-size: 36px;
                  line-height: 44px;
                  font-weight: 900;
                  text-align: center;
                `,
                {transform: [{rotate: '-6deg'}]},
              ]}
            >
              {result === 'win'
                ? t('battle.win')
                : result === 'loss'
                  ? t('battle.loss')
                  : t('battle.draw')}
            </Typography.Heading1>
          </Burst>
          <Typography.Body1
            style={css`
              color: ${INK};
              text-align: center;
              font-weight: 800;
            `}
          >
            {headline}
          </Typography.Body1>
          <Sticker
            offset={2}
            radius={12}
            style={{transform: [{rotate: '-3deg'}]}}
            faceStyle={{
              borderWidth: 1.5,
              paddingHorizontal: 14,
              paddingVertical: 4,
              backgroundColor: CREAM,
            }}
          >
            <Typography.Body2
              style={css`
                color: ${INK};
                font-weight: 900;
              `}
            >
              💡 {bulbDelta}
            </Typography.Body2>
          </Sticker>
        </HeroBody>
      </Sticker>
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

      <Sticker offset={3} radius={18}>
        <ScoreBody
          accessibilityLabel={t('battle.score', {
            mine: myScore,
            theirs: opponentScore,
          })}
        >
          <PlayerColumn>
            {me ? (
              <PlayerAvatar player={me} size={52} ringColor={theme.role.primary} />
            ) : null}
            <Typography.Body4
              numberOfLines={1}
              style={css`
                color: ${INK};
                font-weight: 800;
              `}
            >
              {t('battle.me')}
            </Typography.Body4>
          </PlayerColumn>
          <Typography.Heading1
            style={css`
              color: ${INK};
              font-weight: 900;
            `}
          >
            {t('battle.score', {mine: myScore, theirs: opponentScore})}
          </Typography.Heading1>
          <PlayerColumn>
            {opponent ? (
              <PlayerAvatar player={opponent} size={52} ringColor={RIVAL_COLOR} />
            ) : null}
            <Typography.Body4
              numberOfLines={1}
              style={css`
                color: ${INK};
                font-weight: 800;
              `}
            >
              {opponent?.displayName ?? ''}
            </Typography.Body4>
          </PlayerColumn>
        </ScoreBody>
      </Sticker>
      {room.headToHead && opponent ? (
        <HeadToHead record={room.headToHead} opponentName={opponent.displayName} />
      ) : null}

      {room.rematchCode ? (
        <StickerButton
          text={t('battle.joinRematch')}
          disabled={isBusy}
          onPress={() => room.rematchCode && onJoinRematch(room.rematchCode)}
          color={theme.role.primary}
        />
      ) : (
        <StickerButton
          text={t('battle.rematch')}
          loading={isBusy}
          onPress={onRematch}
          color={theme.role.primary}
        />
      )}
      <StickerButton
        text={t('battle.goHome')}
        onPress={onHome}
        color={CREAM}
        textColor={INK}
      />
    </Container>
  );
}

const Container = styled.View`
  padding: 24px 20px 32px;
  gap: 16px;
`;

const HeroBody = styled.View`
  align-items: center;
  gap: 10px;
  padding: 12px 16px 20px;
`;

const PlayerColumn = styled.View`
  width: 84px;
  align-items: center;
  gap: 6px;
`;

const ScoreBody = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
  padding: 18px;
`;
