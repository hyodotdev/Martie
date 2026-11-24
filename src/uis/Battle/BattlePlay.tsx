import {useEffect} from 'react';
import {Pressable, View} from 'react-native';
import {Typography, useCPK} from 'cpk-ui';
import {styled, css} from 'kstyled';
import {NotificationFeedbackType, notificationAsync} from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {otherRole, type BattleRole} from '../../../convex/battle/logic';
import {t} from '../../STRINGS';
import {useBattleCountdown} from '../../hooks/useBattleCountdown';
import {
  CountdownBadge,
  MartieHost,
  PlayerAvatar,
  RIVAL_COLOR,
  type MartieMood,
} from './BattleParts';
import {Burst, CREAM, INK, SOFT_SHADOW, Sticker, paperTint} from './Sticker';
import type {BattlePlayer, BattleRoom, BattleRound} from './types';

type Props = {
  room: BattleRoom;
  myRole: BattleRole;
  offsetMs: number;
  pendingOptionKey: string | null;
  onAnswer: (index: number, optionKey: string) => void;
};

type OptionState = 'idle' | 'correct' | 'wrong' | 'pending' | 'judging';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Whether I may press an option right now. */
export function canAnswer(
  phase: BattleRoom['phase'],
  round: BattleRound | null,
  myRole: BattleRole,
): boolean {
  if (!round) return false;
  if (phase === 'question') return round.first === null;
  if (phase === 'second_chance') {
    return round.first !== null && round.first.role !== myRole;
  }
  return false;
}

export function optionState(
  optionKey: string,
  round: BattleRound,
  pendingOptionKey: string | null,
): OptionState {
  if (round.correctOptionKey === optionKey) return 'correct';
  for (const buzz of [round.first, round.second]) {
    if (buzz?.optionKey !== optionKey) continue;
    if (buzz.correct === null) return 'judging';
    if (!buzz.correct) return 'wrong';
  }
  if (pendingOptionKey === optionKey) return 'pending';
  return 'idle';
}

/** Who picked this option, if anyone did. */
export function pickedBy(
  optionKey: string,
  round: BattleRound,
): BattleRole | null {
  if (round.second?.optionKey === optionKey) return round.second.role;
  if (round.first?.optionKey === optionKey) return round.first.role;
  return null;
}

/** What Martie says, and how Martie looks, at this moment of the match. */
export function hostLine(
  room: BattleRoom,
  myRole: BattleRole,
): {mood: MartieMood; message: string} {
  const round = room.round;
  const nameOf = (role: BattleRole) =>
    (role === 'host' ? room.host : room.guest)?.displayName ?? '';
  const opponentName = nameOf(otherRole(myRole));

  if (room.phase === 'countdown' || !round) {
    return {mood: 'smile', message: t('battle.mcCountdown')};
  }
  if (room.phase === 'judging') {
    const buzzer = round.second ?? round.first;
    if (buzzer?.role === myRole) {
      return {mood: 'impressed', message: t('battle.mcJudgingMe')};
    }
    return {mood: 'impressed', message: t('battle.mcJudging', {name: opponentName})};
  }
  if (room.phase === 'second_chance' && round.first) {
    return round.first.role === myRole
      ? {mood: 'sweat', message: t('battle.youMissed', {name: opponentName})}
      : {mood: 'smart', message: t('battle.opponentMissed', {name: opponentName})};
  }
  if (room.phase === 'reveal') {
    if (round.winner === myRole) {
      return {mood: 'smart', message: t('battle.youGotIt')};
    }
    if (round.winner) {
      return {mood: 'smile', message: t('battle.correctBy', {name: opponentName})};
    }
    return {mood: 'sweat', message: t('battle.nobodyCorrect')};
  }
  return {mood: 'basic', message: t('battle.mcQuestion')};
}

function PlayerScore({
  player,
  score,
  color,
  label,
  alignEnd,
  active,
}: {
  player: BattlePlayer | null;
  score: number;
  color: string;
  label: string;
  alignEnd?: boolean;
  active: boolean;
}): JSX.Element {
  return (
    <Sticker
      // The side whose turn it is lifts off the page in its own color.
      shadow={active ? color : SOFT_SHADOW}
      offset={active ? 3 : 2}
      radius={16}
      style={{flex: 1, transform: [{rotate: alignEnd ? '1.5deg' : '-1.5deg'}]}}
      faceStyle={{backgroundColor: active ? paperTint(color, 0.18) : '#FFFFFF'}}
    >
      <Side
        style={css`
          flex-direction: ${alignEnd ? 'row-reverse' : 'row'};
        `}
      >
        {player ? <PlayerAvatar player={player} size={30} ringColor={color} /> : null}
        <View
          style={css`
            flex: 1;
            align-items: ${alignEnd ? 'flex-end' : 'flex-start'};
          `}
        >
          <Typography.Body4
            numberOfLines={1}
            style={css`
              color: ${INK};
              font-weight: 800;
              opacity: 0.7;
            `}
          >
            {label}
          </Typography.Body4>
          <Typography.Heading3
            style={css`
              font-weight: 900;
              color: ${color};
            `}
          >
            {score}
          </Typography.Heading3>
        </View>
      </Side>
    </Sticker>
  );
}

function TimerBar({
  leftMs,
  totalMs,
  color,
}: {
  leftMs: number;
  totalMs: number;
  color: string;
}): JSX.Element {
  const ratio = Math.max(0, Math.min(1, leftMs / Math.max(1, totalMs)));
  return (
    <TimerRow>
      <TimerTrack>
        <View
          style={{
            width: `${Math.round(ratio * 100)}%`,
            height: '100%',
            borderRadius: 5,
            backgroundColor: color,
          }}
        />
      </TimerTrack>
      <Typography.Body2
        style={css`
          width: 28px;
          text-align: right;
          font-weight: 900;
          color: ${color};
        `}
      >
        {Math.ceil(leftMs / 1000)}
      </Typography.Body2>
    </TimerRow>
  );
}

function OptionCard({
  letter,
  description,
  state,
  pickerColor,
  pickerName,
  disabled,
  dimmed,
  onPress,
}: {
  letter: string;
  description: string;
  state: OptionState;
  pickerColor: string | null;
  pickerName: string | null;
  disabled: boolean;
  dimmed: boolean;
  onPress: () => void;
}): JSX.Element {
  const {theme} = useCPK();
  const pulse = useSharedValue(1);
  const isJudging = state === 'judging' || state === 'pending';

  useEffect(() => {
    pulse.value = isJudging
      ? withRepeat(
          withSequence(
            withTiming(1.03, {duration: 350}),
            withTiming(1, {duration: 350}),
          ),
          -1,
        )
      : withTiming(1, {duration: 120});
  }, [isJudging, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{scale: pulse.value}],
  }));

  const accent =
    state === 'correct'
      ? theme.role.success
      : state === 'wrong'
        ? theme.role.danger
        : isJudging
          ? (pickerColor ?? theme.role.primary)
          : null;
  const mark = state === 'correct' ? '✓' : state === 'wrong' ? '✕' : letter;

  return (
    <Animated.View style={[{opacity: dimmed ? 0.45 : 1}, pulseStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={description}
        accessibilityState={{disabled}}
        disabled={disabled}
        onPress={onPress}
      >
        {({pressed}) => (
          // Pressing an answer pushes the card down onto its shadow.
          <Sticker
            shadow={accent ?? SOFT_SHADOW}
            offset={pressed ? 0 : 3}
            radius={16}
            style={{transform: [{translateY: pressed ? 3 : 0}]}}
            faceStyle={{backgroundColor: accent ? paperTint(accent, 0.16) : '#FFFFFF'}}
          >
            <OptionBox>
              <LetterBadge
                style={css`
                  background-color: ${accent ?? CREAM};
                `}
              >
                <Typography.Body2
                  style={css`
                    font-weight: 900;
                    color: ${accent ? '#FFFFFF' : INK};
                  `}
                >
                  {mark}
                </Typography.Body2>
              </LetterBadge>
              <Typography.Body1
                style={css`
                  flex: 1;
                  color: ${INK};
                  font-weight: ${accent ? '800' : '600'};
                `}
              >
                {description}
              </Typography.Body1>
              {pickerName && pickerColor ? (
                <PickerTag
                  style={{
                    backgroundColor: pickerColor,
                    transform: [{rotate: '-5deg'}],
                  }}
                >
                  <Typography.Body4
                    numberOfLines={1}
                    style={css`
                      color: #ffffff;
                      font-weight: 900;
                    `}
                  >
                    {pickerName}
                  </Typography.Body4>
                </PickerTag>
              ) : null}
            </OptionBox>
          </Sticker>
        )}
      </Pressable>
    </Animated.View>
  );
}

/** The match opens with a slam, right after the lobby countdown. */
function GoBurst({color}: {color: string}): JSX.Element {
  const slam = useSharedValue(1.8);
  useEffect(() => {
    slam.set(withSpring(1, {damping: 11, stiffness: 240}));
  }, [slam]);
  const slamStyle = useAnimatedStyle(() => ({
    transform: [{rotate: '-8deg'}, {scale: slam.get()}],
  }));

  return (
    <Animated.View style={slamStyle}>
      <Burst size={190} color={color}>
        <Typography.Heading1
          accessibilityLiveRegion="assertive"
          style={css`
            color: #ffffff;
            font-size: 44px;
            line-height: 54px;
            font-weight: 900;
          `}
        >
          {t('battle.go')}
        </Typography.Heading1>
      </Burst>
    </Animated.View>
  );
}

export default function BattlePlay({
  room,
  myRole,
  offsetMs,
  pendingOptionKey,
  onAnswer,
}: Props): JSX.Element {
  const {theme} = useCPK();
  const leftMs = useBattleCountdown(room.phaseEndsAt, offsetMs);
  const me = myRole === 'host' ? room.host : room.guest;
  const opponent = myRole === 'host' ? room.guest : room.host;
  const myScore = myRole === 'host' ? room.hostScore : room.guestScore;
  const opponentScore = myRole === 'host' ? room.guestScore : room.hostScore;
  const myColor = theme.role.primary;
  const colorOf = (role: BattleRole) => (role === myRole ? myColor : RIVAL_COLOR);
  const nameOf = (role: BattleRole) =>
    role === myRole ? t('battle.me') : (opponent?.displayName ?? '');
  const line = hostLine(room, myRole);
  const round = room.round;
  const revealWinner = room.phase === 'reveal' ? (round?.winner ?? null) : null;

  useEffect(() => {
    if (!revealWinner) return;
    void notificationAsync(
      revealWinner === myRole
        ? NotificationFeedbackType.Success
        : NotificationFeedbackType.Warning,
    ).catch(() => {});
  }, [myRole, revealWinner, round?.index]);

  const turnRole: BattleRole | null =
    room.phase === 'second_chance' && round?.first
      ? otherRole(round.first.role)
      : null;

  const scoreboard = (
    <ScoreRow
      accessibilityLabel={t('battle.score', {mine: myScore, theirs: opponentScore})}
    >
      <PlayerScore
        player={me}
        score={myScore}
        color={myColor}
        label={t('battle.me')}
        active={turnRole === myRole}
      />
      <View style={{zIndex: 1, marginHorizontal: -14, transform: [{rotate: '-8deg'}]}}>
        <Burst size={44}>
          <Typography.Body3
            style={css`
              color: ${INK};
              font-weight: 900;
              font-style: italic;
            `}
          >
            VS
          </Typography.Body3>
        </Burst>
      </View>
      <PlayerScore
        player={opponent}
        score={opponentScore}
        color={RIVAL_COLOR}
        label={opponent?.displayName ?? ''}
        alignEnd
        active={turnRole !== null && turnRole !== myRole}
      />
    </ScoreRow>
  );

  if (room.phase === 'countdown' || !round) {
    return (
      <Container>
        {scoreboard}
        <Center>
          <MartieHost mood={line.mood} message={line.message} size={96} />
          <GoBurst color={myColor} />
        </Center>
      </Container>
    );
  }

  const enabled = canAnswer(room.phase, round, myRole) && pendingOptionKey === null;
  const phaseMs =
    room.phaseEndsAt !== null && room.phaseStartedAt !== null
      ? room.phaseEndsAt - room.phaseStartedAt
      : 1;
  const correctOption = round.options.find((o) => o.key === round.correctOptionKey);
  const judgingBuzz = room.phase === 'judging' ? (round.second ?? round.first) : null;
  const timerColor =
    leftMs < 4000 ? theme.role.danger : turnRole ? colorOf(turnRole) : myColor;

  return (
    <Container>
      {scoreboard}

      <MartieHost
        mood={line.mood}
        message={line.message}
        accessory={
          judgingBuzz ? (
            <CountdownBadge
              seconds={Math.max(1, Math.ceil(leftMs / 1000))}
              color={colorOf(judgingBuzz.role)}
            />
          ) : null
        }
      />

      <Sticker
        offset={3}
        radius={20}
        style={{marginTop: 8}}
        faceStyle={{backgroundColor: QUESTION_BG}}
      >
        <QuestionBody>
          {/* The question number is a tag slapped on the card's corner. */}
          <QuestionTag
            style={{backgroundColor: myColor, transform: [{rotate: '-4deg'}]}}
          >
            <Typography.Body3
              style={css`
                font-weight: 900;
                color: #ffffff;
              `}
            >
              {t('battle.questionOf', {
                current: round.index + 1,
                total: room.totalQuestions,
              })}
            </Typography.Body3>
          </QuestionTag>
          <Typography.Heading4
            style={css`
              color: ${INK};
              font-weight: 900;
            `}
          >
            {round.question}
          </Typography.Heading4>
          {room.phase === 'question' || room.phase === 'second_chance' ? (
            <TimerBar leftMs={leftMs} totalMs={phaseMs} color={timerColor} />
          ) : null}
        </QuestionBody>
      </Sticker>

      <View style={css`gap: 12px;`}>
        {round.options.map((option, index) => {
          const state = optionState(option.key, round, pendingOptionKey);
          const picker =
            pickedBy(option.key, round) ??
            (state === 'pending' ? myRole : null);
          const settled = room.phase === 'judging' || room.phase === 'reveal';
          return (
            <OptionCard
              key={option.key}
              letter={OPTION_LETTERS[index] ?? String(index + 1)}
              description={option.description}
              state={state}
              pickerColor={picker ? colorOf(picker) : null}
              pickerName={picker ? nameOf(picker) : null}
              disabled={!enabled || state === 'wrong'}
              dimmed={settled && state === 'idle'}
              onPress={() => onAnswer(round.index, option.key)}
            />
          );
        })}
      </View>

      {room.phase === 'reveal' && correctOption ? (
        <Sticker
          shadow={theme.role.success}
          offset={3}
          radius={16}
          faceStyle={{backgroundColor: CREAM}}
        >
          <Typography.Body3
            style={css`
              padding: 14px 16px;
              color: ${INK};
              font-weight: 600;
              line-height: 20px;
            `}
          >
            {round.answerDescription ||
              t('battle.answerIs', {answer: correctOption.description})}
          </Typography.Body3>
        </Sticker>
      ) : null}
    </Container>
  );
}

const Container = styled.View`
  padding: 16px 16px 32px;
  gap: 14px;
`;

const ScoreRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const Side = styled.View`
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
`;

const Center = styled.View`
  align-items: center;
  justify-content: center;
  padding: 32px 0;
  gap: 24px;
`;

// A warm card, like the lobby arena, so the question reads as the stage.
const QUESTION_BG = '#FFF1C9';

const QuestionBody = styled.View`
  padding: 22px 18px 18px;
  gap: 12px;
`;

const QuestionTag = styled.View`
  position: absolute;
  top: -14px;
  left: 14px;
  padding: 3px 12px;
  border-radius: 10px;
  border-width: 1.5px;
  border-color: ${INK};
`;

const TimerRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
`;

const TimerTrack = styled.View`
  flex: 1;
  height: 14px;
  padding: 1px;
  border-radius: 8px;
  overflow: hidden;
  border-width: 1.5px;
  border-color: ${INK};
  background-color: ${CREAM};
`;

const OptionBox = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 13px 14px;
`;

const LetterBadge = styled.View`
  width: 34px;
  height: 34px;
  border-radius: 17px;
  align-items: center;
  justify-content: center;
  border-width: 1.5px;
  border-color: ${INK};
`;

const PickerTag = styled.View`
  max-width: 96px;
  padding: 3px 8px;
  border-radius: 10px;
  border-width: 1.5px;
  border-color: ${INK};
`;
