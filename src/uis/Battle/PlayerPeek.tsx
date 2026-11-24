import {useEffect} from 'react';
import {Image, Modal, Pressable, StyleSheet, View} from 'react-native';
import {Typography, useCPK} from 'cpk-ui';
import {styled, css} from 'kstyled';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {winRate, type BattleRecord} from '../../../convex/battle/logic';
import {IC_MARTIE_SMILE} from '../../icons';
import {t} from '../../STRINGS';
import {HeadToHead, PlayerAvatar} from './BattleParts';
import {RecordColumns} from './BattleRecordCard';
import type {BattlePlayer} from './types';

type Props = {
  player: BattlePlayer | null;
  isMe: boolean;
  isHost: boolean;
  color: string;
  headToHead: BattleRecord | null;
  status: string;
  // A held peek closes when the finger lifts; a tapped one waits for a tap.
  sticky: boolean;
  onClose: () => void;
  // Only the host gets this, on the guest's card.
  onKick?: () => void;
};

/** A player's profile card that pops over the lobby, Instagram-peek style. */
export default function PlayerPeek({
  player,
  isMe,
  isHost,
  color,
  headToHead,
  status,
  sticky,
  onClose,
  onKick,
}: Props): JSX.Element {
  const {theme} = useCPK();
  const scale = useSharedValue(0.8);
  const fade = useSharedValue(0);
  const visible = player !== null;

  useEffect(() => {
    if (!visible) return;
    scale.value = 0.8;
    fade.value = 0;
    scale.value = withSpring(1, {damping: 14, stiffness: 260});
    fade.value = withTiming(1, {duration: 140});
  }, [visible, scale, fade]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{scale: scale.value}],
  }));
  const backdropStyle = useAnimatedStyle(() => ({opacity: fade.value}));

  const rate = player ? winRate(player.record) : null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, {backgroundColor: '#000000A6'}, backdropStyle]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('battle.closeProfile')}
          disabled={!sticky}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Center pointerEvents="box-none">
        {player ? (
          <Animated.View style={[{width: '84%', maxWidth: 360}, cardStyle]}>
            <Card>
              <Banner style={{backgroundColor: color}}>
                <Image
                  accessibilityIgnoresInvertColors
                  source={IC_MARTIE_SMILE}
                  resizeMode="contain"
                  style={{
                    position: 'absolute',
                    right: 14,
                    bottom: -6,
                    width: 58,
                    height: 58,
                    transform: [{rotate: '-10deg'}],
                  }}
                />
              </Banner>
              <View
                style={css`
                  margin-top: -56px;
                  align-items: center;
                `}
              >
                <View
                  style={css`
                    border-radius: 60px;
                    padding: 4px;
                    background-color: ${theme.bg.basic};
                  `}
                >
                  <PlayerAvatar player={player} size={96} ringColor={color} />
                </View>
              </View>

              <Typography.Heading4
                numberOfLines={2}
                style={css`
                  font-weight: 900;
                  text-align: center;
                `}
              >
                {player.displayName}
              </Typography.Heading4>

              <ChipRow>
                {isMe ? (
                  <Chip style={{backgroundColor: color}}>
                    <Typography.Body4
                      style={css`
                        color: #ffffff;
                        font-weight: 800;
                      `}
                    >
                      {t('battle.me')}
                    </Typography.Body4>
                  </Chip>
                ) : null}
                {isHost ? (
                  <Chip style={{backgroundColor: theme.bg.paper}}>
                    <Typography.Body4
                      style={css`
                        font-weight: 800;
                      `}
                    >
                      👑 {t('battle.host')}
                    </Typography.Body4>
                  </Chip>
                ) : null}
                <Chip style={{backgroundColor: theme.bg.paper}}>
                  <Typography.Body4
                    style={css`
                      font-weight: 800;
                    `}
                  >
                    {status}
                  </Typography.Body4>
                </Chip>
              </ChipRow>

              <Section>
                <SectionHeader>
                  <Typography.Body3
                    style={css`
                      font-weight: 800;
                    `}
                  >
                    🏆 {isMe ? t('battle.myRecord') : t('battle.record')}
                  </Typography.Body3>
                  <Typography.Body3
                    style={css`
                      font-weight: 800;
                      color: ${color};
                    `}
                  >
                    {rate === null ? '—' : t('battle.winRate', {rate})}
                  </Typography.Body3>
                </SectionHeader>
                <RecordColumns record={player.record} />
              </Section>

              {!isMe && headToHead ? (
                <HeadToHead record={headToHead} opponentName={player.displayName} />
              ) : null}

              {onKick && sticky ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={onKick}
                  style={({pressed}) => ({
                    alignSelf: 'center',
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    opacity: pressed ? 0.5 : 1,
                  })}
                >
                  <Typography.Body3
                    style={css`
                      font-weight: 700;
                      color: ${theme.role.danger};
                    `}
                  >
                    {t('battle.kick')}
                  </Typography.Body3>
                </Pressable>
              ) : null}
            </Card>
          </Animated.View>
        ) : null}
      </Center>
    </Modal>
  );
}

const Center = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
`;

const Card = styled.View`
  overflow: hidden;
  gap: 14px;
  padding: 0 20px 22px;
  border-radius: 28px;
  background-color: ${({theme}) => theme.bg.basic};
`;

const Banner = styled.View`
  height: 84px;
  margin: 0 -20px;
  overflow: hidden;
`;

const ChipRow = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
`;

const Chip = styled.View`
  padding: 5px 12px;
  border-radius: 12px;
`;

const Section = styled.View`
  gap: 10px;
  padding: 14px 12px;
  border-radius: 18px;
  background-color: ${({theme}) => theme.bg.paper};
`;

const SectionHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
`;
