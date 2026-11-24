import {useEffect, useRef, useState} from 'react';
import {Image, Pressable, View} from 'react-native';
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
import {IC_MARTIE_SLEEP} from '../../icons';
import {HeadToHead, MartieHost, PlayerAvatar, RIVAL_COLOR} from './BattleParts';
import LaunchCountdown from './LaunchCountdown';
import PlayerPeek from './PlayerPeek';
import {Burst, CREAM, INK, SOFT_SHADOW, Sticker, StickerButton} from './Sticker';
import type {BattlePlayer, BattleRoom} from './types';

const PRESENCE_REFRESH_MS = 5000;
// The arena is a printed card in both themes, warm like the bulb.
const ARENA_BG = '#FFF1C9';
const SEAT_HEIGHT = 176;

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

  // Seats lean toward each other, like two cards squaring off.
  const tilt = `${side * -2}deg`;

  if (!player) {
    return (
      <Sticker
        style={{flex: 1, transform: [{rotate: tilt}]}}
        shadow={INK + '33'}
        faceStyle={{height: SEAT_HEIGHT, backgroundColor: CREAM, borderColor: INK + '66'}}
      >
        <SeatBody accessibilityLabel={t('battle.emptySeat')}>
          <Image
            accessibilityIgnoresInvertColors
            source={IC_MARTIE_SLEEP}
            resizeMode="contain"
            style={{width: 64, height: 64, opacity: 0.55}}
          />
          <Typography.Body3
            style={css`
              color: ${INK};
              opacity: 0.55;
              font-weight: 800;
            `}
          >
            {t('battle.emptySeat')}
          </Typography.Body3>
        </SeatBody>
      </Sticker>
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
        <Sticker
          style={{transform: [{rotate: tilt}]}}
          // A ready player's card casts their own color.
          shadow={lit ? color : SOFT_SHADOW}
          offset={lit ? 4 : 3}
          faceStyle={{height: SEAT_HEIGHT}}
        >
          <SeatBody>
            <View>
              <PlayerAvatar player={player} size={58} ringColor={color} />
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
                color: ${INK};
                font-weight: 900;
                max-width: 100%;
              `}
            >
              {player.displayName}
            </Typography.Body2>
            {lit ? (
              // Stamped on, a little crooked, like a rubber stamp.
              <Stamp style={{backgroundColor: color, transform: [{rotate: '-6deg'}]}}>
                <Typography.Body4
                  style={css`
                    color: #ffffff;
                    font-weight: 900;
                  `}
                >
                  {label}
                </Typography.Body4>
              </Stamp>
            ) : (
              <Typography.Body4
                style={css`
                  color: ${INK};
                  opacity: 0.5;
                  font-weight: 800;
                `}
              >
                {label}
              </Typography.Body4>
            )}
          </SeatBody>
        </Sticker>
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
  const beatStyle = useAnimatedStyle(() => ({
    transform: [{rotate: '-8deg'}, {scale: beat.get()}],
  }));

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
      <Sticker offset={3} radius={26} faceStyle={{backgroundColor: ARENA_BG}}>
        <ArenaBody>
          <ArenaHeader>
            <Typography.Heading5
              style={css`
                color: ${INK};
                font-weight: 900;
              `}
            >
              {t('battle.arenaTitle')}
            </Typography.Heading5>
            <Sticker
              offset={2}
              radius={10}
              faceStyle={{borderWidth: 1.5, paddingVertical: 2, paddingHorizontal: 8}}
            >
              <Typography.Body4
                style={css`
                  color: ${INK};
                  font-weight: 900;
                `}
              >
                {t('battle.potLabel', {pot: room.stake * 2})}
              </Typography.Body4>
            </Sticker>
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
            <Animated.View
              style={[{zIndex: 1, marginHorizontal: -10}, beatStyle]}
            >
              <Burst size={60}>
                <Typography.Heading5
                  style={css`
                    color: ${INK};
                    font-weight: 900;
                    font-style: italic;
                  `}
                >
                  VS
                </Typography.Heading5>
              </Burst>
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
        </ArenaBody>
      </Sticker>
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
        <StickerButton
          text={me?.ready ? t('battle.unready') : t('battle.ready')}
          onPress={() => onReady(!me?.ready)}
          loading={isBusy}
          color={me?.ready ? CREAM : theme.role.primary}
          textColor={me?.ready ? INK : '#FFFFFF'}
        />
      ) : null}

      {/* The room is 1:1, so inviting stops once the other seat is taken. */}
      {myRole === 'host' && !hasOpponent ? (
        <StickerButton
          text={t('battle.invite')}
          onPress={onShare}
          color={theme.role.primary}
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

const ArenaBody = styled.View`
  gap: 14px;
  padding: 14px 12px 18px;
`;

const ArenaHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px;
`;

const SlotsRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const SeatBody = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 8px;
`;

const Stamp = styled.View`
  padding: 3px 10px;
  border-radius: 8px;
  border-width: 1.5px;
  border-color: ${INK};
`;

const CrownBadge = styled.View`
  position: absolute;
  top: -8px;
  right: -10px;
  width: 28px;
  height: 28px;
  border-radius: 14px;
  align-items: center;
  justify-content: center;
  border-width: 1.5px;
  border-color: ${INK};
  background-color: ${CREAM};
`;

const MeTag = styled.View`
  position: absolute;
  bottom: -9px;
  align-self: center;
  padding: 0 8px;
  border-radius: 8px;
  border-width: 1.5px;
  border-color: ${INK};
`;
