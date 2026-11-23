import {Image, View} from 'react-native';
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

export function PlayerAvatar({
  player,
  size = 56,
}: {
  player: BattlePlayer;
  size?: number;
}): JSX.Element {
  const {theme} = useCPK();
  if (player.avatarUrl) {
    return (
      <Image
        accessibilityIgnoresInvertColors
        source={{uri: player.avatarUrl}}
        style={{width: size, height: size, borderRadius: size / 2}}
      />
    );
  }
  return (
    <View
      style={css`
        width: ${size}px;
        height: ${size}px;
        border-radius: ${size / 2}px;
        background-color: ${theme.role.primary + '26'};
        align-items: center;
        justify-content: center;
      `}
    >
      <Typography.Heading4
        style={css`
          color: ${theme.role.primary};
          font-weight: 800;
        `}
      >
        {player.displayName.slice(0, 1).toUpperCase() || '?'}
      </Typography.Heading4>
    </View>
  );
}

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
    <Slot accessibilityLabel={[name, isHost ? t('battle.host') : '', status].filter(Boolean).join(', ')}>
      <PlayerAvatar player={player} />
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
          {t('battle.host')}
        </Typography.Body4>
      ) : null}
      <Typography.Body3
        style={css`
          font-weight: 700;
          color: ${!online
            ? theme.text.placeholder
            : player.ready
              ? theme.role.success
              : theme.text.label};
        `}
      >
        {status}
      </Typography.Body3>
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
  const hasOpponent = room.guest !== null;

  return (
    <Container>
      <SlotsRow>
        <PlayerSlot
          player={room.host}
          isMe={myRole === 'host'}
          isHost
          offsetMs={offsetMs}
          now={now}
        />
        <Typography.Heading3
          style={css`
            font-weight: 900;
          `}
        >
          VS
        </Typography.Heading3>
        <PlayerSlot
          player={room.guest}
          isMe={myRole === 'guest'}
          isHost={false}
          offsetMs={offsetMs}
          now={now}
        />
      </SlotsRow>

      <Typography.Body3
        style={css`
          text-align: center;
          opacity: 0.7;
        `}
      >
        {hasOpponent
          ? t('battle.readyHint', {stake: BATTLE_STAKE_BULBS})
          : t('battle.waitingForOpponent')}
      </Typography.Body3>

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
  gap: 8px;
`;

const Slot = styled.View`
  flex: 1;
  align-items: center;
  gap: 6px;
  padding: 16px 8px;
  border-radius: 16px;
  border-width: 1px;
  border-color: ${({theme}) => theme.role.border};
  background-color: ${({theme}) => theme.bg.paper};
`;

const EmptyAvatar = styled.View`
  width: 56px;
  height: 56px;
  border-radius: 28px;
  border-width: 2px;
  border-style: dashed;
  border-color: ${({theme}) => theme.role.border};
`;
