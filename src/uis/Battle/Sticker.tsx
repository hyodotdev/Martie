import type {ReactNode} from 'react';
import {Pressable, View, type StyleProp, type ViewStyle} from 'react-native';
import {Typography} from 'cpk-ui';
import {css} from 'kstyled';
import {useAudioPlayer} from 'expo-audio';
import {ImpactFeedbackStyle, impactAsync} from 'expo-haptics';
import Svg, {Polygon} from 'react-native-svg';
import {AUDIO_PRESS} from '../../sounds';
import {
  safePlayAudioPlayer,
  safeSeekAudioPlayerToStart,
} from '../../utils/audioPlayer';

// Drawn from Martie's own art: his navy outline and cream, plus the
// bulb's yellow. The battle screens are inked like stickers to match him.
export const INK = '#22225E';
export const SUN = '#FFC83D';
export const CREAM = '#FFFDF6';

/**
 * `color` mixed into white as a solid color. Sticker faces must be opaque,
 * or the colored shadow under them shows through.
 */
export function paperTint(color: string, amount: number): string {
  const hex = color.replace('#', '').slice(0, 6);
  const mix = (offset: number) => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16);
    return Math.round(255 + (channel - 255) * amount)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${mix(0)}${mix(2)}${mix(4)}`.toUpperCase();
}

// Hand-cut spikes: each one a little longer or shorter than the last.
const SPIKE_LENGTHS = [1, 0.9, 0.97, 0.86, 1, 0.92, 0.88, 0.99, 0.9, 0.95, 0.85, 0.98];

/** Points of a slightly uneven starburst that fits in `size`. */
export function burstPoints(size: number, spikes = 12, depth = 0.72): string {
  const center = size / 2;
  const reach = center - 3;
  const points: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r =
      i % 2 === 0
        ? reach * SPIKE_LENGTHS[(i / 2) % SPIKE_LENGTHS.length]
        : reach * depth;
    const angle = (Math.PI * i) / spikes - Math.PI / 2;
    points.push(
      `${(center + r * Math.cos(angle)).toFixed(1)},${(center + r * Math.sin(angle)).toFixed(1)}`,
    );
  }
  return points.join(' ');
}

/** A comic starburst with whatever sits on it centered. */
export function Burst({
  size,
  color = SUN,
  stroke = INK,
  children,
}: {
  size: number;
  color?: string;
  stroke?: string | null;
  children?: ReactNode;
}): JSX.Element {
  return (
    <View
      style={{width: size, height: size, alignItems: 'center', justifyContent: 'center'}}
    >
      <Svg width={size} height={size} style={{position: 'absolute'}}>
        <Polygon
          points={burstPoints(size)}
          fill={color}
          stroke={stroke ?? 'none'}
          strokeWidth={stroke ? 3 : 0}
          strokeLinejoin="round"
        />
      </Svg>
      {children}
    </View>
  );
}

/**
 * An inked card with a hard, unblurred shadow, like a sticker on paper.
 * The shadow is a real view so it looks the same on Android.
 */
export function Sticker({
  shadow = INK,
  offset = 4,
  radius = 18,
  style,
  faceStyle,
  children,
}: {
  shadow?: string;
  offset?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  faceStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
}): JSX.Element {
  return (
    <View style={[{paddingRight: offset, paddingBottom: offset}, style]}>
      <View
        style={{
          position: 'absolute',
          top: offset,
          left: offset,
          right: 0,
          bottom: 0,
          borderRadius: radius,
          backgroundColor: shadow,
        }}
      />
      <View
        style={[
          {
            borderRadius: radius,
            borderWidth: 3,
            borderColor: INK,
            backgroundColor: '#FFFFFF',
          },
          faceStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

/** A chunky button that presses down onto its own shadow. */
export function StickerButton({
  text,
  onPress,
  color,
  textColor = '#FFFFFF',
  shadow = INK,
  disabled = false,
}: {
  text: string;
  onPress: () => void;
  color: string;
  textColor?: string;
  shadow?: string;
  disabled?: boolean;
}): JSX.Element {
  const click = useAudioPlayer(AUDIO_PRESS);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityState={{disabled}}
      disabled={disabled}
      onPress={() => {
        void impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
        safeSeekAudioPlayerToStart(click);
        safePlayAudioPlayer(click);
        onPress();
      }}
    >
      {({pressed}) => (
        <Sticker
          offset={pressed ? 1 : 5}
          radius={16}
          shadow={shadow}
          style={{
            opacity: disabled ? 0.5 : 1,
            transform: [{translateY: pressed ? 4 : 0}],
          }}
          faceStyle={{
            height: 54,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: color,
          }}
        >
          <Typography.Body1
            style={css`
              color: ${textColor};
              font-weight: 900;
            `}
          >
            {text}
          </Typography.Body1>
        </Sticker>
      )}
    </Pressable>
  );
}
