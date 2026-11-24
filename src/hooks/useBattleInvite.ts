import {useCallback, useRef, useState} from 'react';
import {Platform} from 'react-native';
import {useRouter} from 'expo-router';
import {useConvexAuth, useMutation} from 'convex/react';
import {toast} from '@backpackapp-io/react-native-toast';
import {api} from '../../convex/_generated/api';
import {BATTLE_STAKE_BULBS} from '../../convex/battle/logic';
import {useSignInRequireModalStore} from '../stores/signInRequireModalStore';
import {useUserStore} from '../stores/userStore';
import {logEvent, LOG_EVENTS} from '../utils/analytics';
import {logError} from '../utils/error';
import {battleErrorMessage} from '../uis/Battle/battleMessages';
import {useBulbManager} from './useBulbManager';

/** Free members on native watch one ad before each invite. */
export function needsInviteAd(isPremium: boolean, platform: string): boolean {
  return !isPremium && platform !== 'web';
}

/**
 * Creates a room (or the rematch of `rematchOf`) and returns its code, or
 * null after telling the user why it could not.
 */
export function useCreateBattleRoom(): (
  rematchOf?: string,
) => Promise<string | null> {
  const createRoom = useMutation(api.battle.mutations.createRoom);
  const requestRematch = useMutation(api.battle.mutations.requestRematch);

  return useCallback(
    async (rematchOf?: string) => {
      try {
        const result = rematchOf
          ? await requestRematch({code: rematchOf})
          : await createRoom({});
        if (!result.ok) {
          toast.error(battleErrorMessage(result.reason));
          return null;
        }
        logEvent(
          rematchOf ? LOG_EVENTS.BATTLE_REMATCH : LOG_EVENTS.BATTLE_ROOM_CREATED,
          {},
        );
        return result.code;
      } catch (error) {
        logError(error, 'battle-create-room');
        toast.error(battleErrorMessage('network'));
        return null;
      }
    },
    [createRoom, requestRematch],
  );
}

/** Entry point for "open a room" and "rematch" buttons. */
export function useBattleInvite(): {
  startInvite: (rematchOf?: string) => Promise<void>;
  isStarting: boolean;
} {
  const {push, replace} = useRouter();
  const {isAuthenticated} = useConvexAuth();
  const isPremium = useUserStore((state) => state.isPremium);
  const {bulbCount} = useBulbManager();
  const setSignInModalVisible = useSignInRequireModalStore(
    (state) => state.setVisible,
  );
  const createBattleRoom = useCreateBattleRoom();
  const [isStarting, setIsStarting] = useState(false);
  const startingRef = useRef(false);

  const startInvite = useCallback(
    async (rematchOf?: string) => {
      if (startingRef.current) return;
      if (!isAuthenticated) {
        logEvent(LOG_EVENTS.LOGIN_PROMPT_SHOWN, {source: 'battle'});
        setSignInModalVisible(true);
        return;
      }
      if (bulbCount < BATTLE_STAKE_BULBS) {
        toast.error(battleErrorMessage('insufficient_bulbs'));
        return;
      }
      if (needsInviteAd(isPremium, Platform.OS)) {
        push({
          pathname: '/battle-invite',
          params: rematchOf ? {rematchOf} : {},
        });
        return;
      }

      startingRef.current = true;
      setIsStarting(true);
      const code = await createBattleRoom(rematchOf);
      startingRef.current = false;
      setIsStarting(false);
      if (!code) return;
      const route = {pathname: '/battle/[code]', params: {code}} as const;
      if (rematchOf) replace(route);
      else push(route);
    },
    [
      bulbCount,
      createBattleRoom,
      isAuthenticated,
      isPremium,
      push,
      replace,
      setSignInModalVisible,
    ],
  );

  return {startInvite, isStarting};
}
