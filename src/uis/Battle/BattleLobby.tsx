import {useEffect, useRef, useState} from 'react';
import {Pressable, View} from 'react-native';
import {Typography, useCPK} from 'cpk-ui';
import {styled, css} from 'kstyled';
import {
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  impactAsync,
  notificationAsync,
} from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
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
import LaunchCountdown from './LaunchCountdown';
import PlayerPeek from './PlayerPeek';
import type {BattlePlayer, BattleRoom} from './types';

const PRESENCE_REFRESH_MS = 5000;
// The arena is dark in both themes, like a versus screen.
const ARENA_BG = '#15131F';

type Props = {
  room: BattleRoom;
  myRole: BattleRole;
  offsetMs: number;
  isBusy: boolean;
  onReady: (ready: boolean) => void;
  onShare: () => void;
  onKick: () => void;
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
  side,
  offsetMs,
  now,
  onPeek,
  onPeekEnd,
}: {
  player: BattlePlayer | null;
  isMe: boolean;
  isHost: boolean;
  // Which edge the player slides in from.
  side: -1 | 1;
  offsetMs: number;
  now: number;
  onPeek: (sticky: boolean) => void;
  onPeekEnd: () => void;
}): JSX.Element {
  const {theme} = useCPK();
  const color = isMe ? theme.role.primary : RIVAL_COLOR;
  const press = useSharedValue(1);
  const arrive = useSharedValue(0);
  useEffect(() => {
    arrive.set(withSpring(1, {damping: 13, stiffness: 140}));
  }, [arrive]);
  const pressStyle = useAnimatedStyle(() => ({
    opacity: arrive.get(),
    transform: [
      {translateX: (1 - arrive.get()) * side * 80},
      {scale: press.get()},
    ],
  }));

  if (!player) {
    return (
      <Slot
        accessibilityLabel={t('battle.emptySeat')}
        style={css`
          border-style: dashed;
          border-color: #ffffff33;
        `}
      >
        <EmptyAvatar>
          <Typography.Heading4
            style={css`
              color: #ffffff4d;
              font-weight: 900;
            `}
          >
            ?
          </Typography.Heading4>
        </EmptyAvatar>
        <Typography.Body3
          style={css`
            color: #ffffff80;
            font-weight: 700;
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
            border-color: ${lit ? color : '#FFFFFF26'};
            background-color: ${lit ? color + '33' : '#FFFFFF0F'};
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
              color: #ffffff;
              font-weight: 800;
              max-width: 100%;
            `}
          >
            {player.displayName}
          </Typography.Body2>
          <StatusPill
            style={css`
              background-color: ${!online
                ? '#FFFFFF33'
                : player.ready
                  ? color
                  : '#FFFFFF1F'};
            `}
          >
            <Typography.Body4
              style={css`
                font-weight: 800;
                color: #ffffff;
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
  onKick,
}: Props): JSX.Element {
  const {theme} = useCPK();
  const now = useNow(PRESENCE_REFRESH_MS);
  const [peek, setPeek] = useState<Peek | null>(null);
  const me = myRole === 'host' ? room.host : room.guest;
  const opponent = myRole === 'host' ? room.guest : room.host;
  const hasOpponent = room.guest !== null;
  const launching = room.launchAt !== null;
  // The countdown takes the whole screen; a profile peek would sit under it.
  const peekPlayer = peek && !launching ? room[peek.role] : null;
  // A held peek lasts only as long as the finger stays down.
  const endPeek = () => setPeek((current) => (current?.sticky ? current : null));
  const mc = !hasOpponent
    ? t('battle.mcWaiting')
    : me?.ready && !opponent?.ready
      ? t('battle.mcWaitingReady', {name: opponent?.displayName ?? ''})
      : t('battle.mcReady');
  const bothReady = Boolean(room.host?.ready && room.guest?.ready);

  // The VS beats like a pulse, faster once both seats are filled.
  const beat = useSharedValue(1);
  const beatMs = bothReady ? 260 : hasOpponent ? 420 : 900;
  useEffect(() => {
    beat.set(
      withRepeat(
        withSequence(
          withTiming(1.14, {duration: beatMs}),
          withTiming(1, {duration: beatMs}),
        ),
        -1,
      ),
    );
  }, [beat, beatMs]);
  const beatStyle = useAnimatedStyle(() => ({transform: [{scale: beat.get()}]}));

  // A jolt when the rival sits down, and a jolt when someone backs out.
  const hadOpponent = useRef(hasOpponent);
  const wasLaunching = useRef(launching);
  useEffect(() => {
    if (hasOpponent && !hadOpponent.current) {
      void impactAsync(ImpactFeedbackStyle.Heavy).catch(() => {});
    }
    if (wasLaunching.current && !launching) {
      void notificationAsync(NotificationFeedbackType.Warning).catch(() => {});
    }
    hadOpponent.current = hasOpponent;
    wasLaunching.current = launching;
  }, [hasOpponent, launching]);

  return (
    <Container>
      <MartieHost mood={hasOpponent ? 'smile' : 'basic'} message={mc} size={80} />
      <Arena>
        <ArenaHalves pointerEvents="none">
          <View style={{flex: 1, backgroundColor: theme.role.primary + '40'}} />
          <View style={{flex: 1, backgroundColor: RIVAL_COLOR + '40'}} />
        </ArenaHalves>
        <Slash style={{left: '50%', transform: [{rotate: '14deg'}]}} />
        <ArenaHeader>
          <Typography.Body4
            style={css`
              color: #ffffffb3;
              font-weight: 900;
              letter-spacing: 2px;
            `}
          >
            {t('battle.arenaTitle')}
          </Typography.Body4>
          <PotTag>
            <Typography.Body4
              style={css`
                color: #ffffff;
                font-weight: 800;
              `}
            >
              {t('battle.potLabel', {pot: room.stake * 2})}
            </Typography.Body4>
          </PotTag>
        </ArenaHeader>
        <SlotsRow>
          <PlayerSlot
            player={room.host}
            isMe={myRole === 'host'}
            isHost
            side={-1}
            offsetMs={offsetMs}
            now={now}
            onPeek={(sticky) => setPeek({role: 'host', sticky})}
            onPeekEnd={endPeek}
          />
          <Animated.View style={[{zIndex: 1, marginHorizontal: -16}, beatStyle]}>
            <VsBadge>
              <Typography.Heading5
                style={css`
                  color: #15131f;
                  font-weight: 900;
                  font-style: italic;
                `}
              >
                VS
              </Typography.Heading5>
            </VsBadge>
          </Animated.View>
          <PlayerSlot
            // A new key per guest replays the slide-in when someone sits down.
            key={room.guest?.displayName ?? 'empty'}
            player={room.guest}
            isMe={myRole === 'guest'}
            isHost={false}
            side={1}
            offsetMs={offsetMs}
            now={now}
            onPeek={(sticky) => setPeek({role: 'guest', sticky})}
            onPeekEnd={endPeek}
          />
        </SlotsRow>
      </Arena>
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

      {/* The room is 1:1, so inviting stops once the other seat is taken. */}
      {myRole === 'host' && !hasOpponent ? (
        <ButtonMartie
          hapticFeedback={ImpactFeedbackStyle.Light}
          onPress={onShare}
          text={t('battle.invite')}
          borderRadius={14}
          color="primary"
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
        onKick={
          myRole === 'host' && peek?.role === 'guest'
            ? () => {
                setPeek(null);
                onKick();
              }
            : undefined
        }
      />

      {room.launchAt !== null ? (
        <LaunchCountdown
          key={room.launchAt}
          launchAt={room.launchAt}
          offsetMs={offsetMs}
          me={me}
          opponent={opponent}
          myColor={theme.role.primary}
          pot={room.stake * 2}
          isBusy={isBusy}
          onCancel={() => onReady(false)}
        />
      ) : null}
    </Container>
  );
}

const Container = styled.View`
  padding: 24px 20px;
  gap: 20px;
`;

const Arena = styled.View`
  overflow: hidden;
  gap: 14px;
  padding: 14px 12px 16px;
  border-radius: 26px;
  background-color: ${ARENA_BG};
`;

const ArenaHalves = styled.View`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  flex-direction: row;
`;

const Slash = styled.View`
  position: absolute;
  top: -40px;
  bottom: -40px;
  width: 3px;
  margin-left: -1px;
  background-color: #ffffff59;
`;

const ArenaHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
`;

const PotTag = styled.View`
  padding: 3px 10px;
  border-radius: 10px;
  background-color: #ffffff1f;
`;

const SlotsRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
`;

const VsBadge = styled.View`
  width: 52px;
  height: 52px;
  border-radius: 26px;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  border-width: 3px;
  border-color: ${ARENA_BG};
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
  border-color: #ffffff26;
  background-color: #ffffff0f;
`;

const EmptyAvatar = styled.View`
  width: 66px;
  height: 66px;
  border-radius: 33px;
  align-items: center;
  justify-content: center;
  border-width: 2px;
  border-style: dashed;
  border-color: #ffffff33;
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
  background-color: ${ARENA_BG};
`;

const MeTag = styled.View`
  position: absolute;
  bottom: -8px;
  align-self: center;
  padding: 1px 8px;
  border-radius: 8px;
`;
