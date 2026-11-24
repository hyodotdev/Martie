import {useEffect} from 'react';
import {Image, View, type ImageSourcePropType} from 'react-native';
import {Typography, useCPK} from 'cpk-ui';
import {styled, css} from 'kstyled';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  IC_MARTIE_BASIC,
  IC_MARTIE_IMPRESSED,
  IC_MARTIE_SMART,
  IC_MARTIE_SMILE,
  IC_MARTIE_SWEAT,
} from '../../icons';
import type {BattleRecord} from '../../../convex/battle/logic';
import {t} from '../../STRINGS';
import {recordText} from './BattleRecordCard';
import type {BattlePlayer} from './types';

// Each side keeps one color on every screen so a glance tells who did what.
export const RIVAL_COLOR = '#4C7DFF';

export type MartieMood =
  | 'basic'
  | 'impressed'
  | 'smart'
  | 'smile'
  | 'sweat';

const MOOD_IMAGES: Record<MartieMood, ImageSourcePropType> = {
  basic: IC_MARTIE_BASIC,
  impressed: IC_MARTIE_IMPRESSED,
  smart: IC_MARTIE_SMART,
  smile: IC_MARTIE_SMILE,
  sweat: IC_MARTIE_SWEAT,
};

/** Martie hosts the show: a bobbing mascot with a speech bubble. */
export function MartieHost({
  mood,
  message,
  size = 68,
  accessory,
}: {
  mood: MartieMood;
  message: string;
  size?: number;
  accessory?: JSX.Element | null;
}): JSX.Element {
  const {theme} = useCPK();
  const bob = useSharedValue(0);
  const pop = useSharedValue(1);

  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(-4, {duration: 700}),
        withTiming(0, {duration: 700}),
      ),
      -1,
    );
  }, [bob]);

  useEffect(() => {
    pop.value = withSequence(
      withTiming(0.92, {duration: 60}),
      withSpring(1, {damping: 8, stiffness: 220}),
    );
  }, [message, pop]);

  const bobStyle = useAnimatedStyle(() => ({
    transform: [{translateY: bob.value}],
  }));
  const popStyle = useAnimatedStyle(() => ({
    transform: [{scale: pop.value}],
  }));

  return (
    <HostRow>
      <Animated.View style={bobStyle}>
        <Image
          accessibilityIgnoresInvertColors
          source={MOOD_IMAGES[mood]}
          style={{width: size, height: size}}
          resizeMode="contain"
        />
      </Animated.View>
      <Animated.View style={[{flex: 1}, popStyle]}>
        <Bubble accessibilityLiveRegion="polite">
          <BubbleTail style={{transform: [{rotate: '45deg'}]}} />
          <Typography.Body2
            style={css`
              font-weight: 700;
              color: ${theme.text.basic};
            `}
          >
            {message}
          </Typography.Body2>
        </Bubble>
      </Animated.View>
      {accessory ?? null}
    </HostRow>
  );
}

/** A big ticking number for the short countdowns. */
export function CountdownBadge({
  seconds,
  color,
  size = 52,
}: {
  seconds: number;
  color: string;
  size?: number;
}): JSX.Element {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withSequence(
      withTiming(1.25, {duration: 90}),
      withSpring(1, {damping: 7, stiffness: 200}),
    );
  }, [seconds, pulse]);
  const style = useAnimatedStyle(() => ({transform: [{scale: pulse.value}]}));

  return (
    <Animated.View
      accessibilityLabel={String(seconds)}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Typography.Heading3
        style={css`
          color: #ffffff;
          font-weight: 900;
        `}
      >
        {seconds}
      </Typography.Heading3>
    </Animated.View>
  );
}

export function PlayerAvatar({
  player,
  size = 56,
  ringColor,
}: {
  player: BattlePlayer;
  size?: number;
  ringColor?: string;
}): JSX.Element {
  const {theme} = useCPK();
  const color = ringColor ?? theme.role.primary;
  const ring = Math.max(2, Math.round(size / 18));
  return (
    <View
      style={css`
        width: ${size + ring * 2}px;
        height: ${size + ring * 2}px;
        border-radius: ${size / 2 + ring}px;
        border-width: ${ring}px;
        border-color: ${color};
        align-items: center;
        justify-content: center;
        background-color: ${color + '1F'};
      `}
    >
      {player.avatarUrl ? (
        <Image
          accessibilityIgnoresInvertColors
          source={{uri: player.avatarUrl}}
          style={{width: size, height: size, borderRadius: size / 2}}
        />
      ) : (
        <Typography.Heading4
          style={css`
            color: ${color};
            font-weight: 900;
          `}
        >
          {player.displayName.slice(0, 1).toUpperCase() || '?'}
        </Typography.Heading4>
      )}
    </View>
  );
}

/** My record against this opponent, or a first-meeting note. */
export function HeadToHead({
  record,
  opponentName,
}: {
  record: BattleRecord;
  opponentName: string;
}): JSX.Element {
  const {theme} = useCPK();
  const played = record.wins + record.losses + record.draws;
  return (
    <Rivalry>
      <Typography.Body4
        numberOfLines={1}
        style={css`
          font-weight: 700;
          opacity: 0.7;
        `}
      >
        ⚔️ {t('battle.headToHeadTitle', {name: opponentName})}
      </Typography.Body4>
      {played === 0 ? (
        <Typography.Body2
          style={css`
            font-weight: 800;
          `}
        >
          {t('battle.firstMeeting')}
        </Typography.Body2>
      ) : (
        <View
          style={css`
            flex-direction: row;
            align-items: center;
            gap: 10px;
          `}
        >
          <Typography.Heading4
            style={css`
              font-weight: 900;
              color: ${theme.role.primary};
            `}
          >
            {record.wins}
          </Typography.Heading4>
          <Typography.Body3
            style={css`
              font-weight: 700;
              opacity: 0.6;
            `}
          >
:
          </Typography.Body3>
          <Typography.Heading4
            style={css`
              font-weight: 900;
              color: ${RIVAL_COLOR};
            `}
          >
            {record.losses}
          </Typography.Heading4>
        </View>
      )}
      {played > 0 ? (
        <Typography.Body4
          style={css`
            opacity: 0.6;
          `}
        >
          {recordText(record)}
        </Typography.Body4>
      ) : null}
    </Rivalry>
  );
}

const Rivalry = styled.View`
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  border-radius: 16px;
  border-width: 2px;
  border-style: dashed;
  border-color: ${({theme}) => theme.role.border};
`;

const HostRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 10px;
`;

const Bubble = styled.View`
  padding: 12px 14px;
  border-radius: 16px;
  background-color: ${({theme}) => theme.bg.basic};
  border-width: 2px;
  border-color: ${({theme}) => theme.text.basic + '1A'};
`;

const BubbleTail = styled.View`
  position: absolute;
  left: -7px;
  top: 16px;
  width: 12px;
  height: 12px;
  background-color: ${({theme}) => theme.bg.basic};
  border-left-width: 2px;
  border-bottom-width: 2px;
  border-color: ${({theme}) => theme.text.basic + '1A'};
`;
