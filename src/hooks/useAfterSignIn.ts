import {useEffect, useRef} from 'react';
import {useRouter} from 'expo-router';
import {useConvexAuth, useMutation} from 'convex/react';
import {toast} from '@backpackapp-io/react-native-toast';
import {api} from '../../convex/_generated/api';
import {t} from '../STRINGS';
import {logError} from '../utils/error';
import {
  logEvent,
  LOG_EVENTS,
  registerAnalyticsSuperProperties,
} from '../utils/analytics';
import {storage, Storage} from '../utils/storage';
import {decodePendingBattle} from '../utils/battle';
import {getAcquisitionSource} from '../utils/acquisition';

export type SignInMethod = 'email_link' | 'email_otp';

/**
 * Once the session is up, set up the profile, sync what the guest did, and
 * leave the sign-in screens. `onFailed` runs when the profile cannot be set
 * up, so the screen can show an error and let the person retry.
 *
 * Only an `enabled` screen acts: a link can open the landing on top of the
 * check-email screen, and only the screen in front should finish.
 */
export function useAfterSignIn({
  method,
  enabled,
  onFailed,
}: {
  method: SignInMethod;
  enabled: boolean;
  onFailed: () => void;
}): void {
  const {replace, dismissAll} = useRouter();
  const {isAuthenticated} = useConvexAuth();
  const createUserProfile = useMutation(api.user.mutations.createUserProfile);
  const applyReferral = useMutation(api.referral.mutations.applyReferral);
  const completeDailyChallenge = useMutation(
    api.dailyChallenge.mutations.completeDailyChallenge,
  );
  const didHandleAuthenticatedRef = useRef(false);
  const onFailedRef = useRef(onFailed);
  useEffect(() => {
    onFailedRef.current = onFailed;
  });

  useEffect(() => {
    if (!enabled || !isAuthenticated || didHandleAuthenticatedRef.current) {
      return;
    }

    didHandleAuthenticatedRef.current = true;
    const fail = () => {
      didHandleAuthenticatedRef.current = false;
      onFailedRef.current();
    };

    createUserProfile({})
      .then(async (profile) => {
        if (!profile) {
          fail();
          return;
        }

        const source = getAcquisitionSource() ?? 'organic';
        registerAnalyticsSuperProperties({acquisition_source: source});

        if (
          profile.isNew &&
          !storage.getBoolean(Storage.DidFireSignupCompleted)
        ) {
          storage.set(Storage.DidFireSignupCompleted, true);
          logEvent(LOG_EVENTS.SIGNUP_COMPLETED, {source, method});
        }

        // 비로그인 상태에서 풀었던 데일리 퀴즈 결과 서버 동기화
        const guestDailyRaw = storage.getString(Storage.GuestDailyResult);
        if (guestDailyRaw) {
          try {
            const guestDaily = JSON.parse(guestDailyRaw);
            const today = new Date().toISOString().split('T')[0];
            if (guestDaily.date === today && Array.isArray(guestDaily.results)) {
              await completeDailyChallenge({results: guestDaily.results});
            }
            storage.delete(Storage.GuestDailyResult);
          } catch (err) {
            logError(err, 'sync-guest-daily');
          }
        }

        // Apply pending referral code if exists
        const pendingCode = storage.getString(Storage.PendingReferralCode);
        if (pendingCode) {
          try {
            const result = await applyReferral({referralCode: pendingCode});
            if (result.success) {
              toast.success(t('referral.reward', {count: 5}));
              logEvent('referral_applied');
            }
          } catch (err) {
            logError(err, 'apply-referral');
          }
          storage.delete(Storage.PendingReferralCode);
        }

        // Close any open modals and go to the My tab at root
        try {
          dismissAll();
        } catch {}

        // A battle link opened while signed out resumes in its room.
        const pendingBattleCode = decodePendingBattle(
          storage.getString(Storage.PendingBattleCode),
          Date.now(),
        );
        storage.delete(Storage.PendingBattleCode);
        if (pendingBattleCode) {
          replace({
            pathname: '/battle/[code]',
            params: {code: pendingBattleCode},
          });
          return;
        }
        replace('/my');
      })
      .catch((err) => {
        logError(err, 'create-profile');
        fail();
      });
  }, [
    enabled,
    isAuthenticated,
    method,
    replace,
    createUserProfile,
    completeDailyChallenge,
    applyReferral,
    dismissAll,
  ]);
}
