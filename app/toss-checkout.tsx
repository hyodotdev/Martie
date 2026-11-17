/**
 * @name TossCheckout
 *
 * Toss Pay (토스페이) checkout for alternative-billing test flows
 * (PAYMENT_MODE `toss_test` / `alternative_billing`). Test only — not wired
 * to production payment modes.
 *
 * The Toss rail offers Toss Pay only: the v1 payment window opens straight
 * on the Toss Pay screen (no other PG methods). Loads the official Toss
 * payment JS in a WebView and intercepts the success/fail redirect for
 * server-side approval.
 */
import {Stack, useLocalSearchParams, useRouter} from 'expo-router';
import {Typography, useCPK} from 'cpk-ui';
import Constants from 'expo-constants';
import {css} from 'kstyled';
import {useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {WebView} from 'react-native-webview';
import type {ShouldStartLoadRequest} from 'react-native-webview/lib/WebViewTypes';
import {useAction, useConvexAuth, useQuery} from 'convex/react';
import type {Id} from '../convex/_generated/dataModel';
import {confirmAlternativeBillingPayment} from '../src/utils/pendingAlternativeBilling';
import {api} from '../convex/_generated/api';
import {t} from '../src/STRINGS';
import CheckoutBrandTitle from '../src/components/payment/CheckoutBrandTitle';
import OrderSummaryCard from '../src/components/payment/OrderSummaryCard';
import {
  FALLBACK_BULB_PACK_KRW,
  MOCK_TOSS_PAYMENT_KEY_PREFIX,
  TOSS_CLIENT_KEY,
  buildTossPayWindowHtml,
  buildTossReturnUrl,
  getAltBillingBulbCount,
  isMockApprovalAvailable,
} from '../src/utils/alternativeBilling';
import {logEvent} from '../src/utils/analytics';
import {openExternalCheckoutUrl} from '../src/utils/externalUrl';

const FALLBACK_PACKAGE_NAME = 'dev.hyo.martie';

const firstParam = (
  value: string | string[] | undefined,
): string | undefined => (Array.isArray(value) ? value[0] : value);

type CheckoutParams = {
  productId: string;
  amountKrw: number;
  orderId: string;
  orderName: string;
  reportAltBilling: boolean;
  altToken: string;
  ownerUserId: Id<'users'>;
};

const formatKrw = (amountKrw: number): string =>
  `${amountKrw.toLocaleString()}원`;

const parseSuccessParams = (
  url: string,
): {paymentKey: string | null; orderId: string | null; amount: number} => {
  try {
    const parsed = new URL(url);

    return {
      paymentKey: parsed.searchParams.get('paymentKey'),
      orderId: parsed.searchParams.get('orderId'),
      amount: Number(parsed.searchParams.get('amount') ?? NaN),
    };
  } catch {
    const paymentKey = /[?&]paymentKey=([^&]*)/.exec(url)?.[1] ?? null;
    const orderId = /[?&]orderId=([^&]*)/.exec(url)?.[1] ?? null;
    const amount = Number(/[?&]amount=([^&]*)/.exec(url)?.[1] ?? NaN);

    return {paymentKey, orderId, amount};
  }
};

const parseFailParams = (
  url: string,
): {code: string | null; message: string | null} => {
  try {
    const parsed = new URL(url);

    return {
      code: parsed.searchParams.get('code'),
      message: parsed.searchParams.get('message'),
    };
  } catch {
    const code = /[?&]code=([^&]*)/.exec(url)?.[1] ?? null;
    const message = /[?&]message=([^&]*)/.exec(url)?.[1] ?? null;

    return {code, message};
  }
};

function CheckoutBody({params}: {params: CheckoutParams}) {
  const router = useRouter();
  const confirmTossPayment = useAction(api.toss.confirmPayment);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pageOpened, setPageOpened] = useState(false);
  const [popupUrl, setPopupUrl] = useState<string | null>(null);
  const completedRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const insets = useSafeAreaInsets();

  const {productId, amountKrw, orderId, orderName} = params;
  const bulbsToAdd = getAltBillingBulbCount(productId);
  const returnUrl = useMemo(() => buildTossReturnUrl(), []);
  const html = useMemo(
    () =>
      buildTossPayWindowHtml({
        clientKey: TOSS_CLIENT_KEY,
        orderId,
        orderName,
        amountKrw,
        successUrl: returnUrl,
        failUrl: returnUrl,
      }),
    [orderId, orderName, amountKrw, returnUrl],
  );

  const completeTossPayment = async (paymentKey: string): Promise<void> => {
    if (!mountedRef.current || completedRef.current || isProcessing) {
      return;
    }

    if (bulbsToAdd <= 0) {
      Alert.alert(t('purchase.purchaseError'), t('purchase.tryAgainLater'));
      return;
    }

    completedRef.current = true;
    setIsProcessing(true);
    const isMock = paymentKey.startsWith(MOCK_TOSS_PAYMENT_KEY_PREFIX);

    try {
      logEvent('alt_billing_toss_started', {
        productId,
        orderId,
        amountKrw,
        mock: isMock,
      });

      const args = {
        paymentKey,
        orderId,
        amount: amountKrw,
        productId,
        packageName:
          Constants.expoConfig?.android?.package ?? FALLBACK_PACKAGE_NAME,
        transactionToken: params.altToken,
        reportRequired: params.reportAltBilling,
      };
      const confirmed = await confirmAlternativeBillingPayment(
        params.ownerUserId,
        {provider: 'toss', args},
        () => {
          if (!mountedRef.current) throw new Error('Payment account changed');
          return confirmTossPayment(args);
        },
      );

      if (!mountedRef.current) return;

      logEvent('alt_billing_toss_completed', {
        productId,
        orderId,
        amountKrw,
        bulbsToAdd: confirmed.entitlement.bulbsGranted,
        mock: isMock,
        alreadyRecorded: confirmed.entitlement.alreadyRecorded,
        reportStatus: confirmed.report.status,
      });

      Alert.alert(
        t('purchase.thankYou'),
        t('purchase.purchaseComplete', {
          count: confirmed.entitlement.bulbsGranted,
        }),
        [{text: 'OK', onPress: () => router.back()}],
      );
    } catch {
      if (!mountedRef.current) return;
      completedRef.current = false;
      logEvent('alt_billing_toss_failed', {
        productId,
        orderId,
        code: 'confirmation_failed',
        mock: isMock,
      });
      Alert.alert(t('purchase.purchaseError'), t('purchase.tryAgainLater'), [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('error.tryAgain'),
          onPress: () => {
            void completeTossPayment(paymentKey);
          },
        },
      ]);
    } finally {
      if (mountedRef.current) setIsProcessing(false);
    }
  };

  const closePopup = (code: string): void => {
    setPopupUrl(null);

    if (!completedRef.current) {
      logEvent('alt_billing_toss_failed', {productId, orderId, code});
    }
  };

  const handlePopupWindow = (targetUrl: string): void => {
    // Safety net for nested auth popups (e.g. card 3-D Secure). The main
    // Toss window renders as an in-page iframe overlay, not window.open.
    logEvent('alt_billing_toss_popup_opened', {productId, orderId});
    setPopupUrl(targetUrl);
  };

  const handleShouldStartLoad = (request: ShouldStartLoadRequest): boolean => {
    if (returnUrl && request.url.startsWith(returnUrl)) {
      // The success/fail redirect lands in the popup window; dismiss it
      // before completing so the result alert is visible.
      setPopupUrl(null);
      const {
        paymentKey,
        orderId: returnedOrderId,
        amount,
      } = parseSuccessParams(request.url);
      const {code, message} = parseFailParams(request.url);

      if (paymentKey && returnedOrderId === orderId && amount === amountKrw) {
        void completeTossPayment(paymentKey);
      } else {
        const detail = code ?? 'cancelled';
        logEvent('alt_billing_toss_failed', {
          productId,
          orderId,
          code: detail,
        });
        Alert.alert(
          t('purchase.purchaseError'),
          message ? `${detail}: ${message}` : t('purchase.tryAgainLater'),
        );
      }

      return false;
    }

    // Toss Pay hands off to its app via intent:// or scheme links; hand
    // them to the OS instead of loading them in the WebView.
    if (
      !request.url.startsWith('http://') &&
      !request.url.startsWith('https://')
    ) {
      void openExternalCheckoutUrl(request.url).then((opened) => {
        if (!opened) {
          logEvent('alt_billing_toss_failed', {
            productId,
            orderId,
            code: 'app_switch_failed',
          });
        }
      });
      return false;
    }

    return true;
  };

  return (
    <View
      style={css`
        flex: 1;
      `}
    >
      <View
        style={css`
          padding: 12px 16px 8px 16px;
        `}
      >
        <OrderSummaryCard
          compact
          bulbCount={bulbsToAdd}
          orderName={orderName}
          amountKrw={amountKrw}
        />
        {!params.reportAltBilling &&
          isMockApprovalAvailable(process.env.EXPO_PUBLIC_CONVEX_URL ?? '') && (
            <Pressable
              onPress={() => {
                void completeTossPayment(
                  `${MOCK_TOSS_PAYMENT_KEY_PREFIX}${orderId}`,
                );
              }}
              accessibilityRole="button"
              style={css`
                margin-top: 8px;
                border-width: 1px;
                border-color: #0064ff;
                border-radius: 8px;
                padding: 10px;
                align-items: center;
              `}
            >
              <Text
                style={css`
                  color: #0064ff;
                  font-weight: 700;
                `}
              >
                Simulate approval (TEST, no Toss app)
              </Text>
            </Pressable>
          )}
      </View>
      <WebView
        source={{html, baseUrl: new URL(returnUrl).origin}}
        originWhitelist={['*']}
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        setSupportMultipleWindows
        javaScriptCanOpenWindowsAutomatically
        onOpenWindow={(event) => {
          handlePopupWindow(event.nativeEvent.targetUrl);
        }}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data) as {type?: string};

            if (data.type === 'opened') {
              setPageOpened(true);
            } else if (data.type === 'sdk-error') {
              Alert.alert(
                t('purchase.purchaseError'),
                t('purchase.toss.sdkError'),
              );
            }
          } catch {
            // Ignore non-JSON messages from the payment page.
          }
        }}
        onError={() => {
          if (!completedRef.current) {
            Alert.alert(
              t('purchase.purchaseError'),
              t('purchase.toss.sdkError'),
            );
          }
        }}
      />
      <Modal
        visible={popupUrl != null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => closePopup('popup_closed')}
      >
        <View
          style={css`
            flex: 1;
            background-color: #ffffff;
            padding-top: ${insets.top}px;
          `}
        >
          <View
            style={css`
              flex-direction: row;
              align-items: center;
              justify-content: flex-end;
              padding: 4px 8px;
              border-bottom-width: 1px;
              border-bottom-color: #e5e5e5;
            `}
          >
            <Pressable
              onPress={() => closePopup('popup_closed')}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text
                style={css`
                  font-size: 22px;
                  padding: 8px 12px;
                  color: #333333;
                `}
              >
                ✕
              </Text>
            </Pressable>
          </View>
          {popupUrl != null && (
            <WebView
              source={{uri: popupUrl}}
              originWhitelist={['*']}
              domStorageEnabled
              thirdPartyCookiesEnabled
              sharedCookiesEnabled
              setSupportMultipleWindows
              javaScriptCanOpenWindowsAutomatically
              onOpenWindow={(event) => {
                handlePopupWindow(event.nativeEvent.targetUrl);
              }}
              onShouldStartLoadWithRequest={handleShouldStartLoad}
            />
          )}
        </View>
      </Modal>
      {(!pageOpened || isProcessing) && (
        <View
          style={css`
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            align-items: center;
            justify-content: center;
          `}
          pointerEvents="none"
        >
          <ActivityIndicator size="large" />
          <Typography.Body2
            style={css`
              margin-top: 12px;
            `}
          >
            {isProcessing
              ? t('purchase.processing')
              : t('purchase.altBilling.widgetNotReady')}
          </Typography.Body2>
        </View>
      )}
    </View>
  );
}

function CenteredMessage({message}: {message: string}) {
  const {theme} = useCPK();

  return (
    <View
      style={css`
        flex: 1;
        align-items: center;
        justify-content: center;
        padding: 24px;
      `}
    >
      <Typography.Body2
        style={css`
          text-align: center;
          color: ${theme.text?.basic || '#37140B'};
        `}
      >
        {message}
      </Typography.Body2>
    </View>
  );
}

export default function TossCheckoutScreen() {
  const {theme} = useCPK();
  const rawParams = useLocalSearchParams();
  const {isAuthenticated, isLoading: isAuthLoading} = useConvexAuth();
  const currentUser = useQuery(
    api.user.queries.currentUser,
    isAuthenticated ? {} : 'skip',
  );

  if (
    isAuthLoading ||
    !isAuthenticated ||
    !currentUser ||
    firstParam(rawParams.ownerUserId) !== currentUser._id
  ) {
    return <CenteredMessage message={t('purchase.purchaseErrorDesc')} />;
  }

  if (Platform.OS !== 'android') {
    return (
      <>
        <Stack.Screen options={{title: t('purchase.toss.checkoutTitle')}} />
        <CenteredMessage
          message={t('purchase.altBilling.unsupportedPlatform')}
        />
      </>
    );
  }

  if (!TOSS_CLIENT_KEY) {
    return (
      <>
        <Stack.Screen options={{title: t('purchase.toss.checkoutTitle')}} />
        <CenteredMessage message={t('purchase.altBilling.missingClientKey')} />
      </>
    );
  }

  const productId = firstParam(rawParams.productId);
  const orderId = firstParam(rawParams.orderId);
  const orderName = firstParam(rawParams.orderName);
  const amountKrw = Number(firstParam(rawParams.amountKrw));

  if (
    !productId ||
    !orderId ||
    !orderName ||
    !Number.isInteger(amountKrw) ||
    amountKrw <= 0 ||
    amountKrw !== FALLBACK_BULB_PACK_KRW[productId] ||
    (firstParam(rawParams.report) === '1' &&
      !firstParam(rawParams.altToken)?.trim()) ||
    !buildTossReturnUrl()
  ) {
    return (
      <>
        <Stack.Screen options={{title: t('purchase.toss.checkoutTitle')}} />
        <CenteredMessage message={t('purchase.purchaseErrorDesc')} />
      </>
    );
  }

  const params: CheckoutParams = {
    productId,
    amountKrw,
    orderId,
    orderName,
    reportAltBilling: firstParam(rawParams.report) === '1',
    altToken: firstParam(rawParams.altToken) ?? '',
    ownerUserId: currentUser._id,
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: `${t('purchase.toss.checkoutTitle')} · ${formatKrw(amountKrw)}`,
          headerTitle: () => (
            <CheckoutBrandTitle
              mark="toss"
              title={`${t('purchase.toss.checkoutTitle')} · ${formatKrw(amountKrw)}`}
            />
          ),
          headerStyle: {
            backgroundColor: theme.bg?.paper || '#F3F2E5',
          },
        }}
      />
      <CheckoutBody params={params} />
    </>
  );
}
