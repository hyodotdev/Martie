import {useEffect, useState} from 'react';
import {Text, View} from 'react-native';
import {Image} from 'expo-image';
import {css, styled} from 'kstyled';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {SPRITE_MARTIE_MC} from '../../icons';
import {commentaryLine, type CommentatorMood} from './lines';

export type {CommentatorMood} from './lines';

type Frame = keyof typeof SPRITE_MARTIE_MC;

const FRAMES = Object.keys(SPRITE_MARTIE_MC) as Frame[];
// Lets him land on screen before he starts talking to you.
const SPEAK_DELAY_MS = 700;
// How long the typing dots show before his line comes in.
const DOTS_MS = 550;
const FLAP_MS = 130;
const TYPE_MS = 38;

const POSE: Record<CommentatorMood, Frame> = {
  question: 'think',
  hurry: 'nervous',
  correct: 'cheer',
  wrong: 'shock',
  timeout: 'nervous',
};

// quiet: not talking yet. dots: about to say something. speaking: typing.
type Stage = 'quiet' | 'dots' | 'speaking';

type Props = {
  mood: CommentatorMood;
  // Picks which line he says; pass something stable per question.
  seed: string;
  size: number;
};

/**
 * Martie talks to the player about the quiz: he reacts in pose, then says
 * a line to them in a chat bubble.
 */
export default function MartieCommentator(props: Props): JSX.Element {
  // A new question starts the conversation fresh instead of carrying over the
  // last one's frame and typed text.
  return <Commentary key={props.seed} {...props} />;
}

function Commentary({mood, seed, size}: Props): JSX.Element {
  const reduceMotion = useReducedMotion();
  const line = commentaryLine(mood, seed);
  const chars = Array.from(line);
  const [stage, setStage] = useState<Stage>(
    reduceMotion ? 'speaking' : 'quiet',
  );
  const [mouthOpen, setMouthOpen] = useState(true);
  const [typed, setTyped] = useState(reduceMotion ? chars.length : 0);
  const [lineMood, setLineMood] = useState(mood);

  // A new mood brings a new line. Resetting here instead of remounting keeps
  // the frames loaded, so the pose change never flashes blank. He is already
  // on screen, so he goes straight to the typing dots.
  if (lineMood !== mood) {
    setLineMood(mood);
    setStage(reduceMotion ? 'speaking' : 'dots');
    setTyped(reduceMotion ? chars.length : 0);
  }

  const talking =
    mood === 'question' && stage === 'speaking' && typed < chars.length;

  const squash = useSharedValue(1);
  const shakeX = useSharedValue(0);
  const tilt = useSharedValue(0);
  const bubbleIn = useSharedValue(reduceMotion ? 1 : 0);
  const dots = useSharedValue(1);

  useEffect(() => {
    if (stage === 'speaking') return;
    const next = setTimeout(
      () => setStage(stage === 'quiet' ? 'dots' : 'speaking'),
      stage === 'quiet' ? SPEAK_DELAY_MS : DOTS_MS,
    );
    return () => clearTimeout(next);
  }, [stage]);

  useEffect(() => {
    if (!talking) return;
    const flap = setInterval(() => setMouthOpen((open) => !open), FLAP_MS);
    return () => clearInterval(flap);
  }, [talking]);

  // One character per tick until the line is out. Timers can run late on a
  // busy JS thread, so this counts characters, not elapsed time.
  useEffect(() => {
    if (stage !== 'speaking' || typed >= chars.length) return;
    const next = setTimeout(() => setTyped(typed + 1), TYPE_MS);
    return () => clearTimeout(next);
  }, [stage, typed, chars.length]);

  useEffect(() => {
    if (reduceMotion || stage === 'quiet') return;
    bubbleIn.value = withTiming(1, {duration: 220});
  }, [stage, reduceMotion, bubbleIn]);

  useEffect(() => {
    if (reduceMotion || stage !== 'dots') return;
    dots.value = withRepeat(
      withSequence(
        withTiming(0.3, {duration: 260}),
        withTiming(1, {duration: 260}),
      ),
      -1,
    );
  }, [stage, reduceMotion, dots]);

  useEffect(() => {
    if (reduceMotion) return;
    // Stop the last mood's motion before this one starts.
    squash.value = 1;
    shakeX.value = 0;
    tilt.value = 0;
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
        squash.value = withDelay(
          SPEAK_DELAY_MS / 2,
          withSequence(
            withTiming(0.86, {duration: 90}),
            withSpring(1, {damping: 5, stiffness: 320}),
          ),
        );
        break;
      case 'wrong':
      case 'timeout':
        shakeX.value = withDelay(
          SPEAK_DELAY_MS / 2,
          withSequence(
            withTiming(-7, {duration: 50}),
            withTiming(7, {duration: 50}),
            withTiming(-5, {duration: 50}),
            withTiming(5, {duration: 50}),
            withTiming(0, {duration: 50}),
          ),
        );
        break;
    }
  }, [mood, reduceMotion, squash, shakeX, tilt]);

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

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: bubbleIn.value,
    transform: [{translateY: (1 - bubbleIn.value) * -6}],
  }));

  const dotsStyle = useAnimatedStyle(() => ({opacity: dots.value}));

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

      {/* What he says to you, in a chat bubble pointing back at him. It
          always takes its full size, so nothing moves when it appears. */}
      <Animated.View
        testID="commentator-bubble"
        accessible
        accessibilityLabel={line}
        style={[
          css`
            align-items: center;
            max-width: 280px;
          `,
          bubbleStyle,
        ]}
      >
        <Tail />
        <Speech>
          <SpeechText>
            {stage === 'speaking' ? chars.slice(0, typed).join('') : ''}
            {/* The rest holds the width so the bubble never grows. */}
            <Text testID="commentator-untyped" style={{color: 'transparent'}}>
              {stage === 'speaking' ? chars.slice(typed).join('') : line}
            </Text>
          </SpeechText>
          {stage === 'dots' && (
            <Dots style={dotsStyle}>
              <DotsText>•••</DotsText>
            </Dots>
          )}
        </Speech>
      </Animated.View>
    </View>
  );
}

const Tail = styled.View`
  width: 0;
  height: 0;
  border-left-width: 8px;
  border-right-width: 8px;
  border-bottom-width: 9px;
  border-left-color: transparent;
  border-right-color: transparent;
  border-bottom-color: ${({theme}) => theme.role.border};
  margin-bottom: -1px;
`;

const Speech = styled.View`
  padding: 10px 16px;
  border-radius: 18px;
  border-width: 3px;
  border-color: ${({theme}) => theme.role.border};
  background-color: ${({theme}) => theme.bg.bubble};
  justify-content: center;
`;

const SpeechText = styled.Text`
  color: ${({theme}) => theme.text.basic};
  font-size: 14px;
  font-weight: 700;
  text-align: center;
`;

const Dots = styled(Animated.View)`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  align-items: center;
  justify-content: center;
`;

const DotsText = styled.Text`
  color: ${({theme}) => theme.text.label};
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 2px;
`;
