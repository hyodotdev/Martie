import {useEffect, useRef} from 'react';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {useConvexAuth, useMutation} from 'convex/react';
import {api} from '../../convex/_generated/api';
import {storage, Storage} from '../../src/utils/storage';
import {toast} from '@backpackapp-io/react-native-toast';
import {t} from '../../src/STRINGS';
import CustomLoadingIndicator from '../../src/uis/CustomLoadingIndicator';
import {logEvent} from '../../src/utils/analytics';
import {setAcquisitionSourceOnce} from '../../src/utils/acquisition';

const HOME_ROUTE = '/(tabs)' as const;

export default function InviteCode(): JSX.Element {
  const {code} = useLocalSearchParams<{code: string}>();
  const {isAuthenticated, isLoading: isAuthLoading} = useConvexAuth();
  const {replace} = useRouter();
  const applyReferral = useMutation(api.referral.mutations.applyReferral);
  const handledInviteKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!code) {
      replace(HOME_ROUTE);
      return;
    }

    const normalizedCode = code.trim().toLowerCase();
    if (!normalizedCode) {
      replace(HOME_ROUTE);
      return;
    }

    // Treat any invite-link install as the "referral" channel for the
    // signup_completed cohort split. First-touch wins so this no-ops on
    // returning users.
    setAcquisitionSourceOnce('referral');

    if (isAuthLoading) return;

    const inviteKey = `${
      isAuthenticated ? 'authenticated' : 'guest'
    }:${normalizedCode}`;
    if (handledInviteKeyRef.current === inviteKey) return;
    handledInviteKeyRef.current = inviteKey;

    if (isAuthenticated) {
      // Already logged in — apply referral immediately
      applyReferral({referralCode: normalizedCode})
        .then((result) => {
          if (result.success) {
            toast.success(t('referral.reward', {count: 5}));
            logEvent('referral_applied');
          } else if (result.error === 'already_referred') {
            toast(t('referral.alreadyReferred'));
          } else if (result.error === 'self_referral') {
            toast(t('referral.selfReferral'));
          } else {
            toast.error(t('referral.invalidCode'));
          }
        })
        .catch(() => {
          toast.error(t('referral.invalidCode'));
        })
        .finally(() => {
          replace(HOME_ROUTE);
        });
    } else {
      // Not logged in — store code and redirect to sign-in
      storage.set(Storage.PendingReferralCode, normalizedCode);
      replace('/sign-in');
    }
  }, [code, isAuthenticated, isAuthLoading, applyReferral, replace]);

  return <CustomLoadingIndicator />;
}
