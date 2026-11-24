import {useEffect} from 'react';
import {Image, Modal, Pressable, StyleSheet, View} from 'react-native';
import {Typography} from 'cpk-ui';
import {styled, css} from 'kstyled';
import {useAudioPlayer} from 'expo-audio';
import {
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  impactAsync,
  notificationAsync,
} from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {IC_MARTIE_IMPRESSED, IC_MARTIE_SMILE, IC_MARTIE_SWEAT} from '../../icons';
import {AUDIO_PRESS} from '../../sounds';
import {t} from '../../STRINGS';
import {useBattleCountdown} from '../../hooks/useBattleCountdown';
import {
  safePlayAudioPlayer,
  safeSeekAudioPlayerToStart,
} from '../../utils/audioPlayer';
import {PlayerAvatar, RIVAL_COLOR} from './BattleParts';
import type {BattlePlayer} from './types';

// The last seconds turn red and hit harder.
const FINAL_SECONDS = 3;
const DANGER = '#FF4D4D';

type Props = {
  launchAt: number | null;
  offsetMs: number;
  me: BattlePlayer | null;
  opponent: BattlePlayer | null;
  myColor: string;
  pot: number;
  isBusy: boolean;
  onCancel: () => void;
};

function Fighter({
  player,
  color,
  side,
  closing,
}: {
  player: BattlePlayer | null;
  color: string;
  side: -1 | 1;
  closing: number;
}): JSX.Element {
  // Both fighters edge toward the middle as the clock runs down.
  const shift = useSharedValue(0);
  useEffect(() => {
    shift.set(withSpring(closing * 6 * -side, {damping: 12}));
  }, [closing, shift, side]);
  const style = useAnimatedStyle(() => ({
    transform: [{translateX: shift.get()}],
  }));

  return (
    <Animated.View style={[{width: 96, alignItems: 'center', gap: 8}, style]}>
      {player ? <PlayerAvatar player={player} size={64} ringColor={color} /> : null}
      <Typography.Body3
        numberOfLines={1}
        style={css`
          color: #ffffff;
          font-weight: 800;
          max-width: 96px;
        `}
      >
        {player?.displayName ?? ''}
      </Typography.Body3>
    </Animated.View>
  );
}

/** The lobby's last seconds before a match, like a LAN game about to launch. */
export default function LaunchCountdown({
  launchAt,
  offsetMs,
  me,
  opponent,
  myColor,
  pot,
  isBusy,
  onCancel,
}: Props): JSX.Element {
  const visible = launchAt !== null;
  const leftMs = useBattleCountdown(launchAt, offsetMs);
  const seconds = Math.ceil(leftMs / 1000);
  const final = seconds <= FINAL_SECONDS;
  const tick = useAudioPlayer(AUDIO_PRESS);
  const slam = useSharedValue(1);
  const ring = useSharedValue(1);
  const flash = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    slam.set(2.2);
    slam.set(withSpring(1, {damping: 15, stiffness: 240}));
    ring.set(0);
    ring.set(withTiming(1, {duration: 750}));
    if (seconds === 0) {
      void notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      return;
    }
    if (final) {
      flash.set(withSequence(withTiming(0.4, {duration: 60}), withTiming(0, {duration: 500})));
    }
    void impactAsync(
      final ? ImpactFeedbackStyle.Heavy : ImpactFeedbackStyle.Medium,
    ).catch(() => {});
    safeSeekAudioPlayerToStart(tick);
    safePlayAudioPlayer(tick);
  }, [final, flash, ring, seconds, slam, tick, visible]);

  const numberStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, 2.6 - slam.get()),
    transform: [{scale: slam.get()}],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 1 - ring.get(),
    transform: [{scale: 0.6 + ring.get() * 1.2}],
  }));
  const flashStyle = useAnimatedStyle(() => ({opacity: flash.get()}));

  const accent = seconds === 0 ? myColor : final ? DANGER : '#FFFFFF';
  const martie =
    seconds === 0 ? IC_MARTIE_IMPRESSED : final ? IC_MARTIE_SWEAT : IC_MARTIE_SMILE;

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <Backdrop accessibilityViewIsModal>
        <Halves pointerEvents="none" style={{backgroundColor: '#0B0A12'}} />
        <Halves pointerEvents="none">
          <View style={{flex: 1, backgroundColor: myColor + '33'}} />
          <View style={{flex: 1, backgroundColor: RIVAL_COLOR + '33'}} />
        </Halves>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, {backgroundColor: DANGER}, flashStyle]}
        />

        <Image
          accessibilityIgnoresInvertColors
          source={martie}
          resizeMode="contain"
          style={{width: 76, height: 76}}
        />
        <Typography.Body2
          style={css`
            color: #ffffffcc;
            font-weight: 900;
            letter-spacing: 3px;
            text-transform: uppercase;
            text-align: center;
          `}
        >
          {t('battle.launchTitle')}
        </Typography.Body2>

        <Stage>
          <Fighter player={me} color={myColor} side={-1} closing={5 - seconds} />
          <Clock>
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  width: 150,
                  height: 150,
                  borderRadius: 75,
                  borderWidth: 4,
                  borderColor: accent,
                },
                ringStyle,
              ]}
            />
            <Animated.View style={numberStyle}>
              <Typography.Heading1
                accessibilityLiveRegion="assertive"
                style={css`
                  color: ${accent};
                  font-size: ${seconds === 0 ? 44 : 112}px;
                  line-height: ${seconds === 0 ? 56 : 128}px;
                  font-weight: 900;
                  text-align: center;
                `}
              >
                {seconds === 0 ? t('battle.go') : seconds}
              </Typography.Heading1>
            </Animated.View>
          </Clock>
          <Fighter
            player={opponent}
            color={RIVAL_COLOR}
            side={1}
            closing={5 - seconds}
          />
        </Stage>

        <Pot>
          <Typography.Body2
            style={css`
              color: #ffffff;
              font-weight: 800;
            `}
          >
            {t('battle.potLabel', {pot})}
          </Typography.Body2>
        </Pot>

        <View
          style={css`
            align-self: stretch;
            gap: 10px;
            margin-top: 12px;
          `}
        >
          <Pressable
            accessibilityRole="button"
            disabled={isBusy || seconds === 0}
            onPress={onCancel}
            style={({pressed}) => ({
              height: 52,
              borderRadius: 14,
              borderWidth: 2,
              borderColor: '#FFFFFF66',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed || isBusy || seconds === 0 ? 0.5 : 1,
            })}
          >
            <Typography.Body1
              style={css`
                color: #ffffff;
                font-weight: 800;
              `}
            >
              {t('battle.launchCancel')}
            </Typography.Body1>
          </Pressable>
          <Typography.Body4
            style={css`
              color: #ffffff99;
              text-align: center;
            `}
          >
            {t('battle.launchHint')}
          </Typography.Body4>
        </View>
      </Backdrop>
    </Modal>
  );
}

const Backdrop = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 32px 24px;
`;

const Halves = styled.View`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  flex-direction: row;
`;

const Stage = styled.View`
  align-self: stretch;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: 12px 0;
`;

const Clock = styled.View`
  width: 150px;
  height: 150px;
  align-items: center;
  justify-content: center;
`;

const Pot = styled.View`
  padding: 8px 16px;
  border-radius: 16px;
  background-color: #ffffff1a;
`;
