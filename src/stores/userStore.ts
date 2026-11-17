/**
 * @name useUserStore
 *
 * expo-iap의 getAvailablePurchases를 통해 프리미엄 상태를 글로벌로 관리하는 Zustand 스토어
 * CPK 스타일 가이드 및 구조 준수
 */
import {create} from 'zustand';
import {immer} from 'zustand/middleware/immer';
import * as IAP from '../utils/iap';
import {logEvent} from '../utils/analytics';
import {logError} from '../utils/error';
import {Platform} from 'react-native';
import {
  CERTIFIED_BADGE_SKU,
  PREMIUM_SUBSCRIPTION_IDS,
  getPremiumPlanForSubscriptionId,
  getSubscriptionPlanProductId,
  isActiveSubscriptionPurchase,
} from '../utils/iapEntitlements';

interface UserState {
  isPremium: boolean;
  premiumPlan: 'monthly' | 'yearly' | null;
  hasCertifiedBadge: boolean;
  setPremiumPlan: (plan: 'monthly' | 'yearly' | null) => void;
  setCertifiedBadge: (owned: boolean) => void;
  checkPremium: () => Promise<void>;
}

/**
 * 사용자 프로필과 상태를 관리하는 Zustand 스토어
 */
export const useUserStore = create<UserState>()(
  immer((set) => ({
    isPremium: false,
    premiumPlan: null,
    hasCertifiedBadge: false,
    setPremiumPlan: (plan) =>
      set((state) => {
        state.premiumPlan = plan;
      }),
    setCertifiedBadge: (owned) =>
      set((state) => {
        state.hasCertifiedBadge = owned;
      }),

    checkPremium: async () => {
      let activeSubs: any[] = [];
      let availablePurchases: any[] = [];
      let availablePurchasesLoaded = false;
      let queryError: unknown = null;

      try {
        activeSubs = await IAP.getActiveSubscriptions(
          PREMIUM_SUBSCRIPTION_IDS,
        );
      } catch (error) {
        queryError = error;
      }

      try {
        availablePurchases = await IAP.getAvailablePurchases();
        availablePurchasesLoaded = true;
      } catch (error) {
        queryError = error;
      }

      if (!activeSubs.length && !availablePurchasesLoaded && queryError) {
        logError(queryError, 'check_premium_error');
        return;
      }

      const activeSubscription = activeSubs.find(
        (subscription) =>
          getSubscriptionPlanProductId(subscription) &&
          subscription.isActive !== false,
      );
      const activePurchase = availablePurchases.find(
        (purchase) =>
          getSubscriptionPlanProductId(purchase) &&
          isActiveSubscriptionPurchase(purchase),
      );
      const activeSubscriptionProductId =
        getSubscriptionPlanProductId(activeSubscription) ||
        getSubscriptionPlanProductId(activePurchase) ||
        null;
      const badgeOwned = availablePurchases.some(
        (purchase) => purchase.productId === CERTIFIED_BADGE_SKU,
      );

      // 로깅
      logEvent('check_premium_status', {
        is_premium: !!activeSubscriptionProductId,
        subscriptionId: activeSubscriptionProductId ?? 'none',
        platform: Platform.OS,
      });

      // 상태 업데이트
      set((state) => {
        const nextIsPremium = !!activeSubscriptionProductId;
        const nextPremiumPlan = activeSubscriptionProductId
          ? getPremiumPlanForSubscriptionId(activeSubscriptionProductId)
          : null;
        const shouldUpdateBadge =
          availablePurchasesLoaded && state.hasCertifiedBadge !== badgeOwned;

        if (
          state.isPremium === nextIsPremium &&
          state.premiumPlan === nextPremiumPlan &&
          !shouldUpdateBadge
        ) {
          return;
        }

        state.isPremium = nextIsPremium;
        state.premiumPlan = nextPremiumPlan;
        if (shouldUpdateBadge) {
          state.hasCertifiedBadge = badgeOwned;
        }
      });
    },
  })),
);
