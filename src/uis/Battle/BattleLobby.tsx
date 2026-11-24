import {Typography, useCPK} from 'cpk-ui';
import {styled, css} from 'kstyled';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {
  BATTLE_PRESENCE_STALE_MS,
  BATTLE_STAKE_BULBS,
  type BattleRole,
} from '../../../convex/battle/logic';
import {t} from '../../STRINGS';
import {isSeenRecently} from '../../utils/battle';
import {useNow} from '../../hooks/useBattleCountdown';
import ButtonMartie from '../ButtonMartie';
import {MartieHost, PlayerAvatar, RIVAL_COLOR} from './BattleParts';
import type {BattlePlayer, BattleRoom} from './types';

const PRESENCE_REFRESH_MS = 5000;

type Props = {
  room: BattleRoom;
  myRole: BattleRole;
  offsetMs: number;
  isBusy: boolean;
  onReady: (ready: boolean) => void;
  onShare: () => void;
};

function PlayerSlot({
  player,
  isMe,
  isHost,
  offsetMs,
  now,
}: {
  player: BattlePlayer | null;
  isMe: boolean;
  isHost: boolean;
  offsetMs: number;
  now: number;
}): JSX.Element {
  const {theme} = useCPK();
  const color = isMe ? theme.role.primary : RIVAL_COLOR;
  if (!player) {
    return (
      <Slot accessibilityLabel={t('battle.emptySeat')}>
        <EmptyAvatar />
        <Typography.Body3
          style={css`
            color: ${theme.text.placeholder};
          `}
        >
          {t('battle.emptySeat')}
        </Typography.Body3>
      </Slot>
    );
  }

  const online = isSeenRecently(
    player.seenAt,
    now,
    offsetMs,
    BATTLE_PRESENCE_STALE_MS,
  );
  const status = !online
    ? t('battle.offline')
    : player.ready
      ? t('battle.isReady')
      : t('battle.notReady');
  const name = isMe ? `${player.displayName} (${t('battle.me')})` : player.displayName;

  return (
    <Slot
      accessibilityLabel={[name, isHost ? t('battle.host') : '', status].filter(Boolean).join(', ')}
      style={css`
        border-color: ${player.ready && online ? color : theme.role.border};
        background-color: ${player.ready && online ? color + '14' : theme.bg.paper};
      `}
    >
      <PlayerAvatar player={player} size={60} ringColor={color} />
      <Typography.Body2
        numberOfLines={1}
        style={css`
          font-weight: 700;
        `}
      >
        {name}
      </Typography.Body2>
      {isHost ? (
        <Typography.Body4
          style={css`
            opacity: 0.6;
          `}
        >
          👑 {t('battle.host')}
        </Typography.Body4>
      ) : null}
      <StatusPill
        style={css`
          background-color: ${!online
            ? theme.text.placeholder
            : player.ready
              ? color
              : theme.role.border};
        `}
      >
        <Typography.Body4
          style={css`
            font-weight: 800;
            color: ${!online || player.ready ? '#FFFFFF' : theme.text.basic};
          `}
        >
          {player.ready && online ? '✓ ' : ''}
          {status}
        </Typography.Body4>
      </StatusPill>
    </Slot>
  );
}

export default function BattleLobby({
  room,
  myRole,
  offsetMs,
  isBusy,
  onReady,
  onShare,
}: Props): JSX.Element {
  const now = useNow(PRESENCE_REFRESH_MS);
  const me = myRole === 'host' ? room.host : room.guest;
  const opponent = myRole === 'host' ? room.guest : room.host;
  const hasOpponent = room.guest !== null;
  const mc = !hasOpponent
    ? t('battle.mcWaiting')
    : me?.ready && !opponent?.ready
      ? t('battle.mcWaitingReady', {name: opponent?.displayName ?? ''})
      : t('battle.mcReady');

  return (
    <Container>
      <MartieHost mood={hasOpponent ? 'smile' : 'basic'} message={mc} size={80} />
      <SlotsRow>
        <PlayerSlot
          player={room.host}
          isMe={myRole === 'host'}
          isHost
          offsetMs={offsetMs}
          now={now}
        />
        <VsBadge>
          <Typography.Body2
            style={css`
              color: #ffffff;
              font-weight: 900;
            `}
          >
            VS
          </Typography.Body2>
        </VsBadge>
        <PlayerSlot
          player={room.guest}
          isMe={myRole === 'guest'}
          isHost={false}
          offsetMs={offsetMs}
          now={now}
        />
      </SlotsRow>

      {hasOpponent ? (
        <Typography.Body3
          style={css`
            text-align: center;
            opacity: 0.7;
          `}
        >
          {t('battle.readyHint', {stake: BATTLE_STAKE_BULBS})}
        </Typography.Body3>
      ) : null}

      {hasOpponent ? (
        <ButtonMartie
          hapticFeedback={ImpactFeedbackStyle.Medium}
          disabled={isBusy}
          loading={isBusy}
          onPress={() => onReady(!me?.ready)}
          text={me?.ready ? t('battle.unready') : t('battle.ready')}
          borderRadius={14}
          color={me?.ready ? 'light' : 'primary'}
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
      ) : null}

      {myRole === 'host' ? (
        <ButtonMartie
          hapticFeedback={ImpactFeedbackStyle.Light}
          onPress={onShare}
          text={t('battle.invite')}
          borderRadius={14}
          color={hasOpponent ? 'light' : 'primary'}
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
      ) : null}
    </Container>
  );
}

const Container = styled.View`
  padding: 24px 20px;
  gap: 20px;
`;

const SlotsRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
`;

const VsBadge = styled.View`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  align-items: center;
  justify-content: center;
  background-color: ${({theme}) => theme.text.basic};
  margin: 0 -14px;
  z-index: 1;
`;

const StatusPill = styled.View`
  padding: 4px 10px;
  border-radius: 12px;
`;

const Slot = styled.View`
  flex: 1;
  align-items: center;
  gap: 6px;
  padding: 18px 8px;
  border-radius: 20px;
  border-width: 2px;
  border-color: ${({theme}) => theme.role.border};
  background-color: ${({theme}) => theme.bg.paper};
`;

const EmptyAvatar = styled.View`
  width: 66px;
  height: 66px;
  border-radius: 33px;
  border-width: 2px;
  border-style: dashed;
  border-color: ${({theme}) => theme.role.border};
`;
