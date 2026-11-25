import {useEffect, useState} from 'react';
import {Text, View} from 'react-native';
import {Image} from 'expo-image';
import {css} from 'kstyled';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {SPRITE_MARTIE_MC} from '../../icons';
import {t} from '../../STRINGS';
import {INK} from '../Battle/Sticker';
import {commentaryLine, type CommentatorMood} from './lines';

export type {CommentatorMood} from './lines';

type Frame = keyof typeof SPRITE_MARTIE_MC;

const FRAMES = Object.keys(SPRITE_MARTIE_MC) as Frame[];
// Martie's glasses red, for the on-air light.
const ON_AIR = '#FF5A5F';
// How long he talks into the mic before settling into his pose.
const TALK_MS = 1600;
const FLAP_MS = 130;
const TYPE_MS = 28;

const POSE: Record<CommentatorMood, Frame> = {
  question: 'think',
  hurry: 'nervous',
  correct: 'cheer',
  wrong: 'shock',
};

type Props = {
  mood: CommentatorMood;
  // Picks which line he says; pass something stable per question.
  seed: string;
  size: number;
};

/**
 * Martie calls the quiz like a TV commentator: he talks a line into his
 * headset, then reacts in pose, with the line running in a lower third.
 */
export default function MartieCommentator(props: Props): JSX.Element {
  // A new mood or question starts the call fresh instead of carrying over
  // the last one's frame and typed text.
  return <Commentary key={`${props.seed}:${props.mood}`} {...props} />;
}

function Commentary({mood, seed, size}: Props): JSX.Element {
  const reduceMotion = useReducedMotion();
  const line = commentaryLine(mood, seed);
  const chars = Array.from(line);
  const [talking, setTalking] = useState(mood === 'question' && !reduceMotion);
  const [mouthOpen, setMouthOpen] = useState(true);
  const [typed, setTyped] = useState(reduceMotion ? chars.length : 0);

  const squash = useSharedValue(1);
  const shakeX = useSharedValue(0);
  const tilt = useSharedValue(0);
  const onAir = useSharedValue(1);

  useEffect(() => {
    if (!talking) return;
    const flap = setInterval(() => setMouthOpen((open) => !open), FLAP_MS);
    const done = setTimeout(() => setTalking(false), TALK_MS);
    return () => {
      clearInterval(flap);
      clearTimeout(done);
    };
  }, [talking]);

  // One character per tick until the line is out. Timers can run late on a
  // busy JS thread, so this counts characters, not elapsed time.
  useEffect(() => {
    if (typed >= chars.length) return;
    const next = setTimeout(() => setTyped(typed + 1), TYPE_MS);
    return () => clearTimeout(next);
  }, [typed, chars.length]);

  useEffect(() => {
    if (reduceMotion) return;
    onAir.value = withRepeat(withTiming(0.25, {duration: 600}), -1, true);
    switch (mood) {
      case 'question':
        // Breathing while he waits for your pick.
        squash.value = withRepeat(
          withSequence(
            withTiming(1.03, {duration: 700}),
            withTiming(1, {duration: 700}),
          ),
          -1,
        );
        break;
      case 'hurry':
        tilt.value = withRepeat(
          withSequence(
            withTiming(-2.5, {duration: 70}),
            withTiming(2.5, {duration: 70}),
          ),
          -1,
          true,
        );
        break;
      case 'correct':
        // Boing: squashes down, then springs up past his height.
        squash.value = withRepeat(
          withSequence(
            withTiming(0.86, {duration: 90}),
            withSpring(1, {damping: 5, stiffness: 320}),
          ),
          2,
        );
        break;
      case 'wrong':
        shakeX.value = withSequence(
          withTiming(-7, {duration: 50}),
          withTiming(7, {duration: 50}),
          withTiming(-5, {duration: 50}),
          withTiming(5, {duration: 50}),
          withTiming(0, {duration: 50}),
        );
        break;
    }
  }, [mood, reduceMotion, squash, shakeX, tilt, onAir]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: shakeX.value},
      // Squash from the feet, not the middle.
      {translateY: (size * (1 - squash.value)) / 2},
      {scaleX: 1 + (1 - squash.value) * 0.6},
      {scaleY: squash.value},
      {rotate: `${tilt.value}deg`},
    ],
  }));

  const onAirStyle = useAnimatedStyle(() => ({opacity: onAir.value}));

  const frame: Frame = talking
    ? mouthOpen
      ? 'talkOpen'
      : 'talkClosed'
    : POSE[mood];

  return (
    <View
      style={css`
        align-items: center;
      `}
    >
      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[{width: size, height: size}, bodyStyle]}
      >
        {/* Every frame stays mounted so switching never flashes blank. */}
        {FRAMES.map((name) => (
          <Image
            key={name}
            source={SPRITE_MARTIE_MC[name]}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              opacity: name === frame ? 1 : 0,
            }}
          />
        ))}
      </Animated.View>

      {/* The broadcast lower third. */}
      <View
        accessible
        accessibilityLabel={line}
        accessibilityLiveRegion="polite"
        style={[
          css`
            flex-direction: row;
            align-items: center;
            gap: 8px;
            max-width: 300px;
            margin-top: -12px;
            padding: 6px 12px;
            border-radius: 12px;
            border-width: 2px;
            border-color: #ffffff;
            background-color: ${INK};
          `,
          {transform: [{rotate: '-2deg'}]},
        ]}
      >
        <View
          style={css`
            flex-direction: row;
            align-items: center;
            gap: 4px;
          `}
        >
          <Animated.View
            style={[
              {
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: ON_AIR,
              },
              onAirStyle,
            ]}
          />
          <Text
            style={{
              color: ON_AIR,
              fontSize: 11,
              fontWeight: '900',
              letterSpacing: 0.5,
            }}
          >
            {t('commentator.live')}
          </Text>
        </View>
        <Text
          style={{
            flexShrink: 1,
            color: '#ffffff',
            fontSize: 13,
            fontWeight: '800',
          }}
        >
          {chars.slice(0, typed).join('')}
          {/* The untyped rest holds the width so the bar never grows. */}
          <Text testID="commentator-untyped" style={{color: 'transparent'}}>
            {chars.slice(typed).join('')}
          </Text>
        </Text>
      </View>
    </View>
  );
}
