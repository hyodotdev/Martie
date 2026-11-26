/**
 * @name Purchase
 *
 * See the style guide: https://github.com/hyochan/style-guide/blob/main/docs/REACT.md
 */
import {styled, css} from 'kstyled';
import {v5 as uuidv5} from 'uuid';
import {IC_BULB} from '../src/icons';
import {Stack, useRouter} from 'expo-router';
import {Typography, Icon, useCPK, IconName} from 'cpk-ui';
import {getLocale, t} from '../src/STRINGS';
import {
  Platform,
  View,
  Text,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import {
  ErrorCode,
  getActiveSubscriptions as getActiveSubscriptionsFromStore,
  getAvailablePurchases as getAvailablePurchasesFromStore,
  finishTransaction as finishIapTransaction,
  useIAP,
} from '../src/utils/iap';
import type {
  Product,
  ProductSubscription,
  Purchase,
  ProductAndroid,
  ProductSubscriptionAndroid,
  UserChoiceBillingDetails,
} from '../src/utils/iap';
import {useUserStore} from '../src/stores/userStore';
import {useEffect, useState, useCallback, useRef} from 'react';
import {api} from '../convex/_generated/api';
import {useAction, useConvexAuth, useMutation, useQuery} from 'convex/react';
import {logError} from '../src/utils/error';
import {logEvent} from '../src/utils/analytics';
import {useBulbManager} from '../src/hooks/useBulbManager';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import {APP_STORE_URLS} from '../src/utils/constants';
import {
  getAndroidSubscriptionOffer,
  getSubscriptionTerms,
  type AndroidSubscriptionStore,
} from '../src/utils/subscriptionOffers';
import {
  BADGE_SKUS as badgeSkus,
  BULB_PACK_SKUS as bulbPackSkus,
  CERTIFIED_BADGE_SKU,
  PREMIUM_SUBSCRIPTION_IDS as subscriptionSkus,
  getPremiumPlanForSubscriptionId,
  getPurchaseRecordTransactionId,
  getSubscriptionPlanProductId,
  isActiveSubscriptionPurchase,
  type PurchaseLike,
} from '../src/utils/iapEntitlements';
import {
  ENABLE_ANDROID_ALTERNATIVE_BILLING,
  PAYMENT_MODE,
  PaymentMode,
  SHOW_PAYMENT_TEST_TOOLS,
} from '../src/utils/paymentMode';
import {
  TOSS_CLIENT_KEY,
  buildTossOrderId,
  getTossAmountKrw,
} from '../src/utils/alternativeBilling';
import {
  NAVER_PAY_CHAIN_ID,
  NAVER_PAY_CLIENT_ID,
  buildNaverMerchantPayKey,
  buildNaverReturnUrl,
  getNaverAmountKrw,
} from '../src/utils/naverPay';
import AlternativeBillingSheet, {
  type BillingMethod,
} from '../src/components/payment/AlternativeBillingSheet';
import PaymentTestBanner, {
  type TestBannerMode,
} from '../src/components/payment/PaymentTestBanner';
import {useSignInRequireModalStore} from '../src/stores/signInRequireModalStore';

const getAndroidSubscriptionStore = (): AndroidSubscriptionStore => {
  const store: unknown = Constants.expoConfig?.extra?.iapStore;
  return store === 'amazon' || store === 'horizon' ? store : 'google';
};

// Define supported platforms
const SUPPORTED_PLATFORMS = ['ios', 'android'];

const DEFAULT_RESTORED_PURCHASE_CURRENCY = 'USD';

const getIapStore = (purchase?: PurchaseLike | null): string =>
  typeof purchase?.store === 'string' ? purchase.store : Platform.OS;

const getAppleAccountToken = (userId?: string) =>
  userId ? uuidv5(`martie:user:${userId}`, uuidv5.URL) : undefined;

const isAmazonPurchase = (purchase?: PurchaseLike | null): boolean =>
  getIapStore(purchase) === 'amazon';

const readString = (source: object, key: string): string | null => {
  const value: unknown = Reflect.get(source, key);
  return typeof value === 'string' && value ? value : null;
};

// Amazon RVS needs the receipt id (purchaseToken) and the Amazon user id.
const getAmazonReceipt = (
  purchase: object,
  fallbackReceiptId: string,
): {receiptId: string; amazonUserId: string} => ({
  receiptId: readString(purchase, 'purchaseToken') ?? fallbackReceiptId,
  amazonUserId: readString(purchase, 'userIdAmazon') ?? '',
});

// Horizon purchases cannot be verified on the server yet (no account proof
// in the JS layer), so Horizon builds show the app-store notice instead.
const IS_HORIZON_BUILD = getAndroidSubscriptionStore() === 'horizon';

const isGooglePurchase = (purchase?: PurchaseLike | null): boolean =>
  Platform.OS === 'android' &&
  !['horizon', 'amazon'].includes(getIapStore(purchase));

const getBulbPackCount = (productId: string): number => {
  if (productId === bulbPackSkus[0]) {
    return 10;
  }
  if (productId === bulbPackSkus[1]) {
    return 30;
  }
  return 0;
};

const getPaymentTestModeLabel = (): string => {
  switch (PAYMENT_MODE) {
    case PaymentMode.MockPg:
      return 'Mock PG';
    case PaymentMode.TossTest:
      return 'Toss Payments test';
    case PaymentMode.NaverTest:
      return 'Naver Pay test';
    case PaymentMode.AlternativeBilling:
      return 'Alternative billing';
    default:
      return PAYMENT_MODE;
  }
};

const getTestBannerMode = (): TestBannerMode => {
  if (PAYMENT_MODE === PaymentMode.TossTest) {
    return 'toss';
  }

  if (PAYMENT_MODE === PaymentMode.NaverTest) {
    return 'naver';
  }

  return 'alt';
};

const getPurchaseErrorInfo = (
  error: unknown,
): {code: string; message: string; name: string} => {
  const errorObject =
    typeof error === 'object' && error !== null
      ? (error as {code?: unknown; message?: unknown})
      : null;

  return {
    code: String(errorObject?.code ?? ''),
    message:
      error instanceof Error
        ? error.message
        : typeof errorObject?.message === 'string'
          ? errorObject.message
          : typeof error === 'string'
            ? error
            : '',
    name: error instanceof Error ? error.name : '',
  };
};

const isUserCancelledPurchaseError = (error: unknown): boolean => {
  const {code, message, name} = getPurchaseErrorInfo(error);

  return (
    code === ErrorCode.UserCancelled ||
    name === 'CanceledError' ||
    /cancel/i.test(message)
  );
};

const isDeferredOrPendingPurchaseError = (error: unknown): boolean => {
  const {code, message} = getPurchaseErrorInfo(error);

  return (
    code === ErrorCode.DeferredPayment ||
    code === ErrorCode.Pending ||
    /deferred|pending/i.test(message)
  );
};

const isServiceTimeoutPurchaseError = (error: unknown): boolean => {
  const {code, message} = getPurchaseErrorInfo(error);

  return (
    code === ErrorCode.ServiceTimeout ||
    /service.*timeout|timed out|maximum timeout/i.test(message)
  );
};

const isAlreadyOwnedPurchaseError = (error: unknown): boolean => {
  const {code, message} = getPurchaseErrorInfo(error);

  return code === ErrorCode.AlreadyOwned || /already\s+own/i.test(message);
};

const getPurchaseErrorProductId = (error: unknown): string => {
  if (typeof error !== 'object' || error === null) {
    return '';
  }

  return String((error as {productId?: unknown}).productId ?? '');
};

const getPurchaseErrorDedupeKey = (
  error: unknown,
  productId: string,
  purchaseAttemptId: number,
): string => {
  const {code, message} = getPurchaseErrorInfo(error);
  const category = isAlreadyOwnedPurchaseError(error)
    ? ErrorCode.AlreadyOwned
    : isUserCancelledPurchaseError(error)
      ? ErrorCode.UserCancelled
      : isDeferredOrPendingPurchaseError(error)
        ? ErrorCode.Pending
        : isServiceTimeoutPurchaseError(error)
          ? ErrorCode.ServiceTimeout
          : code || message;

  return [purchaseAttemptId, productId || 'unknown', category].join(':');
};

// (dev helper removed)

/**
 * BulbPack component for displaying purchasable bulb packs
 */
const BulbPack = ({
  count,
  price,
  iconName,
  iconColor,
  marginDirection,
  onPress,
  isDarkMode,
  isLoading,
  disabled,
}: {
  count: number;
  price: string;
  iconName: string;
  iconColor: string;
  marginDirection: 'left' | 'right';
  onPress: () => void;
  isDarkMode: boolean;
  isLoading: boolean;
  disabled?: boolean;
}) => {
  const {theme} = useCPK();

  return (
    <BulbPackItem
      style={[
        css`
          flex: 1;
          border-radius: 16px;
          padding: 20px;
          padding-bottom: 24px;
          border-width: ${isDarkMode ? 1 + 'px' : 0};
          justify-content: space-between;
          position: relative;
          overflow: visible;
          background-color: ${theme.bg?.bubble || '#FFFFFF'};
          border-color: ${theme.role?.border || '#E8E8E8'};
          margin-left: ${marginDirection === 'left' ? 12 + 'px' : 0};
          margin-right: ${marginDirection === 'right' ? 12 + 'px' : 0};
        `,
        {
          ...(Platform.OS === 'android'
            ? {elevation: 2}
            : {
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.1,
                shadowRadius: 4,
              }),
        },
      ]}
    >
      <BulbIconContainer
        style={[
          css`
            height: 80px;
            width: 80px;
            border-radius: 40px;
            justify-content: center;
            align-items: center;
            background-color: ${
              isDarkMode
                ? `rgba(${iconColor === '#FB8C00' ? '251, 140, 0' : '249, 168, 37'}, 0.1)`
                : `rgba(${iconColor === '#FB8C00' ? '251, 140, 0' : '249, 168, 37'}, 0.08)`
            };
            align-self: center;
          `,
        ]}
      >
        <Icon name={iconName as IconName} size={48} color={iconColor} />
      </BulbIconContainer>

      <Typography.Body1
        style={css`
          font-weight: bold;
          text-align: center;
          color: ${theme.text?.basic || '#37140B'};
          margin-top: 12px;
        `}
      >
        {count} {t('purchase.bulbs')}
      </Typography.Body1>

      <PurchaseButtonContainer>
        <PurchaseButton
          style={[
            css`
              width: 100%;
              padding: 14px;
              border-radius: 12px;
              align-items: center;
              background-color: ${theme.button?.primary?.bg || '#FF5B50'};
              opacity: ${isLoading ? 0.7 : 1};
            `,
            {
              ...(Platform.OS === 'android'
                ? {elevation: 1}
                : {
                    shadowColor: '#000',
                    shadowOffset: {width: 0, height: 1},
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                  }),
            },
          ]}
          onPress={onPress}
          disabled={isLoading || !!disabled}
        >
          <Typography.Body2
            style={css`
              color: ${theme.button?.primary?.text || 'white'};
              font-weight: bold;
            `}
          >
            {isLoading
              ? t('purchase.processing')
              : t('purchase.buyFor', {price})}
          </Typography.Body2>
        </PurchaseButton>
      </PurchaseButtonContainer>
    </BulbPackItem>
  );
};

type PurchaseScreenProps = {
  products: Product[];
  subscriptions: ProductSubscription[];
  connected: boolean;
  isLoading: boolean;
  iapReady: boolean;
  onBuyBulbs: (productId: string) => Promise<void>;
  onBuySubscription: (subscriptionId: string) => Promise<void>;
  onBuyCertifiedBadge: () => Promise<void>;
  badgeOwned: boolean;
};

function PurchaseScreen({
  products,
  subscriptions,
  connected,
  isLoading,
  iapReady,
  onBuyBulbs,
  onBuySubscription,
  onBuyCertifiedBadge,
  badgeOwned,
}: PurchaseScreenProps) {
  const {theme, themeType} = useCPK();
  const {navigate} = useRouter();
  const {bulbCount} = useBulbManager();
  const isDarkMode = themeType === 'dark';
  const isPlatformSupported = SUPPORTED_PLATFORMS.includes(Platform.OS);
  const canRenderPurchaseScreen = iapReady || SHOW_PAYMENT_TEST_TOOLS;
  const canBuyBulbs = iapReady || SHOW_PAYMENT_TEST_TOOLS;

  // Receipt validation actions handled in wrapper

  // 구독 상태 가져오기
  const {isPremium, premiumPlan} = useUserStore();

  // Get product price by ID with proper platform checking
  const getProductPrice = (productId: string): string => {
    if (!products || products.length === 0) {
      return Platform.OS === 'ios' ? '$0.99' : '₩1,200';
    }

    const product = products.find((p) => p.id === productId);
    if (!product) return Platform.OS === 'ios' ? '$0.99' : '₩1,200';

    if (Platform.OS === 'ios') {
      return product.displayPrice || '$0.99';
    } /* Platform.OS === "android" */ else {
      return product.displayPrice || '₩1,200';
    }
  };

  const androidStore = getAndroidSubscriptionStore();
  const showStoreTerms = Platform.OS === 'ios' || androidStore === 'google';
  const monthlyTerms = getSubscriptionTerms(
    subscriptions.find((s) => s.id === subscriptionSkus[0]),
    androidStore,
  );
  const yearlyTerms = getSubscriptionTerms(
    subscriptions.find((s) => s.id === subscriptionSkus[1]),
    androidStore,
  );
  const openSubscriptionManagement = async () => {
    try {
      await Linking.openURL(
        Platform.OS === 'ios'
          ? 'https://apps.apple.com/account/subscriptions'
          : 'https://play.google.com/store/account/subscriptions?package=dev.hyo.martie',
      );
    } catch {
      Alert.alert(
        t('purchase.subscriptionManage'),
        t('purchase.tryAgainLater'),
      );
    }
  };

  // Handle bulb pack purchase
  // Custom header right component - Bulb count indicator
  const renderHeaderRight = useCallback(() => {
    return (
      <View
        style={css`
          flex-direction: row;
          align-items: center;
          padding: 8px 16px;
          border-radius: 20px;
          background-color: ${isDarkMode ? '#3F2E00' : '#FFF8E1'};
          margin-right: -12px;
        `}
      >
        <Image
          source={IC_BULB}
          style={css`
            width: 20px;
            height: 20px;
            margin-right: 4px;
          `}
        />
        <Text
          style={css`
            font-weight: bold;
            font-size: 16px;
            color: ${isDarkMode ? '#FFD54F' : '#F57F17'};
          `}
        >
          {bulbCount || 0}
        </Text>
      </View>
    );
  }, [bulbCount, isDarkMode]);

  // Render platform not supported message
  const renderPlatformNotSupported = () => {
    return (
      <View
        style={css`
          flex: 1;
          justify-content: center;
          align-items: center;
          padding: 24px;
          background-color: ${theme.bg?.basic || '#FFFDF6'};
        `}
      >
        <Icon
          name="ShoppingCart"
          size={64}
          color={theme.role?.danger || '#E53935'}
        />

        <Typography.Heading2
          style={css`
            margin-top: 24px;
            text-align: center;
            color: ${theme.text?.basic || '#37140B'};
          `}
        >
          {t('purchase.notSupported')}
        </Typography.Heading2>

        <Typography.Body1
          style={css`
            margin-top: 16px;
            text-align: center;
            color: ${theme.text.label || '#666666'};
          `}
        >
          {t('purchase.platformNotSupported')}
        </Typography.Body1>
      </View>
    );
  };

  // Render store connecting loading state
  const renderStoreConnecting = () => {
    return (
      <View
        style={css`
          flex: 1;
          justify-content: center;
          align-items: center;
          padding: 24px;
        `}
      >
        <ActivityIndicator
          size="large"
          color={theme.role?.primary || '#FF5B50'}
        />
        <Typography.Body1
          style={css`
            margin-top: 16px;
            text-align: center;
            color: ${theme.text?.basic || '#37140B'};
          `}
        >
          {t('purchase.notConnected')}
        </Typography.Body1>
        <Typography.Body2
          style={css`
            margin-top: 8px;
            text-align: center;
            color: ${theme.text?.label || '#666666'};
          `}
        >
          {t('purchase.tryAgainLater')}
        </Typography.Body2>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t('my.purchase'),
          headerStyle: {
            backgroundColor: theme.bg?.paper || '#F3F2E5',
          },
          headerTintColor: theme.text?.basic || '#37140B',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerRight: renderHeaderRight,
        }}
      />

      <View
        style={css`
          flex: 1;
          background-color: ${theme.bg?.basic || '#FFFDF6'};
        `}
      >
        {isPlatformSupported ? (
          canRenderPurchaseScreen ? (
            <ScrollView
              style={css`
                flex: 1;
              `}
              contentContainerStyle={css`
                padding: 16px;
                padding-bottom: 32px;
              `}
            >
              <Typography.Heading1
                style={css`
                  margin: 24px 0;
                  text-align: center;
                  color: ${theme.text?.basic || '#37140B'};
                `}
              >
                {t('purchase.getMorePower')}
              </Typography.Heading1>

              {__DEV__ && (
                <Typography.Body2
                  style={css`
                    text-align: center;
                    margin-bottom: 16px;
                    color: ${
                      connected
                        ? theme.role?.success || 'green'
                        : theme.role?.danger || 'red'
                    };
                  `}
                >
                  {connected ? 'Connected to store' : 'Not connected to store'}
                </Typography.Body2>
              )}

              {(SHOW_PAYMENT_TEST_TOOLS ||
                ENABLE_ANDROID_ALTERNATIVE_BILLING) && (
                <PaymentTestBanner
                  mode={getTestBannerMode()}
                  modeLabel={getPaymentTestModeLabel()}
                />
              )}

              <SectionHeader
                style={css`
                  color: ${theme.text?.basic || '#37140B'};
                `}
              >
                {t('purchase.bulbPacks')}
              </SectionHeader>

              <Typography.Body2
                style={css`
                  margin-bottom: 16px;
                  color: ${theme.text?.disabled || '#8F8F8F'};
                `}
              >
                {t('purchase.bulbPackDescription')}
              </Typography.Body2>

              <View
                style={css`
                  flex-direction: row;
                  justify-content: space-between;
                `}
              >
                <BulbPack
                  count={10}
                  price={getProductPrice(bulbPackSkus[0])}
                  iconName="Lightning"
                  iconColor="#F9A825"
                  marginDirection="right"
                  isDarkMode={isDarkMode}
                  isLoading={isLoading}
                  disabled={!canBuyBulbs}
                  onPress={() => onBuyBulbs(bulbPackSkus[0])}
                />

                <BulbPack
                  count={30}
                  price={getProductPrice(bulbPackSkus[1])}
                  iconName="LightningA"
                  iconColor="#FB8C00"
                  marginDirection="left"
                  isDarkMode={isDarkMode}
                  isLoading={isLoading}
                  disabled={!canBuyBulbs}
                  onPress={() => onBuyBulbs(bulbPackSkus[1])}
                />
              </View>

              {ENABLE_ANDROID_ALTERNATIVE_BILLING && (
                <Typography.Body4
                  style={css`
                    margin-top: 12px;
                    color: ${theme.text?.disabled || '#8F8F8F'};
                  `}
                >
                  {t('purchase.altBilling.disclosure')}
                </Typography.Body4>
              )}

              <SectionHeader
                style={css`
                  color: ${theme.text?.basic || '#37140B'};
                  margin-top: 48px;
                  padding-top: 16px;
                  border-top-width: 1px;
                  border-top-color: ${
                    isDarkMode
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(0, 0, 0, 0.05)'
                  };
                `}
              >
                {t('purchase.premiumSubscription')}
              </SectionHeader>

              <View
                style={[
                  css`
                    border-radius: 16px;
                    padding: 20px;
                    border-width: 0;
                    margin-bottom: 24px;
                    background-color: ${theme.bg?.bubble || '#FFFFFF'};
                    border-color: ${theme.role?.border || '#E8E8E8'};
                    ${isDarkMode ? 'border-width: 1px;' : ''}
                  `,
                  {
                    ...(Platform.OS === 'android'
                      ? {elevation: 2}
                      : {
                          shadowColor: '#000',
                          shadowOffset: {width: 0, height: 2},
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                        }),
                  },
                ]}
              >
                <View
                  style={css`
                    flex-direction: row;
                    align-items: center;
                    margin-bottom: 4px;
                  `}
                >
                  <View
                    style={css`
                      width: 48px;
                      height: 48px;
                      border-radius: 24px;
                      justify-content: center;
                      align-items: center;
                      background-color: ${
                        isDarkMode
                          ? 'rgba(142, 36, 170, 0.1)'
                          : 'rgba(142, 36, 170, 0.08)'
                      };
                    `}
                  >
                    <Icon name="Crown" size={32} color="#8E24AA" />
                  </View>
                  <View>
                    <Typography.Body1
                      style={css`
                        font-weight: bold;
                        margin-left: 8px;
                        color: ${theme.text?.basic || '#37140B'};
                      `}
                    >
                      {t('purchase.premiumSubscription')}
                    </Typography.Body1>

                    {isPremium && (
                      <Typography.Body2
                        style={css`
                          margin-left: 8px;
                          color: ${theme.role?.success || '#4CAF50'};
                          font-weight: bold;
                        `}
                      >
                        {t('purchase.activeSubscription')}
                      </Typography.Body2>
                    )}
                    {isPremium && premiumPlan && (
                      <Typography.Body2
                        style={css`
                          margin-left: 8px;
                          color: ${theme.text?.label || '#666'};
                        `}
                      >
                        {premiumPlan === 'yearly'
                          ? t('purchase.planYearly')
                          : t('purchase.planMonthly')}
                      </Typography.Body2>
                    )}
                  </View>
                </View>

                <View
                  style={css`
                    margin-top: 16px;
                    margin-bottom: 16px;
                  `}
                >
                  <BenefitItem>
                    <BenefitIcon
                      name="ProhibitInset"
                      size={20}
                      color={theme.text?.disabled || '#8F8F8F'}
                    />
                    <Typography.Body2
                      style={css`
                        color: ${theme.text?.disabled || '#8F8F8F'};
                        margin-left: 8px;
                      `}
                    >
                      {t('purchase.removeAds')}
                    </Typography.Body2>
                  </BenefitItem>

                  <BenefitItem>
                    <BenefitIcon
                      name="ChatText"
                      size={20}
                      color={theme.text?.disabled || '#8F8F8F'}
                    />
                    <Typography.Body2
                      style={css`
                        color: ${theme.text?.disabled || '#8F8F8F'};
                        margin-left: 8px;
                      `}
                    >
                      {t('purchase.unlimitedQuizChat')}
                    </Typography.Body2>
                  </BenefitItem>

                  <BenefitItem>
                    <BenefitIcon
                      name="Lightning"
                      size={20}
                      color={theme.text?.disabled || '#8F8F8F'}
                    />
                    <Typography.Body2
                      style={css`
                        color: ${theme.text?.disabled || '#8F8F8F'};
                        margin-left: 8px;
                      `}
                    >
                      {t('purchase.unlimitedBulbs')}
                    </Typography.Body2>
                  </BenefitItem>
                </View>

                <Typography.Body4
                  style={css`
                    color: ${theme.text?.basic};
                    line-height: 20px;
                    margin-top: 8px;
                  `}
                >
                  {t('purchase.subscriptionOptional')}
                </Typography.Body4>
                {Platform.OS === 'ios' && (
                  <Typography.Body4
                    style={css`
                      color: ${theme.text?.basic};
                      line-height: 20px;
                      margin-top: 8px;
                    `}
                  >
                    {t('purchase.appleSubscriptionNotice')}
                  </Typography.Body4>
                )}
                {!isPremium && showStoreTerms && monthlyTerms && (
                  <Typography.Body4
                    style={css`
                      color: ${theme.text?.basic};
                      line-height: 20px;
                      margin-top: 16px;
                    `}
                  >
                    {monthlyTerms.autoRenews
                      ? t('purchase.monthlyRenewalTerms', {
                          price: monthlyTerms.price,
                        })
                      : t('purchase.monthlyPrepaidTerms', {
                          price: monthlyTerms.price,
                        })}
                  </Typography.Body4>
                )}
                <PurchaseButton
                  style={[
                    css`
                      width: 100%;
                      padding: 14px;
                      border-radius: 12px;
                      align-items: center;
                      background-color: ${isPremium ? '#8262b5' : '#8e24aa'};
                      margin-top: 8px;
                      opacity: ${isLoading || isPremium ? 0.7 : 1};
                    `,
                    {
                      ...(Platform.OS === 'android'
                        ? {elevation: 1}
                        : {
                            shadowColor: '#000',
                            shadowOffset: {width: 0, height: 1},
                            shadowOpacity: 0.1,
                            shadowRadius: 2,
                          }),
                    },
                  ]}
                  onPress={() => {
                    if (!isPremium) {
                      onBuySubscription(subscriptionSkus[0]);
                    }
                  }}
                  disabled={
                    isLoading || isPremium || !iapReady || !monthlyTerms
                  }
                >
                  {isPremium ? (
                    <View
                      style={css`
                        flex-direction: row;
                        align-items: center;
                        justify-content: center;
                      `}
                    >
                      <Icon
                        name="CheckCircle"
                        size={16}
                        color="white"
                        style={css`
                          margin-right: 4px;
                        `}
                      />
                      <Typography.Body2
                        style={css`
                          color: white;
                          font-weight: bold;
                        `}
                      >
                        {t('purchase.alreadySubscribed')}
                      </Typography.Body2>
                    </View>
                  ) : (
                    <Typography.Body2
                      style={css`
                        color: white;
                        font-weight: bold;
                      `}
                    >
                      {isLoading
                        ? t('purchase.processing')
                        : !monthlyTerms
                          ? t('purchase.subscriptionUnavailable')
                          : monthlyTerms.autoRenews
                            ? t('purchase.subscribeFor', {
                                price: monthlyTerms.price,
                              })
                            : t('purchase.buyMonthlyPrepaid', {
                                price: monthlyTerms.price,
                              })}
                    </Typography.Body2>
                  )}
                </PurchaseButton>

                {/* Yearly subscription button */}
                {!isPremium && (
                  <>
                    {showStoreTerms && yearlyTerms && (
                      <Typography.Body4
                        style={css`
                          color: ${theme.text?.basic};
                          line-height: 20px;
                          margin-top: 16px;
                        `}
                      >
                        {t('purchase.yearlyRenewalTerms', {
                          price: yearlyTerms.price,
                        })}
                      </Typography.Body4>
                    )}
                    <PurchaseButton
                      style={[
                        css`
                          width: 100%;
                          padding: 14px;
                          border-radius: 12px;
                          align-items: center;
                          background-color: #6a1b9a;
                          margin-top: 8px;
                          opacity: ${isLoading ? 0.7 : 1};
                        `,
                        {
                          ...(Platform.OS === 'android'
                            ? {elevation: 1}
                            : {
                                shadowColor: '#000',
                                shadowOffset: {width: 0, height: 1},
                                shadowOpacity: 0.1,
                                shadowRadius: 2,
                              }),
                        },
                      ]}
                      onPress={() => onBuySubscription(subscriptionSkus[1])}
                      disabled={isLoading || !iapReady || !yearlyTerms}
                    >
                      <Typography.Body2
                        style={css`
                          color: white;
                          font-weight: bold;
                        `}
                      >
                        {isLoading
                          ? t('purchase.processing')
                          : !yearlyTerms
                            ? t('purchase.subscriptionUnavailable')
                            : t('purchase.subscribeYearlyFor', {
                                price: yearlyTerms.price,
                              })}
                      </Typography.Body2>
                    </PurchaseButton>
                  </>
                )}
                {showStoreTerms && (
                  <>
                    <Typography.Body4
                      style={css`
                        color: ${theme.text?.basic};
                        line-height: 20px;
                        margin-top: 16px;
                      `}
                    >
                      {Platform.OS === 'ios'
                        ? t('purchase.appleSubscriptionManagement')
                        : t('purchase.googleSubscriptionManagement')}
                    </Typography.Body4>
                    <Pressable
                      accessibilityRole="link"
                      onPress={openSubscriptionManagement}
                      style={css`
                        padding-vertical: 12px;
                      `}
                    >
                      <Typography.Body2
                        style={css`
                          color: ${theme.text?.basic};
                          text-decoration-line: underline;
                        `}
                      >
                        {t('purchase.subscriptionManage')}
                      </Typography.Body2>
                    </Pressable>
                  </>
                )}
              </View>

              <View
                style={[
                  css`
                    margin-top: 24px;
                    border-radius: 20px;
                    padding: 20px;
                    background-color: ${theme.bg?.bubble || '#FFFFFF'};
                    border-width: ${isDarkMode ? 1 + 'px' : 0};
                    border-color: ${theme.role?.border || '#E8E8E8'};
                  `,
                  {
                    ...(Platform.OS === 'android'
                      ? {elevation: 2}
                      : {
                          shadowColor: '#000',
                          shadowOffset: {width: 0, height: 2},
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                        }),
                  },
                ]}
              >
                <View
                  style={css`
                    flex-direction: row;
                    align-items: center;
                    margin-bottom: 12px;
                  `}
                >
                  <View
                    style={css`
                      width: 48px;
                      height: 48px;
                      border-radius: 24px;
                      justify-content: center;
                      align-items: center;
                      background-color: ${
                        isDarkMode
                          ? 'rgba(30, 136, 229, 0.12)'
                          : 'rgba(30, 136, 229, 0.08)'
                      };
                    `}
                  >
                    <Icon name="ShieldCheck" size={28} color="#1E88E5" />
                  </View>
                  <View
                    style={css`
                      margin-left: 12px;
                      flex: 1;
                    `}
                  >
                    <Typography.Body1
                      style={css`
                        font-weight: bold;
                        color: ${theme.text?.basic || '#37140B'};
                      `}
                    >
                      {t('purchase.certifiedBadgeTitle')}
                    </Typography.Body1>
                    <Typography.Body2
                      style={css`
                        margin-top: 4px;
                        color: ${theme.text?.label || '#666'};
                      `}
                    >
                      {t('purchase.certifiedBadgeDescription')}
                    </Typography.Body2>
                  </View>
                </View>

                <PurchaseButton
                  style={[
                    css`
                      width: 100%;
                      padding: 14px;
                      border-radius: 12px;
                      align-items: center;
                      background-color: ${badgeOwned ? '#4caf50' : '#1e88e5'};
                      opacity: ${isLoading || badgeOwned ? 0.7 : 1};
                    `,
                    {
                      ...(Platform.OS === 'android'
                        ? {elevation: 1}
                        : {
                            shadowColor: '#000',
                            shadowOffset: {width: 0, height: 1},
                            shadowOpacity: 0.1,
                            shadowRadius: 2,
                          }),
                    },
                  ]}
                  onPress={() => {
                    if (!badgeOwned) {
                      onBuyCertifiedBadge();
                    }
                  }}
                  disabled={isLoading || badgeOwned || !iapReady}
                >
                  {badgeOwned ? (
                    <View
                      style={css`
                        flex-direction: row;
                        align-items: center;
                        justify-content: center;
                      `}
                    >
                      <Icon
                        name="CheckCircle"
                        size={16}
                        color="white"
                        style={css`
                          margin-right: 4px;
                        `}
                      />
                      <Typography.Body2
                        style={css`
                          color: white;
                          font-weight: bold;
                        `}
                      >
                        {t('purchase.certifiedBadgeOwned')}
                      </Typography.Body2>
                    </View>
                  ) : (
                    <Typography.Body2
                      style={css`
                        color: white;
                        font-weight: bold;
                      `}
                    >
                      {isLoading
                        ? t('purchase.processing')
                        : t('purchase.buyFor', {
                            price: getProductPrice(CERTIFIED_BADGE_SKU),
                          })}
                    </Typography.Body2>
                  )}
                </PurchaseButton>
              </View>

              <Typography.Body4
                style={css`
                  text-align: center;
                  margin-top: 24px;
                  line-height: 20px;
                  color: ${theme.text?.label || '#666666'};
                `}
              >
                {t('purchase.policyAgreement', {
                  termsOfService: `**${t('common.termsOfService')}**`,
                  privacyPolicy: `**${t('common.privacyPolicy')}**`,
                })
                  .split('**')
                  .map((str, i) =>
                    i % 2 === 0 ? (
                      str
                    ) : (
                      <Typography.Body4
                        onPress={() => {
                          if (str === t('common.privacyPolicy')) {
                            if (getLocale() === 'ko') {
                              return navigate('/privacyandpolicy-ko');
                            }
                            return navigate('/privacyandpolicy');
                          }
                          if (str === t('common.termsOfService')) {
                            if (getLocale() === 'ko') {
                              return navigate('/termsofservice-ko');
                            }
                            return navigate('/termsofservice');
                          }
                        }}
                        key={str}
                        style={css`
                          text-decoration-line: underline;
                          line-height: 20px;
                          color: ${theme.text?.basic};
                        `}
                      >
                        {str}
                      </Typography.Body4>
                    ),
                  )}
              </Typography.Body4>

              {!connected && (
                <Typography.Body2
                  style={css`
                    color: ${theme.role?.danger || '#E53935'};
                    text-align: center;
                    margin-top: 12px;
                  `}
                >
                  {t('purchase.storeConnectionError')}
                </Typography.Body2>
              )}
            </ScrollView>
          ) : (
            renderStoreConnecting()
          )
        ) : (
          renderPlatformNotSupported()
        )}
      </View>
    </>
  );
}

const SectionHeader = styled.Text`
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 16px;
`;

const BulbPackItem = styled.View`
  flex: 1;
  gap: 4px;
  border-radius: 16px;
  padding: 20px;
  padding-bottom: 24px;
  border-width: 0;
  justify-content: space-between;
  position: relative;
  overflow: visible;
`;

const BulbIconContainer = styled.View`
  height: 80px;
  width: 80px;
  border-radius: 40px;
  align-items: center;
  justify-content: center;
  align-self: center;
`;

const PurchaseButtonContainer = styled.View`
  margin-top: 6px;
  margin-bottom: 0;
  padding: 0;
  width: 100%;
`;

const PurchaseButton = styled.TouchableOpacity`
  padding: 14px;
  border-radius: 12px;
  align-items: center;
  width: 100%;
`;

const BenefitItem = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 12px;
`;

const BenefitIcon = styled(Icon)``;

// Wrapper component that owns useIAP and passes a bridge + state to PurchaseScreen
function PurchaseWrapper() {
  const {theme} = useCPK();
  const isPlatformSupported = SUPPORTED_PLATFORMS.includes(Platform.OS);
  const router = useRouter();
  const {isAuthenticated, isLoading: isAuthLoading} = useConvexAuth();
  const currentUser = useQuery(
    api.user.queries.currentUser,
    isAuthenticated ? {} : 'skip',
  );
  const currentUserId = currentUser?._id;
  const hasPurchaseAccount =
    !isAuthLoading && isAuthenticated && !!currentUserId;
  const showSignInModal = useSignInRequireModalStore((s) => s.setVisible);
  const requirePurchaseAccount = useCallback(() => {
    if (hasPurchaseAccount) return true;
    if (!isAuthLoading && !isAuthenticated) showSignInModal(true);
    return false;
  }, [hasPurchaseAccount, isAuthLoading, isAuthenticated, showSignInModal]);
  const hasCertifiedBadge = useUserStore((s) => s.hasCertifiedBadge);
  const setCertifiedBadge = useUserStore((s) => s.setCertifiedBadge);

  // Convex actions/mutations
  const verifyAmazonPurchase = useAction(api.amazon.verifyAmazonPurchase);
  const grantTestBulbs = useMutation(api.user.mutations.grantTestBulbs);
  const verifyPurchaseAction = useAction(api.iap.verifyPurchase);
  const verifyApplePurchase = useAction(api.apple.verifyApplePurchase);

  const subscriptionAlertShown = useRef<boolean>(false);
  const currentPurchaseProductId = useRef<string | null>(null);
  const lastPurchaseProductId = useRef<string | null>(null);
  const isLoadingRef = useRef<boolean>(false);
  const purchaseAttemptId = useRef<number>(0);
  const handledPurchaseErrorKeys = useRef<Set<string>>(new Set());
  const [billingSheetVisible, setBillingSheetVisible] = useState(false);
  const pendingBillingChoice = useRef<{
    pg: (pg: 'toss' | 'naver') => void;
  } | null>(null);
  const pendingUserChoiceBilling = useRef<{
    productId: string;
    onChoice: (token: string) => void;
  } | null>(null);
  const handledUserChoiceTokens = useRef<Set<string>>(new Set());
  const processingPurchaseTransactionIds = useRef<Set<string>>(new Set());
  const handledPurchaseTransactionIds = useRef<Set<string>>(new Set());
  const recordedSubscriptionTransactionIds = useRef<Set<string>>(new Set());

  const [isLoading, setIsLoading] = useState(false);
  const [badgeOwned, setBadgeOwned] = useState(() => hasCertifiedBadge);
  const [isCheckingEntitlements, setIsCheckingEntitlements] = useState(
    () => isPlatformSupported && !SHOW_PAYMENT_TEST_TOOLS,
  );

  const setPurchaseLoading = useCallback((nextIsLoading: boolean) => {
    if (isLoadingRef.current === nextIsLoading) {
      return;
    }

    isLoadingRef.current = nextIsLoading;
    setIsLoading(nextIsLoading);
  }, []);

  const finishPurchaseAttempt = useCallback(() => {
    setPurchaseLoading(false);
    currentPurchaseProductId.current = null;
    pendingUserChoiceBilling.current = null;
    pendingBillingChoice.current = null;
    setBillingSheetVisible(false);
  }, [setPurchaseLoading]);

  useEffect(() => {
    finishPurchaseAttempt();
  }, [currentUserId, isAuthenticated, finishPurchaseAttempt]);

  const shouldHandlePurchaseError = useCallback(
    (error: unknown, fallbackProductId?: string): boolean => {
      const productId =
        fallbackProductId ||
        getPurchaseErrorProductId(error) ||
        currentPurchaseProductId.current ||
        lastPurchaseProductId.current ||
        '';
      const key = getPurchaseErrorDedupeKey(
        error,
        productId,
        purchaseAttemptId.current,
      );

      if (handledPurchaseErrorKeys.current.has(key)) {
        return false;
      }

      handledPurchaseErrorKeys.current.add(key);
      return true;
    },
    [],
  );

  const syncCertifiedBadgeOwnership = useCallback(
    (owned: boolean) => {
      setBadgeOwned((currentOwned) =>
        currentOwned === owned ? currentOwned : owned,
      );

      if (useUserStore.getState().hasCertifiedBadge !== owned) {
        setCertifiedBadge(owned);
      }
    },
    [setCertifiedBadge],
  );

  const setPremiumSubscriptionState = useCallback((productId: string) => {
    const plan = getPremiumPlanForSubscriptionId(productId);

    useUserStore.setState((s) => {
      if (s.isPremium && s.premiumPlan === plan) {
        return s;
      }

      return {
        ...s,
        isPremium: true,
        premiumPlan: plan,
      };
    });
  }, []);

  const purchaseOwner = useRef(currentUserId);
  useEffect(() => {
    purchaseOwner.current = currentUserId;
    recordedSubscriptionTransactionIds.current.clear();
    handledPurchaseTransactionIds.current.clear();
  }, [currentUserId]);
  const completeGooglePurchase = useCallback(
    async (
      purchase: PurchaseLike,
      productId: string,
      amount = 0,
      currency = 'USD',
    ) => {
      const owner = currentUserId;
      if (
        !owner ||
        typeof purchase.purchaseToken !== 'string' ||
        !purchase.purchaseToken
      ) {
        throw new Error('Google purchase requires an account and receipt');
      }
      const result = await verifyPurchaseAction({
        packageName: 'dev.hyo.martie',
        productId,
        purchaseToken: purchase.purchaseToken,
        completePurchase: true,
        amount,
        currency,
      });
      if (!result.isValid || !result.entitlement)
        throw new Error('Google purchase is not valid');
      if (purchaseOwner.current !== owner)
        throw new Error('Purchase account changed');
      return result.entitlement;
    },
    [currentUserId, verifyPurchaseAction],
  );

  const completeApplePurchase = useCallback(
    async (purchase: PurchaseLike, productId: string) => {
      const owner = currentUserId;
      if (
        !owner ||
        typeof purchase.purchaseToken !== 'string' ||
        !purchase.purchaseToken
      ) {
        throw new Error(
          'Apple purchase requires an account and signed receipt',
        );
      }
      const result = await verifyApplePurchase({
        productId,
        signedTransaction: purchase.purchaseToken,
      });
      if (purchaseOwner.current !== owner)
        throw new Error('Purchase account changed');
      return result;
    },
    [currentUserId, verifyApplePurchase],
  );

  const recoverStorePurchase = useCallback(
    async (purchase: Purchase) => {
      const productId =
        getSubscriptionPlanProductId(purchase) ?? purchase.productId;
      if (Platform.OS === 'ios')
        await completeApplePurchase(purchase, productId);
      else await completeGooglePurchase(purchase, productId);
      await finishIapTransaction({
        purchase,
        isConsumable: bulbPackSkus.includes(productId),
      });
      if (productId === CERTIFIED_BADGE_SKU) syncCertifiedBadgeOwnership(true);
      if (subscriptionSkus.includes(productId))
        await useUserStore.getState().checkPremium();
    },
    [
      completeApplePurchase,
      completeGooglePurchase,
      syncCertifiedBadgeOwnership,
    ],
  );

  const recordSubscriptionEntitlement = useCallback(
    async (
      productId: string,
      entitlement?: PurchaseLike | null,
    ): Promise<void> => {
      if (!entitlement) {
        return;
      }

      let transactionId: string;
      try {
        transactionId = getPurchaseRecordTransactionId(entitlement);
      } catch {
        return;
      }

      const dedupeKey = `${productId}:${transactionId}`;
      if (recordedSubscriptionTransactionIds.current.has(dedupeKey)) {
        return;
      }

      try {
        if (Platform.OS === 'ios') {
          await completeApplePurchase(entitlement, productId);
          recordedSubscriptionTransactionIds.current.add(dedupeKey);
          return;
        }
        if (isGooglePurchase(entitlement)) {
          await completeGooglePurchase(entitlement, productId);
          recordedSubscriptionTransactionIds.current.add(dedupeKey);
          return;
        }
        if (isAmazonPurchase(entitlement)) {
          await verifyAmazonPurchase({
            productId,
            ...getAmazonReceipt(entitlement, transactionId),
            amount: 0,
            currency: DEFAULT_RESTORED_PURCHASE_CURRENCY,
          });
          recordedSubscriptionTransactionIds.current.add(dedupeKey);
          return;
        }
        // Other stores cannot be verified on the server: nothing is granted.
        recordedSubscriptionTransactionIds.current.add(dedupeKey);
      } catch (error) {
        recordedSubscriptionTransactionIds.current.delete(dedupeKey);
        console.warn('failed recording restored subscription');
        throw error;
      }
    },
    [completeApplePurchase, completeGooglePurchase, verifyAmazonPurchase],
  );

  const onStartPurchase = useCallback(
    (productId: string): boolean => {
      if (isLoadingRef.current) {
        return false;
      }

      purchaseAttemptId.current += 1;
      handledPurchaseErrorKeys.current.clear();
      currentPurchaseProductId.current = productId;
      lastPurchaseProductId.current = productId;
      setPurchaseLoading(true);
      return true;
    },
    [setPurchaseLoading],
  );

  const findOwnedSubscription = useCallback(
    async (
      preferredSubscriptionId?: string,
    ): Promise<{
      productId: string;
      purchase?: Purchase;
      entitlement?: PurchaseLike;
    } | null> => {
      try {
        const activeSubscriptions =
          await getActiveSubscriptionsFromStore(subscriptionSkus);
        const preferredActiveSubscription = activeSubscriptions.find(
          (subscription: PurchaseLike) =>
            getSubscriptionPlanProductId(subscription) ===
              preferredSubscriptionId && subscription.isActive !== false,
        );
        const activeSubscription =
          preferredActiveSubscription ||
          activeSubscriptions.find(
            (subscription: PurchaseLike) =>
              getSubscriptionPlanProductId(subscription) &&
              subscription.isActive !== false,
          );

        const activeSubscriptionProductId =
          getSubscriptionPlanProductId(activeSubscription);

        if (activeSubscriptionProductId) {
          return {
            productId: activeSubscriptionProductId,
            entitlement: activeSubscription,
          };
        }
      } catch {
        // Fall back to available purchases below. Amazon can report ownership
        // even when active subscription queries are not populated yet.
      }

      try {
        const purchases = await getAvailablePurchasesFromStore();
        const preferredPurchase = purchases.find(
          (purchase: PurchaseLike) =>
            getSubscriptionPlanProductId(purchase) ===
              preferredSubscriptionId && isActiveSubscriptionPurchase(purchase),
        );
        const ownedPurchase =
          preferredPurchase ||
          purchases.find(
            (purchase: PurchaseLike) =>
              getSubscriptionPlanProductId(purchase) &&
              isActiveSubscriptionPurchase(purchase),
          );

        const ownedPurchaseProductId =
          getSubscriptionPlanProductId(ownedPurchase);

        if (ownedPurchaseProductId) {
          return {
            productId: ownedPurchaseProductId,
            purchase: ownedPurchase,
            entitlement: ownedPurchase,
          };
        }
      } catch {
        return null;
      }

      return null;
    },
    [],
  );

  const restoreExistingSubscription = useCallback(
    async (preferredSubscriptionId?: string): Promise<boolean> => {
      const ownedSubscription = await findOwnedSubscription(
        preferredSubscriptionId,
      );
      const restoredProductId = ownedSubscription?.productId ?? null;

      if (!restoredProductId) {
        return false;
      }

      await recordSubscriptionEntitlement(
        restoredProductId,
        ownedSubscription?.purchase || ownedSubscription?.entitlement,
      );
      if (ownedSubscription?.purchase) {
        await finishIapTransaction({
          purchase: ownedSubscription.purchase,
          isConsumable: false,
        });
      }
      setPremiumSubscriptionState(restoredProductId);

      return true;
    },
    [
      findOwnedSubscription,
      recordSubscriptionEntitlement,
      setPremiumSubscriptionState,
    ],
  );

  // IAP hook with handlers implemented here
  const {
    products,
    subscriptions,
    connected,
    availablePurchases,
    activeSubscriptions,
    finishTransaction,
    fetchProducts,
    requestPurchase,
    getAvailablePurchases,
  } = useIAP({
    enableBillingProgramAndroid: ENABLE_ANDROID_ALTERNATIVE_BILLING
      ? 'user-choice-billing'
      : undefined,
    onUserChoiceBillingAndroid: (details: UserChoiceBillingDetails) => {
      if (!hasPurchaseAccount) return;
      const pending = pendingUserChoiceBilling.current;
      if (
        !pending ||
        (!details.products.includes(pending.productId) &&
          !details.productDetailsAndroid?.some(
            (product) => product.id === pending.productId,
          ))
      ) {
        return;
      }

      // Consume before opening our provider chooser: duplicate events must
      // never reuse the token or create a second checkout.
      const token = details.externalTransactionToken.trim();
      if (handledUserChoiceTokens.current.has(token)) {
        return;
      }
      pendingUserChoiceBilling.current = null;
      if (!token) {
        finishPurchaseAttempt();
        Alert.alert(t('purchase.purchaseError'), t('purchase.tryAgainLater'));
        return;
      }
      handledUserChoiceTokens.current.add(token);
      pending.onChoice(token);
    },
    onPurchaseSuccess: async (purchase) => {
      if (!hasPurchaseAccount) return;
      let transactionId: string | null = null;
      let startedProcessingTransaction = false;
      let skippedDuplicateTransaction = false;
      let purchaseCompleted = false;

      try {
        const productId =
          getSubscriptionPlanProductId(purchase) ?? purchase.productId;
        const isConsumable = bulbPackSkus.includes(productId);
        const isBadgeProduct = productId === CERTIFIED_BADGE_SKU;
        transactionId = getPurchaseRecordTransactionId(purchase);

        if (
          processingPurchaseTransactionIds.current.has(transactionId) ||
          handledPurchaseTransactionIds.current.has(transactionId)
        ) {
          skippedDuplicateTransaction = true;
          return;
        }

        processingPurchaseTransactionIds.current.add(transactionId);
        startedProcessingTransaction = true;

        if (Platform.OS === 'ios' || isGooglePurchase(purchase)) {
          const product = products.find((item) => item.id === productId);
          const subscription = subscriptions.find(
            (item) => item.id === productId,
          );
          const phase =
            subscription?.platform === 'android'
              ? getAndroidSubscriptionOffer(subscription)?.pricingPhasesAndroid
                  ?.pricingPhaseList[0]
              : undefined;
          const amount =
            typeof product?.price === 'number'
              ? product.price
              : Number(phase?.priceAmountMicros ?? 0) / 1_000_000;
          const currency =
            product?.currency || phase?.priceCurrencyCode || 'USD';
          const result =
            Platform.OS === 'ios'
              ? await completeApplePurchase(purchase, productId)
              : await completeGooglePurchase(
                  purchase,
                  productId,
                  amount,
                  currency,
                );
          await finishTransaction({purchase, isConsumable});
          purchaseCompleted = true;
          if (!result.alreadyRecorded)
            logEvent('purchase_recorded', {
              productId,
              amount,
              currency,
              paymentMethod: Platform.OS === 'ios' ? 'apple' : 'google',
            });
          if (isBadgeProduct) syncCertifiedBadgeOwnership(true);
          if (subscriptionSkus.includes(productId))
            await useUserStore.getState().checkPremium();
          if (!result.alreadyRecorded && isConsumable) {
            Alert.alert(
              t('purchase.thankYou'),
              t('purchase.purchaseComplete', {count: result.bulbsGranted}),
            );
          } else if (!result.alreadyRecorded && isBadgeProduct) {
            Alert.alert(
              t('purchase.thankYou'),
              t('purchase.certifiedBadgeUnlocked'),
            );
          }
          return;
        }

        if (!isAmazonPurchase(purchase)) {
          // Only stores the server can verify grant anything.
          Alert.alert(
            t('purchase.notSupported'),
            t('purchase.platformNotSupported'),
          );
          return;
        }

        const amazonProduct =
          products.find((item) => item.id === productId) ??
          subscriptions.find((item) => item.id === productId);
        const amount =
          typeof amazonProduct?.price === 'number' ? amazonProduct.price : 0;
        const currency = amazonProduct?.currency || 'USD';
        const result = await verifyAmazonPurchase({
          productId,
          ...getAmazonReceipt(purchase, transactionId),
          amount,
          currency,
        });
        await finishTransaction({purchase, isConsumable});
        if (!result.alreadyRecorded) {
          logEvent('purchase_recorded', {
            productId,
            amount,
            currency,
            paymentMethod: 'amazon',
            transactionId,
          });
        }
        if (isBadgeProduct) syncCertifiedBadgeOwnership(true);
        if (!result.alreadyRecorded && isConsumable) {
          Alert.alert(
            t('purchase.thankYou'),
            t('purchase.purchaseComplete', {count: result.bulbsGranted}),
          );
        } else if (!result.alreadyRecorded && isBadgeProduct) {
          Alert.alert(
            t('purchase.thankYou'),
            t('purchase.certifiedBadgeUnlocked'),
          );
        }
        if (!isConsumable && subscriptionSkus.includes(productId)) {
          try {
            await useUserStore.getState().checkPremium();
            if (
              useUserStore.getState().isPremium &&
              !subscriptionAlertShown.current
            ) {
              subscriptionAlertShown.current = true;
              // Wait for the store sheet to close before alerting.
              requestIdleCallback(() => {
                Alert.alert(
                  t('purchase.thankYou'),
                  t('purchase.subscriptionActivated'),
                );
              });
            }
          } catch (e) {
            console.error('Error updating premium status:', e);
          }
        }
        purchaseCompleted = true;
      } catch {
        logError(
          new Error('Store purchase verification or completion failed'),
          'onPurchaseSuccess',
        );
        Alert.alert(t('purchase.purchaseError'), t('purchase.tryAgainLater'));
      } finally {
        if (startedProcessingTransaction && transactionId) {
          processingPurchaseTransactionIds.current.delete(transactionId);
          if (purchaseCompleted)
            handledPurchaseTransactionIds.current.add(transactionId);
          if (handledPurchaseTransactionIds.current.size > 50) {
            const oldestTransactionId = handledPurchaseTransactionIds.current
              .values()
              .next().value;
            if (oldestTransactionId) {
              handledPurchaseTransactionIds.current.delete(oldestTransactionId);
            }
          }
        }
        if (!skippedDuplicateTransaction) {
          finishPurchaseAttempt();
        }
      }
    },
    onPurchaseError: async (error) => {
      if (!shouldHandlePurchaseError(error)) {
        return;
      }

      // Suppress alert when user cancels; just log and clear loading
      if (isUserCancelledPurchaseError(error)) {
        console.log('[useIAP] User cancelled purchase');
        finishPurchaseAttempt();
        return;
      }
      if (isDeferredOrPendingPurchaseError(error)) {
        console.log('[useIAP] Purchase deferred/pending:', error);
        finishPurchaseAttempt();
        return;
      }
      if (isServiceTimeoutPurchaseError(error)) {
        console.log('[useIAP] Purchase service timed out');
        finishPurchaseAttempt();
        return;
      }
      if (Platform.OS === 'android' && isAlreadyOwnedPurchaseError(error)) {
        try {
          const productId =
            currentPurchaseProductId.current ||
            getPurchaseErrorProductId(error);
          const restoredSubscription =
            !productId || subscriptionSkus.includes(productId)
              ? await restoreExistingSubscription(productId || undefined)
              : false;

          if (restoredSubscription) {
            return;
          }

          const purchases = await getAvailablePurchasesFromStore();
          const matches = purchases.filter((p) =>
            productId
              ? p.productId === productId
              : [...bulbPackSkus, CERTIFIED_BADGE_SKU].includes(p.productId),
          );
          for (const m of matches) {
            if (isGooglePurchase(m)) {
              await recoverStorePurchase(m);
              continue;
            }
            const consumable = bulbPackSkus.includes(m.productId);
            await finishTransaction({purchase: m, isConsumable: consumable});
            if (!consumable && m.productId === CERTIFIED_BADGE_SKU) {
              syncCertifiedBadgeOwnership(true);
            }
          }
          if (matches.some((m) => m.productId === CERTIFIED_BADGE_SKU)) {
            Alert.alert(
              t('purchase.thankYou'),
              t('purchase.certifiedBadgeOwned'),
            );
          } else {
            Alert.alert(
              'Previous Purchase Restored',
              'Please try purchasing again.',
            );
          }
        } catch (e) {
          console.warn('resolve already owned (callback) error:', e);
        } finally {
          finishPurchaseAttempt();
        }
        return;
      }
      console.error('[useIAP] onPurchaseError:', error);
      Alert.alert(
        t('purchase.purchaseError'),
        getPurchaseErrorInfo(error).message || t('purchase.tryAgainLater'),
      );
      finishPurchaseAttempt();
    },
  });

  // Initialize products when IAP connection is established
  useEffect(() => {
    if (!hasPurchaseAccount || !connected || !isPlatformSupported) {
      setIsCheckingEntitlements(false);
      return;
    }

    let cancelled = false;
    const initializeIAP = async (): Promise<void> => {
      setIsCheckingEntitlements(true);
      try {
        await fetchProducts({
          skus: [...bulbPackSkus, ...badgeSkus],
          type: 'in-app',
        });
        if (cancelled) return;
        await fetchProducts({
          skus: subscriptionSkus,
          type: 'subs',
        });
        if (cancelled) return;
        await getAvailablePurchases();
        if (cancelled) return;
        await useUserStore.getState().checkPremium();
      } catch (error) {
        console.error('Error initializing IAP:', error);
      } finally {
        if (!cancelled) {
          setIsCheckingEntitlements(false);
        }
      }
    };
    initializeIAP();

    return () => {
      cancelled = true;
    };
  }, [
    hasPurchaseAccount,
    connected,
    fetchProducts,
    getAvailablePurchases,
    isPlatformSupported,
  ]);

  useEffect(() => {
    if (hasPurchaseAccount && availablePurchases) {
      const owned = availablePurchases.some(
        (purchase: PurchaseLike) =>
          Platform.OS !== 'ios' &&
          !isGooglePurchase(purchase) &&
          purchase.productId === CERTIFIED_BADGE_SKU,
      );
      syncCertifiedBadgeOwnership(owned);
    }
  }, [hasPurchaseAccount, availablePurchases, syncCertifiedBadgeOwnership]);

  useEffect(() => {
    if (!hasPurchaseAccount) return;
    const activeSubscriptionList = activeSubscriptions ?? [];
    const availablePurchaseList = availablePurchases ?? [];
    const activeSubscription = activeSubscriptionList.find(
      (subscription: PurchaseLike) =>
        getSubscriptionPlanProductId(subscription) &&
        subscription.isActive !== false,
    );
    const activePurchase = availablePurchaseList.find(
      (purchase: PurchaseLike) =>
        getSubscriptionPlanProductId(purchase) &&
        isActiveSubscriptionPurchase(purchase),
    );
    const activeSubscriptionId =
      getSubscriptionPlanProductId(activeSubscription) ||
      getSubscriptionPlanProductId(activePurchase);

    if (activeSubscriptionId) {
      recordSubscriptionEntitlement(
        activeSubscriptionId,
        activePurchase || activeSubscription,
      )
        .then(() => setPremiumSubscriptionState(activeSubscriptionId))
        .catch(() => undefined);
    }
  }, [
    hasPurchaseAccount,
    activeSubscriptions,
    availablePurchases,
    recordSubscriptionEntitlement,
    setPremiumSubscriptionState,
  ]);

  useEffect(() => {
    if (!hasPurchaseAccount) return;
    for (const purchase of availablePurchases ?? []) {
      if (
        (Platform.OS === 'ios' || isGooglePurchase(purchase)) &&
        [...bulbPackSkus, CERTIFIED_BADGE_SKU].includes(purchase.productId)
      ) {
        void recoverStorePurchase(purchase).catch(() => undefined);
      }
    }
  }, [availablePurchases, hasPurchaseAccount, recoverStorePurchase]);

  useEffect(() => {
    syncCertifiedBadgeOwnership(hasCertifiedBadge);
  }, [hasCertifiedBadge, syncCertifiedBadgeOwnership]);

  const iapReady = hasPurchaseAccount && connected && isPlatformSupported;

  const handlePurchaseBulbs = useCallback(
    async (productId: string): Promise<void> => {
      if (!requirePurchaseAccount()) return;

      const requestIapBulbPurchase = async (
        withUserChoice = false,
      ): Promise<void> => {
        if (!connected) {
          Alert.alert(t('purchase.notConnected'), t('purchase.tryAgainLater'));
          return;
        }

        if (!iapReady) {
          Alert.alert(t('purchase.notConnected'), t('purchase.tryAgainLater'));
          return;
        }

        if (!SUPPORTED_PLATFORMS.includes(Platform.OS)) {
          Alert.alert(
            t('purchase.notSupported'),
            t('purchase.platformNotSupported'),
          );
          return;
        }

        try {
          if (!onStartPurchase(productId)) {
            return;
          }

          if (withUserChoice) {
            pendingUserChoiceBilling.current = {
              productId,
              onChoice: (token) => {
                pendingBillingChoice.current = {
                  pg: (pg) => {
                    startAltBillingPgPurchase(pg, token);
                  },
                };
                setBillingSheetVisible(true);
              },
            };
          }

          await requestPurchase({
            type: 'in-app',
            request: {
              apple: {
                sku: productId,
                appAccountToken: getAppleAccountToken(currentUserId),
                andDangerouslyFinishTransactionAutomatically: false,
              },
              google: {skus: [productId], obfuscatedAccountId: currentUserId},
            },
          });
        } catch (err) {
          if (!shouldHandlePurchaseError(err, productId)) {
            return;
          }

          if (isUserCancelledPurchaseError(err)) {
            finishPurchaseAttempt();
            return;
          }

          if (isDeferredOrPendingPurchaseError(err)) {
            console.log('[purchase] bulb purchase deferred/pending:', err);
            finishPurchaseAttempt();
            return;
          }

          if (isServiceTimeoutPurchaseError(err)) {
            console.log('[purchase] bulb purchase service timed out');
            finishPurchaseAttempt();
            return;
          }

          if (Platform.OS === 'android' && isAlreadyOwnedPurchaseError(err)) {
            try {
              const purchases = await getAvailablePurchasesFromStore();
              const existing = purchases.find((p) => p.productId === productId);
              if (existing) {
                if (isGooglePurchase(existing))
                  await recoverStorePurchase(existing);
                else
                  await finishTransaction({
                    purchase: existing,
                    isConsumable: true,
                  });
                Alert.alert('Previous Purchase Restored', 'Please try again.');
              } else {
                Alert.alert('Product Already Owned', 'Please try again later.');
              }
            } catch {
              Alert.alert('Product Already Owned', 'Please try again later.');
            }
            finishPurchaseAttempt();
            return;
          }

          console.error('Purchase request failed:', err);

          if (err instanceof Error) {
            console.error(`Error message: ${err.message}`);
            console.error(`Error stack: ${err.stack}`);
          }

          finishPurchaseAttempt();
        }
      };

      const openTossCheckout = (
        withGoogleReporting: boolean,
        altToken: string,
      ): void => {
        const product = products.find((p) => p.id === productId);
        const androidProduct = product as ProductAndroid | undefined;
        const amountKrw = getTossAmountKrw(
          androidProduct != null && typeof androidProduct.price === 'number'
            ? {
                priceCurrencyCode: androidProduct.currency,
                priceAmountMicros: Math.round(androidProduct.price * 1_000_000),
              }
            : undefined,
          productId,
        );

        if (amountKrw <= 0) {
          Alert.alert(t('purchase.purchaseError'), t('purchase.tryAgainLater'));
          return;
        }

        router.push({
          pathname: '/toss-checkout',
          params: {
            productId,
            amountKrw: String(amountKrw),
            orderId: buildTossOrderId(productId),
            orderName: t('purchase.altBilling.orderName', {
              count: getBulbPackCount(productId),
            }),
            report: withGoogleReporting ? '1' : '0',
            altToken,
            ownerUserId: currentUserId,
          },
        });
      };

      const openNaverCheckout = (
        withGoogleReporting: boolean,
        altToken: string,
      ): void => {
        const product = products.find((p) => p.id === productId);
        const androidProduct = product as ProductAndroid | undefined;
        const amountKrw = getNaverAmountKrw(
          androidProduct != null && typeof androidProduct.price === 'number'
            ? {
                priceCurrencyCode: androidProduct.currency,
                priceAmountMicros: Math.round(androidProduct.price * 1_000_000),
              }
            : undefined,
          productId,
        );

        if (amountKrw <= 0 || !buildNaverReturnUrl()) {
          Alert.alert(t('purchase.purchaseError'), t('purchase.tryAgainLater'));
          return;
        }

        router.push({
          pathname: '/naver-checkout',
          params: {
            productId,
            amountKrw: String(amountKrw),
            merchantPayKey: buildNaverMerchantPayKey(productId),
            orderName: t('purchase.altBilling.orderName', {
              count: getBulbPackCount(productId),
            }),
            report: withGoogleReporting ? '1' : '0',
            altToken,
            ownerUserId: currentUserId,
          },
        });
      };

      const startAltBillingPgPurchase = (
        pg: 'toss' | 'naver',
        altToken: string,
      ): void => {
        const hasKeys =
          pg === 'toss'
            ? Boolean(TOSS_CLIENT_KEY)
            : Boolean(NAVER_PAY_CLIENT_ID && NAVER_PAY_CHAIN_ID);

        if (!hasKeys) {
          Alert.alert(
            pg === 'toss'
              ? t('purchase.toss.checkoutTitle')
              : t('purchase.naver.checkoutTitle'),
            t('purchase.altBilling.missingClientKey'),
          );
          finishPurchaseAttempt();
          return;
        }

        try {
          if (pg === 'toss') {
            openTossCheckout(true, altToken);
          } else {
            openNaverCheckout(true, altToken);
          }
        } catch {
          Alert.alert(t('purchase.purchaseError'), t('purchase.tryAgainLater'));
        } finally {
          finishPurchaseAttempt();
        }
      };

      if (PAYMENT_MODE === PaymentMode.MockPg) {
        const bulbsToAdd = getBulbPackCount(productId);
        const paymentModeLabel = getPaymentTestModeLabel();

        if (bulbsToAdd <= 0) {
          Alert.alert(t('purchase.purchaseError'), t('purchase.tryAgainLater'));
          return;
        }

        const buttons = [
          {text: 'Cancel', style: 'cancel' as const},
          {
            text: 'Grant bulbs',
            onPress: async () => {
              setPurchaseLoading(true);

              try {
                await grantTestBulbs({count: bulbsToAdd});
                logEvent('payment_test_purchase_completed', {
                  productId,
                  paymentMode: PAYMENT_MODE,
                  bulbsToAdd,
                });
                Alert.alert(
                  t('purchase.thankYou'),
                  t('purchase.purchaseComplete', {count: bulbsToAdd}),
                );
              } catch (error) {
                console.error('Failed to grant test bulbs:', error);
              } finally {
                finishPurchaseAttempt();
              }
            },
          },
        ];

        if (iapReady) {
          buttons.push({
            text: 'Google Play',
            onPress: async () => {
              await requestIapBulbPurchase();
            },
          });
        }

        Alert.alert(
          'Payment test mode',
          `${paymentModeLabel} mode will grant ${bulbsToAdd} bulbs without a real charge.`,
          buttons,
        );
        return;
      }

      if (PAYMENT_MODE === PaymentMode.TossTest) {
        if (!TOSS_CLIENT_KEY) {
          Alert.alert(
            t('purchase.toss.checkoutTitle'),
            t('purchase.altBilling.missingClientKey'),
          );
          return;
        }

        openTossCheckout(false, '');
        return;
      }

      if (PAYMENT_MODE === PaymentMode.NaverTest) {
        if (!NAVER_PAY_CLIENT_ID || !NAVER_PAY_CHAIN_ID) {
          Alert.alert(
            t('purchase.naver.checkoutTitle'),
            t('purchase.altBilling.missingClientKey'),
          );
          return;
        }

        openNaverCheckout(false, '');
        return;
      }

      if (ENABLE_ANDROID_ALTERNATIVE_BILLING) {
        await requestIapBulbPurchase(true);
        return;
      }

      await requestIapBulbPurchase();
    },
    [
      connected,
      finishPurchaseAttempt,
      finishTransaction,
      iapReady,
      requirePurchaseAccount,
      currentUserId,
      onStartPurchase,
      products,
      recoverStorePurchase,
      requestPurchase,
      router,
      shouldHandlePurchaseError,
      setPurchaseLoading,
      grantTestBulbs,
    ],
  );

  const handleBillingMethodSelect = useCallback(
    (method: BillingMethod): void => {
      setBillingSheetVisible(false);
      const pending = pendingBillingChoice.current;
      pendingBillingChoice.current = null;

      if (!pending) {
        return;
      }

      if (method === 'googlePlay') {
        finishPurchaseAttempt();
        return;
      }
      pending.pg(method);
    },
    [finishPurchaseAttempt],
  );

  const handlePurchaseCertifiedBadge = useCallback(async (): Promise<void> => {
    if (!requirePurchaseAccount()) return;
    if (badgeOwned) {
      Alert.alert(t('purchase.thankYou'), t('purchase.certifiedBadgeOwned'));
      return;
    }

    if (!connected) {
      Alert.alert(t('purchase.notConnected'), t('purchase.tryAgainLater'));
      return;
    }

    if (!iapReady) {
      Alert.alert(t('purchase.notConnected'), t('purchase.tryAgainLater'));
      return;
    }

    if (!SUPPORTED_PLATFORMS.includes(Platform.OS)) {
      Alert.alert(
        t('purchase.notSupported'),
        t('purchase.platformNotSupported'),
      );
      return;
    }

    try {
      if (!onStartPurchase(CERTIFIED_BADGE_SKU)) {
        return;
      }

      await requestPurchase({
        type: 'in-app',
        request: {
          apple: {
            sku: CERTIFIED_BADGE_SKU,
            appAccountToken: getAppleAccountToken(currentUserId),
            andDangerouslyFinishTransactionAutomatically: false,
          },
          google: {
            skus: [CERTIFIED_BADGE_SKU],
            obfuscatedAccountId: currentUserId,
          },
        },
      });
    } catch (err) {
      if (!shouldHandlePurchaseError(err, CERTIFIED_BADGE_SKU)) {
        return;
      }

      if (isUserCancelledPurchaseError(err)) {
        finishPurchaseAttempt();
        return;
      }

      if (isDeferredOrPendingPurchaseError(err)) {
        console.log(
          '[purchase] certified badge purchase deferred/pending:',
          err,
        );
        finishPurchaseAttempt();
        return;
      }

      if (isServiceTimeoutPurchaseError(err)) {
        console.log('[purchase] certified badge purchase service timed out');
        finishPurchaseAttempt();
        return;
      }

      if (Platform.OS === 'android' && isAlreadyOwnedPurchaseError(err)) {
        try {
          const purchases = await getAvailablePurchasesFromStore();
          const existing = purchases.find(
            (p) => p.productId === CERTIFIED_BADGE_SKU,
          );
          if (existing) {
            if (isGooglePurchase(existing))
              await recoverStorePurchase(existing);
            else
              await finishTransaction({
                purchase: existing,
                isConsumable: false,
              });
            syncCertifiedBadgeOwnership(true);
            Alert.alert(
              t('purchase.thankYou'),
              t('purchase.certifiedBadgeOwned'),
            );
          } else {
            Alert.alert(
              t('purchase.purchaseError'),
              t('purchase.tryAgainLater'),
            );
          }
        } catch {
          Alert.alert(t('purchase.purchaseError'), t('purchase.tryAgainLater'));
        }
        finishPurchaseAttempt();
        return;
      }

      console.error('Certified badge purchase failed:', err);
      finishPurchaseAttempt();
    }
  }, [
    badgeOwned,
    currentUserId,
    requirePurchaseAccount,
    recoverStorePurchase,
    connected,
    finishPurchaseAttempt,
    finishTransaction,
    iapReady,
    onStartPurchase,
    requestPurchase,
    shouldHandlePurchaseError,
    syncCertifiedBadgeOwnership,
  ]);

  const handlePurchaseSubscription = useCallback(
    async (subscriptionId: string): Promise<void> => {
      if (!requirePurchaseAccount()) return;
      if (!connected) {
        Alert.alert(t('purchase.notConnected'), t('purchase.tryAgainLater'));
        return;
      }

      if (!iapReady) {
        Alert.alert(t('purchase.notConnected'), t('purchase.tryAgainLater'));
        return;
      }

      if (!SUPPORTED_PLATFORMS.includes(Platform.OS)) {
        Alert.alert(
          t('purchase.notSupported'),
          t('purchase.platformNotSupported'),
        );
        return;
      }

      try {
        if (!onStartPurchase(subscriptionId)) {
          return;
        }

        const restoredSubscription =
          await restoreExistingSubscription(subscriptionId);
        if (restoredSubscription) {
          finishPurchaseAttempt();
          return;
        }

        const subscription = subscriptions.find((s) => s.id === subscriptionId);
        if (!subscription) {
          throw new Error(`Subscription with ID ${subscriptionId} not found`);
        }

        let requestParams;

        if (Platform.OS === 'ios') {
          requestParams = {
            type: 'subs' as const,
            request: {
              apple: {
                sku: subscriptionId,
                appAccountToken: getAppleAccountToken(currentUserId),
              },
              google: {skus: [subscriptionId]},
            },
          };
        } else {
          const targetProductId = subscriptionId;
          const androidSubscription = subscriptions.find(
            (s) => s.id === targetProductId,
          ) as ProductSubscriptionAndroid | undefined;

          if (!androidSubscription) {
            throw new Error(
              `Android subscription product ${targetProductId} not found`,
            );
          }

          const androidStore = getAndroidSubscriptionStore();
          const preferredOffer = getAndroidSubscriptionOffer(
            androidSubscription,
            androidStore,
          );
          if (androidStore === 'google' && !preferredOffer) {
            throw new Error('Subscription terms are unavailable');
          }

          requestParams = {
            type: 'subs' as const,
            request: {
              apple: {
                sku: subscriptionId,
                appAccountToken: getAppleAccountToken(currentUserId),
              },
              google: {
                skus: [targetProductId],
                obfuscatedAccountId: currentUserId,
                subscriptionOffers: preferredOffer
                  ? [
                      {
                        sku: targetProductId,
                        offerToken: preferredOffer.offerTokenAndroid ?? '',
                      },
                    ]
                  : [{sku: targetProductId, offerToken: ''}],
              },
            },
          };
        }

        await requestPurchase(requestParams);
      } catch (err) {
        if (!shouldHandlePurchaseError(err, subscriptionId)) {
          return;
        }

        if (isUserCancelledPurchaseError(err)) {
          finishPurchaseAttempt();
          return;
        }

        if (isDeferredOrPendingPurchaseError(err)) {
          console.log(
            '[purchase] subscription purchase deferred/pending:',
            err,
          );
          finishPurchaseAttempt();
          return;
        }

        if (isServiceTimeoutPurchaseError(err)) {
          console.log('[purchase] subscription purchase service timed out');
          finishPurchaseAttempt();
          return;
        }

        if (Platform.OS === 'android' && isAlreadyOwnedPurchaseError(err)) {
          const restoredSubscription =
            await restoreExistingSubscription(subscriptionId);
          if (!restoredSubscription) {
            Alert.alert('Product Already Owned', 'Please try again later.');
          }
          finishPurchaseAttempt();
          return;
        }

        console.error('Subscription request failed:', err);

        if (err instanceof Error) {
          console.error(`Error message: ${err.message}`);
          console.error(`Error stack: ${err.stack}`);
        }

        if (!(err instanceof Error && /cancel/i.test(err.message))) {
          Alert.alert(
            t('purchase.purchaseError'),
            err instanceof Error
              ? err.message
              : 'Failed to process subscription',
          );
        }
        finishPurchaseAttempt();
      }
    },
    [
      currentUserId,
      requirePurchaseAccount,
      connected,
      finishPurchaseAttempt,
      iapReady,
      onStartPurchase,
      requestPurchase,
      restoreExistingSubscription,
      shouldHandlePurchaseError,
      subscriptions,
    ],
  );

  // The web build has no store billing and Horizon purchases cannot be
  // verified yet: point players to the App Store and Google Play apps.
  if (!isPlatformSupported || IS_HORIZON_BUILD) {
    return (
      <>
        <Stack.Screen
          options={{title: t('my.purchase'), headerRight: () => null}}
        />
        <View
          testID="purchase-web-notice"
          style={css`
            flex: 1;
            justify-content: center;
            align-items: center;
            padding: 24px;
            background-color: ${theme.bg?.basic || '#FFFDF6'};
          `}
        >
          <Typography.Heading3
            style={css`
              text-align: center;
              color: ${theme.text?.basic || '#37140B'};
            `}
          >
            {t('purchase.webOnlyTitle')}
          </Typography.Heading3>
          <Typography.Body1
            style={css`
              margin: 12px 0 24px;
              text-align: center;
              color: ${theme.text?.label || '#666666'};
            `}
          >
            {t('purchase.webOnlyBody')}
          </Typography.Body1>
          <Pressable
            testID="purchase-web-app-store"
            accessibilityRole="link"
            onPress={() => Linking.openURL(APP_STORE_URLS.ios)}
            style={css`
              width: 240px;
              padding: 14px 24px;
              margin-bottom: 12px;
              border-radius: 12px;
              align-items: center;
              background-color: ${theme.button?.primary?.bg || '#FF5B50'};
            `}
          >
            <Typography.Body1
              style={css`
                color: ${theme.button?.primary?.text || '#FFFFFF'};
              `}
            >
              App Store
            </Typography.Body1>
          </Pressable>
          <Pressable
            testID="purchase-web-google-play"
            accessibilityRole="link"
            onPress={() => Linking.openURL(APP_STORE_URLS.android)}
            style={css`
              width: 240px;
              padding: 14px 24px;
              border-radius: 12px;
              align-items: center;
              background-color: ${theme.button?.primary?.bg || '#FF5B50'};
            `}
          >
            <Typography.Body1
              style={css`
                color: ${theme.button?.primary?.text || '#FFFFFF'};
              `}
            >
              Google Play
            </Typography.Body1>
          </Pressable>
        </View>
      </>
    );
  }

  if (!hasPurchaseAccount) {
    return (
      <>
        <Stack.Screen
          options={{title: t('my.purchase'), headerRight: () => null}}
        />
        <View
          testID="purchase-auth-gate"
          style={css`
            flex: 1;
            justify-content: center;
            align-items: center;
            padding: 24px;
            background-color: ${theme.bg?.basic || '#FFFDF6'};
          `}
        >
          {isAuthLoading || isAuthenticated ? (
            <ActivityIndicator
              size="large"
              color={theme.role?.primary || '#FF5B50'}
            />
          ) : (
            <>
              <Typography.Body1
                style={css`
                  text-align: center;
                  color: ${theme.text?.basic || '#37140B'};
                  margin-bottom: 24px;
                `}
              >
                {t('purchase.signInRequired')}
              </Typography.Body1>
              <Pressable
                testID="purchase-sign-in"
                accessibilityRole="button"
                accessibilityLabel={t('signIn.doLogin')}
                onPress={() => router.push('/sign-in')}
                style={css`
                  padding: 16px 32px;
                  border-radius: 12px;
                  background-color: ${theme.button?.primary?.bg || '#FF5B50'};
                `}
              >
                <Typography.Body1
                  style={css`
                    color: ${theme.button?.primary?.text || '#FFFFFF'};
                  `}
                >
                  {t('signIn.doLogin')}
                </Typography.Body1>
              </Pressable>
            </>
          )}
        </View>
      </>
    );
  }

  // Wrapper-level loading gate
  if (
    (!SHOW_PAYMENT_TEST_TOOLS && !connected) ||
    (!SHOW_PAYMENT_TEST_TOOLS && isCheckingEntitlements) ||
    (!SHOW_PAYMENT_TEST_TOOLS && !__DEV__ && products.length === 0)
  ) {
    return (
      <View
        style={css`
          flex: 1;
          justify-content: center;
          align-items: center;
          padding: 24px;
        `}
      >
        <ActivityIndicator
          size="large"
          color={theme.role?.primary || '#FF5B50'}
        />
        <Typography.Body2
          style={css`
            margin-top: 12px;
            color: ${theme.text?.label || '#666'};
          `}
        >
          {t('purchase.notConnected')}
        </Typography.Body2>
      </View>
    );
  }

  return (
    <>
      <PurchaseScreen
        products={products}
        subscriptions={subscriptions}
        connected={connected}
        isLoading={isLoading}
        iapReady={iapReady}
        onBuyBulbs={handlePurchaseBulbs}
        onBuySubscription={handlePurchaseSubscription}
        onBuyCertifiedBadge={handlePurchaseCertifiedBadge}
        badgeOwned={badgeOwned}
      />
      <AlternativeBillingSheet
        visible={billingSheetVisible}
        tossReady={Boolean(TOSS_CLIENT_KEY)}
        naverReady={Boolean(NAVER_PAY_CLIENT_ID && NAVER_PAY_CHAIN_ID)}
        onSelect={handleBillingMethodSelect}
        onClose={finishPurchaseAttempt}
      />
    </>
  );
}

export default PurchaseWrapper;
