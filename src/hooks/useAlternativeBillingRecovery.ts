import {useEffect, useLayoutEffect, useRef} from 'react';
import {AppState, Platform} from 'react-native';
import {useAction, useConvexAuth, useQuery} from 'convex/react';
import {api} from '../../convex/_generated/api';
import {
  confirmAlternativeBillingPayment,
  readPendingAlternativeBillingPayments,
} from '../utils/pendingAlternativeBilling';
import {logEvent} from '../utils/analytics';

export const useAlternativeBillingRecovery = (): void => {
  const {isAuthenticated} = useConvexAuth();
  const user = useQuery(
    api.user.queries.currentUser,
    isAuthenticated ? {} : 'skip',
  );
  const userId = isAuthenticated ? user?._id : undefined;
  const currentUserId = useRef(userId);
  useLayoutEffect(() => {
    currentUserId.current = userId;
  }, [userId]);
  const confirmToss = useAction(api.toss.confirmPayment);
  const confirmNaver = useAction(api.naverpay.applyPayment);

  useEffect(() => {
    if (Platform.OS !== 'android' || !userId) return;
    let cancelled = false;
    const recover = async (): Promise<void> => {
      try {
        const pending = await readPendingAlternativeBillingPayments(userId);
        for (const payment of pending) {
          if (cancelled || currentUserId.current !== userId) return;
          try {
            await confirmAlternativeBillingPayment(userId, payment, () => {
              if (cancelled || currentUserId.current !== userId) {
                throw new Error('Payment account changed');
              }
              return payment.provider === 'toss'
                ? confirmToss(payment.args)
                : confirmNaver(payment.args);
            });
          } catch {
            logEvent('alt_billing_recovery_pending');
          }
        }
      } catch {
        // Keep the encrypted confirmation for the next authenticated launch
        // or foreground retry. Never log provider keys or reporting tokens.
        logEvent('alt_billing_recovery_pending');
      }
    };
    void recover();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void recover();
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [userId, confirmToss, confirmNaver]);
};
