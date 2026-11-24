import {useCallback, useEffect, useRef, useState} from 'react';
import {AppState} from 'react-native';
import {useConvexAuth, useMutation, useQuery} from 'convex/react';
import {api} from '../../convex/_generated/api';
import {BATTLE_HEARTBEAT_MS} from '../../convex/battle/logic';
import {getLocale} from '../STRINGS';
import {estimateClockOffset} from '../utils/battle';
import {logError} from '../utils/error';

type QuizLanguage = 'en' | 'ko' | 'ja';

export type BattleJoinError =
  | 'not_authenticated'
  | 'no_profile'
  | 'invalid_code'
  | 'not_found'
  | 'closed'
  | 'finished'
  | 'started'
  | 'full'
  | 'host_offline'
  | 'insufficient_bulbs'
  | 'kicked'
  | 'network';

function quizLanguage(): QuizLanguage {
  const locale = getLocale();
  return locale === 'ko' || locale === 'ja' ? locale : 'en';
}

/**
 * Subscribes to a battle room, takes the seat, keeps it with heartbeats and
 * keeps an estimate of the server clock for the countdowns.
 */
export function useBattleRoom(code: string) {
  const {isAuthenticated, isLoading: isAuthLoading} = useConvexAuth();
  const room = useQuery(api.battle.queries.getRoom, {
    code,
    language: quizLanguage(),
  });
  const joinRoom = useMutation(api.battle.mutations.joinRoom);
  const heartbeat = useMutation(api.battle.mutations.heartbeat);
  const leaveRoom = useMutation(api.battle.mutations.leave);

  const [offsetMs, setOffsetMs] = useState(0);
  const [joinError, setJoinError] = useState<BattleJoinError | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const joinedKeyRef = useRef<string | null>(null);

  const syncClock = useCallback(
    (sentAt: number, serverNow: number) => {
      setOffsetMs(estimateClockOffset(sentAt, Date.now(), serverNow));
    },
    [],
  );

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated || !code) return;
    if (joinedKeyRef.current === code) return;
    joinedKeyRef.current = code;
    const sentAt = Date.now();
    joinRoom({code})
      .then((result) => {
        if (result.ok) {
          syncClock(sentAt, result.serverNow);
          setHasJoined(true);
          setJoinError(null);
        } else {
          setJoinError(result.reason);
        }
      })
      .catch((error: unknown) => {
        logError(error, 'battle-join');
        joinedKeyRef.current = null;
        setJoinError('network');
      });
  }, [code, isAuthLoading, isAuthenticated, joinRoom, syncClock]);

  const isLive =
    hasJoined &&
    room?.myRole !== null &&
    (room?.status === 'waiting' || room?.status === 'playing');

  useEffect(() => {
    if (!isLive) return;
    const beat = () => {
      const sentAt = Date.now();
      heartbeat({code})
        .then((result) => syncClock(sentAt, result.serverNow))
        .catch((error: unknown) => logError(error, 'battle-heartbeat'));
    };
    // Beat right away and on every return to the app: a host who stepped out
    // to share the link would otherwise read as offline for up to a beat.
    beat();
    const interval = setInterval(beat, BATTLE_HEARTBEAT_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') beat();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [code, heartbeat, isLive, syncClock]);

  const leave = useCallback(async () => {
    try {
      await leaveRoom({code});
    } catch (error) {
      logError(error, 'battle-leave');
    }
  }, [code, leaveRoom]);

  return {
    room,
    joinError,
    hasJoined,
    offsetMs,
    isAuthenticated,
    isAuthLoading,
    leave,
  };
}
