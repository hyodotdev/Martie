import {useEffect} from 'react';
import {Image, Modal, View} from 'react-native';
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
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {BATTLE_LAUNCH_MS} from '../../../convex/battle/logic';
import {IC_MARTIE_IMPRESSED, IC_MARTIE_SMILE, IC_MARTIE_SWEAT} from '../../icons';
import {AUDIO_PRESS} from '../../sounds';
import {t} from '../../STRINGS';
import {useBattleCountdown} from '../../hooks/useBattleCountdown';
import {
  safePlayAudioPlayer,
  safeSeekAudioPlayerToStart,
} from '../../utils/audioPlayer';
import {PlayerAvatar, RIVAL_COLOR} from './BattleParts';
import {Burst, CREAM, INK, SUN, Sticker, StickerButton} from './Sticker';
import type {BattlePlayer} from './types';

// The last seconds turn the whole screen coral and hit harder.
const FINAL_SECONDS = 3;
const CORAL = '#F25548';
const LAUNCH_SECONDS = BATTLE_LAUNCH_MS / 1000;

type Props = {
  // Mount one per countdown (keyed by this), so the clock never starts from
  // a previous value and flashes the finish.
  launchAt: number;
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
    shift.set(withSpring(closing * 5 * -side, {damping: 12}));
  }, [closing, shift, side]);
  const style = useAnimatedStyle(() => ({
    transform: [{translateX: shift.get()}],
  }));

  return (
    <Animated.View style={[{width: 88, alignItems: 'center', gap: 10}, style]}>
      <Sticker radius={40} shadow="#00000059" faceStyle={{borderColor: CREAM}}>
        {player ? <PlayerAvatar player={player} size={54} ringColor={color} /> : null}
      </Sticker>
      <Sticker
        radius={8}
        offset={3}
        shadow="#00000059"
        style={{transform: [{rotate: `${side * -4}deg`}]}}
        faceStyle={{
          borderWidth: 2,
          paddingHorizontal: 8,
          paddingVertical: 2,
          backgroundColor: color,
        }}
      >
        <Typography.Body4
          numberOfLines={1}
          style={css`
            color: #ffffff;
            font-weight: 900;
            max-width: 76px;
          `}
        >
          {player?.displayName ?? ''}
        </Typography.Body4>
      </Sticker>
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
  const leftMs = useBattleCountdown(launchAt, offsetMs);
  const seconds = Math.ceil(leftMs / 1000);
  const final = seconds <= FINAL_SECONDS;
  const tick = useAudioPlayer(AUDIO_PRESS);
  const slam = useSharedValue(1);
  const spin = useSharedValue(0);

  // Faint rays turn slowly behind everything, like a fight poster.
  useEffect(() => {
    spin.set(
      withRepeat(withTiming(360, {duration: 40000, easing: Easing.linear}), -1),
    );
  }, [spin]);

  useEffect(() => {
    slam.set(1.35);
    slam.set(withSpring(1, {damping: 11, stiffness: 260}));
    if (seconds === 0) {
      void notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      return;
    }
    void impactAsync(
      final ? ImpactFeedbackStyle.Heavy : ImpactFeedbackStyle.Medium,
    ).catch(() => {});
    safeSeekAudioPlayerToStart(tick);
    safePlayAudioPlayer(tick);
  }, [final, seconds, slam, tick]);

  // Each number lands tilted the other way, so it never sits still.
  const lean = seconds % 2 === 0 ? -7 : 6;
  const burstStyle = useAnimatedStyle(() => ({
    transform: [{rotate: `${lean}deg`}, {scale: slam.get()}],
  }));
  const raysStyle = useAnimatedStyle(() => ({
    transform: [{rotate: `${spin.get()}deg`}],
  }));

  const background = seconds === 0 ? SUN : final ? CORAL : INK;
  const ink = seconds === 0 ? INK : CREAM;
  const martie =
    seconds === 0 ? IC_MARTIE_IMPRESSED : final ? IC_MARTIE_SWEAT : IC_MARTIE_SMILE;
  const canCancel = !isBusy && seconds > 0;

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      statusBarTranslucent
      // Android's back button backs out, like the button below.
      onRequestClose={canCancel ? onCancel : undefined}
    >
      <Backdrop accessibilityViewIsModal style={{backgroundColor: background}}>
        <Animated.View
          pointerEvents="none"
          style={[{position: 'absolute', opacity: 0.09}, raysStyle]}
        >
          <Burst size={760} color="#FFFFFF" stroke={null} />
        </Animated.View>

        <Typography.Heading4
          style={css`
            color: ${ink};
            font-weight: 900;
            text-align: center;
          `}
        >
          {t('battle.launchTitle')}
        </Typography.Heading4>

        <Stage>
          <Fighter
            player={me}
            color={myColor}
            side={-1}
            closing={LAUNCH_SECONDS - seconds}
          />
          <Animated.View style={burstStyle}>
            <Burst size={152} color={seconds === 0 ? CREAM : SUN}>
              <Typography.Heading1
                accessibilityLiveRegion="assertive"
                style={css`
                  color: ${INK};
                  font-size: ${seconds === 0 ? 36 : 80}px;
                  line-height: ${seconds === 0 ? 46 : 92}px;
                  font-weight: 900;
                  text-align: center;
                `}
              >
                {seconds === 0 ? t('battle.go') : seconds}
              </Typography.Heading1>
            </Burst>
          </Animated.View>
          <Fighter
            player={opponent}
            color={RIVAL_COLOR}
            side={1}
            closing={LAUNCH_SECONDS - seconds}
          />
        </Stage>

        <Sticker
          radius={12}
          offset={3}
          shadow="#00000059"
          faceStyle={{
            borderWidth: 2,
            paddingHorizontal: 12,
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
            {t('battle.potLabel', {pot})}
          </Typography.Body2>
        </Sticker>

        <View
          style={css`
            align-self: stretch;
            gap: 12px;
            margin-top: 18px;
          `}
        >
          <StickerButton
            text={t('battle.launchCancel')}
            onPress={onCancel}
            disabled={!canCancel}
            color={CREAM}
            textColor={INK}
            shadow="#00000066"
          />
          <Typography.Body4
            style={css`
              color: ${ink};
              opacity: 0.75;
              text-align: center;
            `}
          >
            {t('battle.launchHint')}
          </Typography.Body4>
        </View>

        {/* Martie peeks in from the corner to watch. */}
        <Image
          accessibilityIgnoresInvertColors
          source={martie}
          resizeMode="contain"
          style={{
            position: 'absolute',
            right: -18,
            bottom: -26,
            width: 150,
            height: 150,
            transform: [{rotate: '-12deg'}],
          }}
        />
      </Backdrop>
    </Modal>
  );
}

const Backdrop = styled.View`
  flex: 1;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 32px 24px;
`;

const Stage = styled.View`
  align-self: stretch;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;
