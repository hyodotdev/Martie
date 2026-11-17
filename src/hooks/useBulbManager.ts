/**
 * @name useBulbManager
 *
 * Centralized bulb count management hook that handles both localStorage (for non-logged users)
 * and server-side storage (for logged users)
 *
 * Default Bulb Count Logic:
 * - When user logs in and bulb count is unset (null/undefined): Set to 2 bulbs as default
 * - When user logs in and bulb count is 0: Keep at 0 (don't charge, user might have spent all bulbs)
 * - When user has local bulbs > 0: Sync with server using higher count
 */
import {useCallback, useEffect, useState} from 'react';
import {useMMKVNumber} from 'react-native-mmkv';
import {useQuery, useMutation} from 'convex/react';
import {api} from '../../convex/_generated/api';
import {Storage} from '../utils/storage';
import {
  INITIAL_BULB_COUNT,
  MAX_BULB_COUNT,
  REWARDED_BULB_COUNT,
} from '../utils/constants';

export type BulbOperation = 'set' | 'add' | 'subtract';
export type RechargeReason =
  'completed' | 'unavailable' | 'consent_unavailable' | 'web';

/** Bulbs actually granted; `pending` means a server callback will grant. */
export interface BulbGrant {
  granted: number;
  pending: boolean;
}

export interface UseBulbManagerReturn {
  bulbCount: number;
  isLoading: boolean;
  updateBulbCount: (count: number, operation?: BulbOperation) => Promise<void>;
  syncBulbCount: () => Promise<void>;
  /** Daily check-in reward. Signed-in grants are decided by the server. */
  claimDailyCheckIn: () => Promise<BulbGrant>;
  /** Rewarded-ad or free recharge. Signed-in grants are decided by the server. */
  claimRecharge: (reason: RechargeReason) => Promise<BulbGrant>;
}

const GUEST_CHECK_IN_BULBS = 3;

export function useBulbManager(): UseBulbManagerReturn {
  const [localBulbCount, setLocalBulbCount] = useMMKVNumber(Storage.BulbCount);
  const [isLoading, setIsLoading] = useState(false);
  const currentUser = useQuery(api.user.queries.currentUser);

  // Server-side bulb count queries and mutations
  const serverBulbCount = useQuery(api.user.queries.getBulbCount);
  const updateServerBulbCount = useMutation(api.user.mutations.updateBulbCount);
  const syncServerBulbCount = useMutation(api.user.mutations.syncBulbCount);
  const initializeBulbCount = useMutation(
    api.user.mutations.initializeBulbCount,
  );
  const claimServerCheckIn = useMutation(api.user.mutations.claimDailyCheckIn);
  const claimServerRecharge = useMutation(
    api.user.mutations.claimRechargeBulbs,
  );

  const isLoggedIn = !!currentUser;

  // Determine which bulb count to use
  const bulbCount = isLoggedIn ? (serverBulbCount ?? 0) : (localBulbCount ?? 0);
  const isQueryLoading =
    currentUser === undefined || (isLoggedIn && serverBulbCount === undefined);

  // Update bulb count (handles both local and server storage)
  const updateBulbCount = useCallback(
    async (count: number, operation: BulbOperation = 'set') => {
      setIsLoading(true);

      try {
        if (isLoggedIn) {
          // Update server-side bulb count
          await updateServerBulbCount({
            count,
            operation,
          });
        } else {
          // Update local storage
          const currentCount = localBulbCount ?? 0;
          let newCount: number;

          switch (operation) {
            case 'set':
              newCount = Math.max(0, count);
              break;
            case 'add':
              newCount = Math.max(0, currentCount + count);
              break;
            case 'subtract':
              newCount = Math.max(0, currentCount - count);
              break;
            default:
              newCount = currentCount;
          }

          // Cap at maximum bulb count
          newCount = Math.min(newCount, MAX_BULB_COUNT);
          setLocalBulbCount(newCount);
        }
      } catch (error) {
        console.error('Failed to update bulb count:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoggedIn, localBulbCount, setLocalBulbCount, updateServerBulbCount],
  );

  // Sync localStorage bulb count to server when user logs in
  const syncBulbCount = useCallback(async (): Promise<void> => {
    if (!isLoggedIn || localBulbCount === undefined) {
      return;
    }

    setIsLoading(true);

    try {
      await syncServerBulbCount({
        localBulbCount: localBulbCount,
      });

      // Clear local storage after sync
      setLocalBulbCount(0);
    } catch (error) {
      console.error('Failed to sync bulb count:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, localBulbCount, setLocalBulbCount, syncServerBulbCount]);

  // Auto-sync and initialize when user logs in
  useEffect(() => {
    if (isQueryLoading) return;
    if (isLoggedIn) {
      // If user has local bulbs, sync them
      if (localBulbCount && localBulbCount > 0) {
        syncBulbCount();
      } else {
        // Initialize bulb count for new users (sets to 2 if unset, but keeps 0 if explicitly 0)
        initializeBulbCount().catch((error) => {
          console.error('Failed to initialize bulb count:', error);
        });
      }
    } else if (localBulbCount === undefined) {
      setLocalBulbCount(INITIAL_BULB_COUNT);
    }
  }, [
    isQueryLoading,
    isLoggedIn,
    localBulbCount,
    syncBulbCount,
    initializeBulbCount,
    setLocalBulbCount,
  ]);

  const addLocalBulbs = useCallback(
    (amount: number): number => {
      const current = localBulbCount ?? 0;
      const granted = Math.max(0, Math.min(amount, MAX_BULB_COUNT - current));
      setLocalBulbCount(current + granted);
      return granted;
    },
    [localBulbCount, setLocalBulbCount],
  );

  const claimDailyCheckIn = useCallback(async (): Promise<BulbGrant> => {
    if (isLoggedIn) {
      const {granted} = await claimServerCheckIn({});
      return {granted, pending: false};
    }
    return {granted: addLocalBulbs(GUEST_CHECK_IN_BULBS), pending: false};
  }, [isLoggedIn, claimServerCheckIn, addLocalBulbs]);

  const claimRecharge = useCallback(
    async (reason: RechargeReason): Promise<BulbGrant> => {
      if (isLoggedIn) {
        const {granted, pending} = await claimServerRecharge({reason});
        return {granted, pending};
      }
      return {granted: addLocalBulbs(REWARDED_BULB_COUNT), pending: false};
    },
    [isLoggedIn, claimServerRecharge, addLocalBulbs],
  );

  return {
    bulbCount,
    isLoading: isLoading || isQueryLoading,
    updateBulbCount,
    syncBulbCount,
    claimDailyCheckIn,
    claimRecharge,
  };
}
