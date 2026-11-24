import {useState} from 'react';
import {Pressable, View} from 'react-native';
import {Typography, useCPK} from 'cpk-ui';
import {styled, css} from 'kstyled';
import {ImpactFeedbackStyle, impactAsync} from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  BATTLE_PRESENCE_STALE_MS,
  BATTLE_STAKE_BULBS,
  type BattleRole,
} from '../../../convex/battle/logic';
import {t} from '../../STRINGS';
import {isSeenRecently} from '../../utils/battle';
import {useNow} from '../../hooks/useBattleCountdown';
import ButtonMartie from '../ButtonMartie';
import {HeadToHead, MartieHost, PlayerAvatar, RIVAL_COLOR} from './BattleParts';
import PlayerPeek from './PlayerPeek';
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

type Peek = {role: BattleRole; sticky: boolean};

function presenceStatus(
  player: BattlePlayer,
  now: number,
  offsetMs: number,
): {online: boolean; label: string} {
  const online = isSeenRecently(
    player.seenAt,
    now,
    offsetMs,
    BATTLE_PRESENCE_STALE_MS,
  );
  const label = !online
    ? t('battle.offline')
    : player.ready
      ? t('battle.isReady')
      : t('battle.notReady');
  return {online, label};
}

/** One seat. Every seat is the same size; details live in the peek card. */
function PlayerSlot({
  player,
  isMe,
  isHost,
  offsetMs,
  now,
  onPeek,
  onPeekEnd,
}: {
  player: BattlePlayer | null;
  isMe: boolean;
  isHost: boolean;
  offsetMs: number;
  now: number;
  onPeek: (sticky: boolean) => void;
  onPeekEnd: () => void;
}): JSX.Element {
  const {theme} = useCPK();
  const color = isMe ? theme.role.primary : RIVAL_COLOR;
  const press = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{scale: press.value}],
  }));

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

  const {online, label} = presenceStatus(player, now, offsetMs);
  const lit = player.ready && online;

  return (
    <Animated.View style={[{flex: 1}, pressStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[
          player.displayName,
          isMe ? t('battle.me') : '',
          isHost ? t('battle.host') : '',
          label,
        ]
          .filter(Boolean)
          .join(', ')}
        accessibilityHint={t('battle.viewProfileHint')}
        delayLongPress={280}
        onPressIn={() => {
          press.set(withTiming(0.95, {duration: 120}));
        }}
        onPressOut={() => {
          press.set(withSpring(1, {damping: 10, stiffness: 260}));
          onPeekEnd();
        }}
        onPress={() => onPeek(true)}
        onLongPress={() => {
          void impactAsync(ImpactFeedbackStyle.Medium);
          onPeek(false);
        }}
      >
        <Slot
          style={css`
            border-color: ${lit ? color : theme.role.border};
            background-color: ${lit ? color + '14' : theme.bg.paper};
          `}
        >
          <View>
            <PlayerAvatar player={player} size={60} ringColor={color} />
            {isHost ? (
              <CrownBadge>
                <Typography.Body4>👑</Typography.Body4>
              </CrownBadge>
            ) : null}
            {isMe ? (
              <MeTag style={{backgroundColor: color}}>
                <Typography.Body4
                  style={css`
                    color: #ffffff;
                    font-weight: 800;
                    font-size: 11px;
                  `}
                >
                  {t('battle.me')}
                </Typography.Body4>
              </MeTag>
            ) : null}
          </View>
          <Typography.Body2
            numberOfLines={1}
            style={css`
              font-weight: 800;
              max-width: 100%;
            `}
          >
            {player.displayName}
          </Typography.Body2>
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
              {lit ? '✓ ' : ''}
              {label}
            </Typography.Body4>
          </StatusPill>
        </Slot>
      </Pressable>
    </Animated.View>
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
  const {theme} = useCPK();
  const now = useNow(PRESENCE_REFRESH_MS);
  const [peek, setPeek] = useState<Peek | null>(null);
  const me = myRole === 'host' ? room.host : room.guest;
  const opponent = myRole === 'host' ? room.guest : room.host;
  const hasOpponent = room.guest !== null;
  const peekPlayer = peek ? room[peek.role] : null;
  // A held peek lasts only as long as the finger stays down.
  const endPeek = () => setPeek((current) => (current?.sticky ? current : null));
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
          onPeek={(sticky) => setPeek({role: 'host', sticky})}
          onPeekEnd={endPeek}
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
          onPeek={(sticky) => setPeek({role: 'guest', sticky})}
          onPeekEnd={endPeek}
        />
      </SlotsRow>
      <Typography.Body4
        style={css`
          margin-top: -10px;
          text-align: center;
          opacity: 0.45;
        `}
      >
        {t('battle.viewProfileHint')}
      </Typography.Body4>
      {room.headToHead && opponent ? (
        <HeadToHead record={room.headToHead} opponentName={opponent.displayName} />
      ) : null}

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

      <PlayerPeek
        player={peekPlayer}
        isMe={peek?.role === myRole}
        isHost={peek?.role === 'host'}
        color={peek?.role === myRole ? theme.role.primary : RIVAL_COLOR}
        headToHead={room.headToHead}
        status={peekPlayer ? presenceStatus(peekPlayer, now, offsetMs).label : ''}
        sticky={peek?.sticky ?? false}
        onClose={() => setPeek(null)}
      />
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
  height: 176px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 10px;
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

const CrownBadge = styled.View`
  position: absolute;
  top: -6px;
  right: -8px;
  width: 26px;
  height: 26px;
  border-radius: 13px;
  align-items: center;
  justify-content: center;
  background-color: ${({theme}) => theme.bg.basic};
`;

const MeTag = styled.View`
  position: absolute;
  bottom: -8px;
  align-self: center;
  padding: 1px 8px;
  border-radius: 8px;
`;
