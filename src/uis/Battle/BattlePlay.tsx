import {Pressable, View} from 'react-native';
import {Typography, useCPK} from 'cpk-ui';
import {styled, css} from 'kstyled';
import {otherRole, type BattleRole} from '../../../convex/battle/logic';
import {t} from '../../STRINGS';
import {useBattleCountdown} from '../../hooks/useBattleCountdown';
import ProgressBar from '../ProgressBar';
import type {BattleRoom, BattleRound} from './types';

type Props = {
  room: BattleRoom;
  myRole: BattleRole;
  offsetMs: number;
  pendingOptionKey: string | null;
  onAnswer: (index: number, optionKey: string) => void;
};

type OptionState = 'idle' | 'correct' | 'wrong' | 'pending';

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
  if (round.first?.optionKey === optionKey && !round.first.correct) {
    return 'wrong';
  }
  if (round.second?.optionKey === optionKey && !round.second.correct) {
    return 'wrong';
  }
  if (pendingOptionKey === optionKey) return 'pending';
  return 'idle';
}

function statusLine(
  room: BattleRoom,
  round: BattleRound,
  myRole: BattleRole,
): string | null {
  const nameOf = (role: BattleRole) =>
    role === myRole
      ? t('battle.me')
      : ((role === 'host' ? room.host : room.guest)?.displayName ?? '');
  const opponentName = nameOf(otherRole(myRole));

  if (room.phase === 'reveal') {
    return round.winner ? t('battle.correctBy', {name: nameOf(round.winner)}) : t('battle.nobodyCorrect');
  }
  if (room.phase === 'second_chance' && round.first) {
    return round.first.role === myRole
      ? t('battle.youMissed', {name: opponentName})
      : t('battle.opponentMissed', {name: opponentName});
  }
  return null;
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

  const scoreboard = (
    <ScoreRow
      accessibilityLabel={t('battle.score', {mine: myScore, theirs: opponentScore})}
    >
      <Typography.Body2 numberOfLines={1} style={css`flex: 1; font-weight: 700;`}>
        {me?.displayName} ({t('battle.me')})
      </Typography.Body2>
      <Typography.Heading4 style={css`font-weight: 900;`}>
        {t('battle.score', {mine: myScore, theirs: opponentScore})}
      </Typography.Heading4>
      <Typography.Body2
        numberOfLines={1}
        style={css`flex: 1; text-align: right; font-weight: 700;`}
      >
        {opponent?.displayName}
      </Typography.Body2>
    </ScoreRow>
  );

  if (room.phase === 'countdown' || !room.round) {
    return (
      <Container>
        {scoreboard}
        <Center accessibilityLiveRegion="polite">
          <Typography.Heading4>{t('battle.getReady')}</Typography.Heading4>
          <Typography.Heading1 style={css`font-size: 72px; font-weight: 900;`}>
            {Math.max(1, Math.ceil(leftMs / 1000))}
          </Typography.Heading1>
        </Center>
      </Container>
    );
  }

  const round = room.round;
  const enabled = canAnswer(room.phase, round, myRole) && pendingOptionKey === null;
  const phaseMs =
    room.phaseEndsAt !== null && room.phaseStartedAt !== null
      ? room.phaseEndsAt - room.phaseStartedAt
      : 1;
  const status = statusLine(room, round, myRole);
  const correctOption = round.options.find((o) => o.key === round.correctOptionKey);

  return (
    <Container>
      {scoreboard}
      <Typography.Body3 style={css`opacity: 0.6;`}>
        {t('battle.questionOf', {
          current: round.index + 1,
          total: room.totalQuestions,
        })}
      </Typography.Body3>
      {room.phase !== 'reveal' ? (
        <ProgressBar progress={Math.round((leftMs / phaseMs) * 100)} />
      ) : null}
      <Typography.Heading4 style={css`font-weight: 700;`}>
        {round.question}
      </Typography.Heading4>

      <View style={css`gap: 10px;`}>
        {round.options.map((option) => {
          const state = optionState(option.key, round, pendingOptionKey);
          const borderColor =
            state === 'correct'
              ? theme.role.success
              : state === 'wrong'
                ? theme.role.danger
                : state === 'pending'
                  ? theme.role.primary
                  : theme.role.border;
          const disabled = !enabled || state === 'wrong';
          return (
            <Pressable
              key={option.key}
              accessibilityRole="button"
              accessibilityLabel={option.description}
              accessibilityState={{disabled}}
              disabled={disabled}
              onPress={() => onAnswer(round.index, option.key)}
            >
              <OptionBox
                style={css`
                  border-color: ${borderColor};
                  background-color: ${state === 'idle'
                    ? theme.bg.paper
                    : borderColor + '1A'};
                  opacity: ${disabled && state === 'idle' ? 0.6 : 1};
                `}
              >
                <Typography.Body1>{option.description}</Typography.Body1>
              </OptionBox>
            </Pressable>
          );
        })}
      </View>

      {status ? (
        <Typography.Body2
          accessibilityLiveRegion="polite"
          style={css`text-align: center; font-weight: 700;`}
        >
          {status}
        </Typography.Body2>
      ) : null}
      {room.phase === 'reveal' && correctOption ? (
        <Typography.Body3 style={css`text-align: center; opacity: 0.7;`}>
          {round.answerDescription ||
            t('battle.answerIs', {answer: correctOption.description})}
        </Typography.Body3>
      ) : null}
    </Container>
  );
}

const Container = styled.View`
  padding: 20px;
  gap: 16px;
`;

const ScoreRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 14px;
  background-color: ${({theme}) => theme.bg.paper};
  border-width: 1px;
  border-color: ${({theme}) => theme.role.border};
`;

const Center = styled.View`
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  gap: 12px;
`;

const OptionBox = styled.View`
  padding: 16px;
  border-radius: 14px;
  border-width: 2px;
`;
