import {useEffect} from 'react';
import {Image, View, type ImageSourcePropType} from 'react-native';
import {Typography, useCPK} from 'cpk-ui';
import {styled, css} from 'kstyled';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  IC_MARTIE_BASIC,
  IC_MARTIE_IMPRESSED,
  IC_MARTIE_SLEEP,
  IC_MARTIE_SMART,
  IC_MARTIE_SMILE,
  IC_MARTIE_SWEAT,
} from '../../icons';
import ButtonMartie from '../ButtonMartie';
import type {BattleErrorReason} from './battleMessages';

export type NoticeKind = BattleErrorReason | 'invite';

/** Martie's face and a prop emoji for each dead end of a battle room. */
export function noticeArt(kind: NoticeKind): {
  image: ImageSourcePropType;
  emoji: string;
} {
  switch (kind) {
    case 'invite':
      return {image: IC_MARTIE_SMILE, emoji: '⚔️'};
    case 'closed':
      return {image: IC_MARTIE_SWEAT, emoji: '🚪'};
    case 'host_offline':
    case 'opponent_offline':
    case 'no_opponent':
      return {image: IC_MARTIE_SLEEP, emoji: '💤'};
    case 'kicked':
      return {image: IC_MARTIE_SWEAT, emoji: '👋'};
    case 'full':
      return {image: IC_MARTIE_IMPRESSED, emoji: '🔒'};
    case 'started':
    case 'not_waiting':
    case 'too_late':
    case 'not_in_round':
    case 'not_playing':
      return {image: IC_MARTIE_IMPRESSED, emoji: '⏱️'};
    case 'finished':
      return {image: IC_MARTIE_SMART, emoji: '🏁'};
    case 'insufficient_bulbs':
    case 'opponent_insufficient_bulbs':
      return {image: IC_MARTIE_SWEAT, emoji: '💡'};
    case 'invalid_code':
    case 'not_found':
      return {image: IC_MARTIE_SMART, emoji: '🔍'};
    default:
      return {image: IC_MARTIE_BASIC, emoji: '❗'};
  }
}

/** A full-screen dead end hosted by Martie, with one way out. */
export default function BattleNotice({
  kind,
  message,
  actionText,
  onAction,
}: {
  kind: NoticeKind;
  message: string;
  actionText: string;
  onAction: () => void;
}): JSX.Element {
  const {theme} = useCPK();
  const {image, emoji} = noticeArt(kind);
  const bob = useSharedValue(0);
  const wiggle = useSharedValue(0);

  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(-8, {duration: 900}),
        withTiming(0, {duration: 900}),
      ),
      -1,
    );
    wiggle.value = withRepeat(
      withSequence(
        withTiming(-12, {duration: 160}),
        withTiming(12, {duration: 160}),
        withTiming(0, {duration: 160}),
        withTiming(0, {duration: 1400}),
      ),
      -1,
    );
  }, [bob, wiggle]);

  const bobStyle = useAnimatedStyle(() => ({
    transform: [{translateY: bob.value}],
  }));
  const wiggleStyle = useAnimatedStyle(() => ({
    transform: [{rotate: `${wiggle.value}deg`}],
  }));

  return (
    <Container>
      <Stage>
        <Halo style={{backgroundColor: theme.role.primary + '14'}}>
          <InnerRing style={{borderColor: theme.role.primary + '40'}} />
        </Halo>
        <Animated.View style={bobStyle}>
          <Image
            accessibilityIgnoresInvertColors
            source={image}
            resizeMode="contain"
            style={{width: 150, height: 150}}
          />
        </Animated.View>
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 18,
              right: 14,
              width: 58,
              height: 58,
              borderRadius: 29,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.bg.basic,
              borderWidth: 2,
              borderColor: theme.role.border,
            },
            wiggleStyle,
          ]}
        >
          <Typography.Heading3>{emoji}</Typography.Heading3>
        </Animated.View>
        <Shadow />
      </Stage>

      <Bubble>
        <BubbleTail style={{left: '50%', transform: [{rotate: '45deg'}]}} />
        <Typography.Heading5
          accessibilityLiveRegion="polite"
          style={css`
            text-align: center;
            font-weight: 800;
            line-height: 28px;
          `}
        >
          {message}
        </Typography.Heading5>
      </Bubble>

      <View
        style={css`
          align-self: stretch;
        `}
      >
        <ButtonMartie
          onPress={onAction}
          text={actionText}
          borderRadius={14}
          color="primary"
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
      </View>
    </Container>
  );
}

const Container = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 22px;
  padding: 32px 24px;
`;

const Stage = styled.View`
  width: 220px;
  height: 220px;
  align-items: center;
  justify-content: center;
`;

const Halo = styled.View`
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 100px;
  align-items: center;
  justify-content: center;
`;

const InnerRing = styled.View`
  width: 172px;
  height: 172px;
  border-radius: 86px;
  border-width: 2px;
  border-style: dashed;
`;

const Shadow = styled.View`
  position: absolute;
  bottom: 22px;
  width: 90px;
  height: 10px;
  border-radius: 5px;
  background-color: #00000014;
`;

const Bubble = styled.View`
  align-self: stretch;
  padding: 18px 20px;
  border-radius: 20px;
  border-width: 2px;
  border-color: ${({theme}) => theme.text.basic + '1A'};
  background-color: ${({theme}) => theme.bg.paper};
`;

const BubbleTail = styled.View`
  position: absolute;
  top: -8px;
  margin-left: -7px;
  width: 14px;
  height: 14px;
  background-color: ${({theme}) => theme.bg.paper};
  border-left-width: 2px;
  border-top-width: 2px;
  border-color: ${({theme}) => theme.text.basic + '1A'};
`;
