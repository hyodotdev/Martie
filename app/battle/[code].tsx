/**
 * @name BattleRoom
 *
 * 1:1 퀴즈 대결방 — 대기실, 실시간 버저 퀴즈, 결과를 한 화면에서 상태별로 보여준다.
 * 링크(https://hyo.dev/martie/battle/<code>)로 들어온 사용자도 여기로 온다.
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import {Alert, ScrollView, Share} from 'react-native';
import {Stack, useLocalSearchParams, useNavigation, useRouter} from 'expo-router';
import {usePreventRemove} from 'expo-router/react-navigation';
import {css} from 'kstyled';
import {useMutation} from 'convex/react';
import {toast} from '@backpackapp-io/react-native-toast';
import {api} from '../../convex/_generated/api';
import {normalizeBattleCode} from '../../convex/battle/logic';
import {t} from '../../src/STRINGS';
import {useBattleRoom} from '../../src/hooks/useBattleRoom';
import {useBattleInvite} from '../../src/hooks/useBattleInvite';
import {logEvent, LOG_EVENTS, logScreenView} from '../../src/utils/analytics';
import {logError} from '../../src/utils/error';
import {battleShareUrl, encodePendingBattle} from '../../src/utils/battle';
import {storage, Storage} from '../../src/utils/storage';
import {withErrorBoundary} from '../../src/hoc/withErrorBoundary';
import CustomLoadingIndicator from '../../src/uis/CustomLoadingIndicator';
import BattleLobby from '../../src/uis/Battle/BattleLobby';
import BattleNotice from '../../src/uis/Battle/BattleNotice';
import BattlePlay from '../../src/uis/Battle/BattlePlay';
import BattleResult, {myResult} from '../../src/uis/Battle/BattleResult';
import {battleErrorMessage} from '../../src/uis/Battle/battleMessages';

const HOME_ROUTE = '/(tabs)' as const;

function BattleRoomPage(): JSX.Element {
  const {code: rawCode} = useLocalSearchParams<{code: string}>();
  const code = normalizeBattleCode(rawCode ?? '') ?? '';
  const router = useRouter();
  const navigation = useNavigation();
  const {room, joinError, offsetMs, isAuthenticated, isAuthLoading, leave} =
    useBattleRoom(code);
  const setReady = useMutation(api.battle.mutations.setReady);
  const buzz = useMutation(api.battle.mutations.buzz);
  const kickGuest = useMutation(api.battle.mutations.kickGuest);
  const {startInvite, isStarting} = useBattleInvite();

  const [isReadyBusy, setIsReadyBusy] = useState(false);
  // The answer this device sent for the current phase, until the room moves on.
  const [pending, setPending] = useState<{
    index: number;
    phase: string | null;
    key: string;
  } | null>(null);

  const status = room?.status;
  const myRole = room?.myRole ?? null;
  const statusRef = useRef(status);
  const myRoleRef = useRef(myRole);
  useEffect(() => {
    statusRef.current = status;
    myRoleRef.current = myRole;
  }, [myRole, status]);
  const allowLeaveRef = useRef(false);
  // A quick double back press must not stack a second leave prompt.
  const leavePromptOpenRef = useRef(false);

  useEffect(() => {
    logEvent(LOG_EVENTS.BATTLE_LINK_OPENED, {hasCode: !!code});
    if (!__DEV__)
      logScreenView({screen_name: 'battle_room', screen_class: 'BattleRoom'});
  }, [code]);

  useEffect(() => {
    if (joinError) logEvent(LOG_EVENTS.BATTLE_JOIN_FAILED, {reason: joinError});
  }, [joinError]);

  const didLogJoinRef = useRef(false);
  useEffect(() => {
    if (!myRole || status !== 'waiting' || didLogJoinRef.current) return;
    didLogJoinRef.current = true;
    logEvent(LOG_EVENTS.BATTLE_JOINED, {role: myRole});
  }, [myRole, status]);

  const didLogStartRef = useRef(false);
  useEffect(() => {
    if (status !== 'playing' || didLogStartRef.current) return;
    didLogStartRef.current = true;
    logEvent(LOG_EVENTS.BATTLE_STARTED, {role: myRole});
  }, [myRole, status]);

  const didLogFinishRef = useRef(false);
  useEffect(() => {
    if (status !== 'finished' || !room || !myRole || didLogFinishRef.current) {
      return;
    }
    didLogFinishRef.current = true;
    logEvent(LOG_EVENTS.BATTLE_FINISHED, {
      role: myRole,
      result: myResult(room.outcome, myRole),
      endReason: room.endReason,
      myScore: myRole === 'host' ? room.hostScore : room.guestScore,
      opponentScore: myRole === 'host' ? room.guestScore : room.hostScore,
    });
  }, [myRole, room, status]);

  const phase = room?.phase ?? null;
  const activePending =
    pending && pending.index === room?.round?.index && pending.phase === phase
      ? pending
      : null;

  // Leaving the lobby frees the seat (the host's room closes).
  useEffect(() => {
    return () => {
      if (statusRef.current === 'waiting' && myRoleRef.current) {
        logEvent(LOG_EVENTS.BATTLE_LEFT, {phase: 'lobby'});
        void leave();
      }
    };
  }, [leave]);

  usePreventRemove(status === 'playing' && !!myRole, ({data}) => {
    if (allowLeaveRef.current) {
      navigation.dispatch(data.action);
      return;
    }
    if (leavePromptOpenRef.current) return;
    leavePromptOpenRef.current = true;
    Alert.alert(t('battle.leaveTitle'), t('battle.leaveMessage'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
        onPress: () => {
          leavePromptOpenRef.current = false;
        },
      },
      {
        text: t('battle.leave'),
        style: 'destructive',
        onPress: () => {
          leavePromptOpenRef.current = false;
          allowLeaveRef.current = true;
          logEvent(LOG_EVENTS.BATTLE_LEFT, {phase: 'match'});
          void leave().finally(() => navigation.dispatch(data.action));
        },
      },
    ]);
  });

  const goHome = useCallback(() => {
    router.replace(HOME_ROUTE);
  }, [router]);

  const handleSignIn = useCallback(() => {
    storage.set(Storage.PendingBattleCode, encodePendingBattle(code, Date.now()));
    router.push('/sign-in');
  }, [code, router]);

  const handleShare = useCallback(async () => {
    if (!room) return;
    const url = battleShareUrl(room.code);
    try {
      const result = await Share.share({
        message: t('battle.shareMessage', {
          name: room.host?.displayName ?? '',
          url,
        }),
      });
      logEvent(LOG_EVENTS.BATTLE_INVITE_SHARED, {
        completed: result.action === Share.sharedAction,
      });
    } catch (error) {
      logError(error, 'battle-share');
    }
  }, [room]);

  const handleReady = useCallback(
    async (ready: boolean) => {
      setIsReadyBusy(true);
      try {
        const result = await setReady({code, ready});
        if (!result.ok) toast.error(battleErrorMessage(result.reason));
        else if (ready) logEvent(LOG_EVENTS.BATTLE_READY, {role: myRole});
      } catch (error) {
        logError(error, 'battle-ready');
        toast.error(battleErrorMessage('network'));
      } finally {
        setIsReadyBusy(false);
      }
    },
    [code, myRole, setReady],
  );

  const handleKick = useCallback(() => {
    const name = room?.guest?.displayName ?? '';
    Alert.alert(
      t('battle.kickConfirmTitle', {name}),
      t('battle.kickConfirmMessage'),
      [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('battle.kick'),
          style: 'destructive',
          onPress: () => {
            kickGuest({code})
              .then((result) => {
                if (result.ok) logEvent(LOG_EVENTS.BATTLE_GUEST_KICKED);
              })
              .catch((error: unknown) => {
                logError(error, 'battle-kick');
                toast.error(battleErrorMessage('network'));
              });
          },
        },
      ],
    );
  }, [code, kickGuest, room?.guest?.displayName]);

  const handleAnswer = useCallback(
    async (index: number, optionKey: string) => {
      if (activePending) return;
      setPending({index, phase, key: optionKey});
      try {
        const result = await buzz({code, index, optionKey});
        if (!result.ok) {
          setPending(null);
          toast(battleErrorMessage(result.reason));
          return;
        }
        logEvent(LOG_EVENTS.BATTLE_ANSWERED, {
          correct: result.correct,
          attempt: phase === 'second_chance' ? 'second' : 'first',
        });
      } catch (error) {
        setPending(null);
        logError(error, 'battle-buzz');
        toast.error(battleErrorMessage('network'));
      }
    },
    [activePending, buzz, code, phase],
  );

  const handleJoinRematch = useCallback(
    (rematchCode: string) => {
      router.replace({pathname: '/battle/[code]', params: {code: rematchCode}});
    },
    [router],
  );

  const handleRematch = useCallback(() => {
    void startInvite(code);
  }, [code, startInvite]);

  const screenOptions = (
    <Stack.Screen
      options={{
        headerShown: true,
        title: t('battle.title'),
        headerBackTitle: t('common.back'),
      }}
    />
  );

  if (!code) {
    return (
      <>
        {screenOptions}
        <BattleNotice
          kind="not_found"
          message={battleErrorMessage('not_found')}
          actionText={t('battle.goHome')}
          onAction={goHome}
        />
      </>
    );
  }

  if (room === undefined || isAuthLoading) {
    return (
      <>
        {screenOptions}
        <CustomLoadingIndicator />
      </>
    );
  }

  if (room === null) {
    return (
      <>
        {screenOptions}
        <BattleNotice
          kind="not_found"
          message={battleErrorMessage('not_found')}
          actionText={t('battle.goHome')}
          onAction={goHome}
        />
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        {screenOptions}
        <BattleNotice
          kind="invite"
          message={t('battle.invitedBy', {name: room.host?.displayName ?? ''})}
          actionText={t('battle.signInToJoin')}
          onAction={handleSignIn}
        />
      </>
    );
  }

  if (!myRole) {
    if (room.kicked) {
      return (
        <>
          {screenOptions}
          <BattleNotice
            kind="kicked"
            message={battleErrorMessage('kicked')}
            actionText={t('battle.goHome')}
            onAction={goHome}
          />
        </>
      );
    }
    if (!joinError) {
      return (
        <>
          {screenOptions}
          <CustomLoadingIndicator />
        </>
      );
    }
    return (
      <>
        {screenOptions}
        <BattleNotice
          kind={joinError}
          message={battleErrorMessage(joinError)}
          actionText={t('battle.goHome')}
          onAction={goHome}
        />
      </>
    );
  }

  if (room.status === 'closed') {
    return (
      <>
        {screenOptions}
        <BattleNotice
          kind={myRole === 'guest' ? 'host_offline' : 'closed'}
          message={battleErrorMessage(
            myRole === 'guest' ? 'host_offline' : 'closed',
          )}
          actionText={t('battle.goHome')}
          onAction={goHome}
        />
      </>
    );
  }

  return (
    <>
      {screenOptions}
      <ScrollView
        contentContainerStyle={css`
          flex-grow: 1;
        `}
      >
        {room.status === 'waiting' ? (
          <BattleLobby
            room={room}
            myRole={myRole}
            offsetMs={offsetMs}
            isBusy={isReadyBusy}
            onReady={handleReady}
            onShare={handleShare}
            onKick={handleKick}
          />
        ) : room.status === 'playing' ? (
          <BattlePlay
            room={room}
            myRole={myRole}
            offsetMs={offsetMs}
            pendingOptionKey={activePending?.key ?? null}
            onAnswer={handleAnswer}
          />
        ) : (
          <BattleResult
            room={room}
            myRole={myRole}
            isBusy={isStarting}
            onRematch={handleRematch}
            onJoinRematch={handleJoinRematch}
            onHome={goHome}
          />
        )}
      </ScrollView>
    </>
  );
}

export default withErrorBoundary(BattleRoomPage);
