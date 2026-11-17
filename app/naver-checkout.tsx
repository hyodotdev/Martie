/**
 * @name NaverCheckout
 *
 * Naver Pay 결제형 (단건) checkout for alternative-billing test flows
 * (PAYMENT_MODE `naver_test` / `alternative_billing`). Test only — not wired
 * to production payment modes.
 *
 * Loads the official Naver Pay JS SDK in a WebView and intercepts the
 * returnUrl redirect to capture paymentId for server-side approval.
 */
import {Stack, useLocalSearchParams, useRouter} from 'expo-router';
import {Typography, useCPK} from 'cpk-ui';
import Constants from 'expo-constants';
import {css} from 'kstyled';
import {useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Alert, Platform, View} from 'react-native';
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
  getAltBillingBulbCount,
} from '../src/utils/alternativeBilling';
import {
  buildNaverCheckoutHtml,
  buildNaverReturnUrl,
  getOrCreateNaverUserKey,
  NAVER_PAY_CHAIN_ID,
  NAVER_PAY_CLIENT_ID,
  NAVER_PAY_MODE,
  splitNaverTaxAmounts,
} from '../src/utils/naverPay';
import {logEvent} from '../src/utils/analytics';
import {openExternalCheckoutUrl} from '../src/utils/externalUrl';

const FALLBACK_PACKAGE_NAME = 'dev.hyo.martie';

const firstParam = (
  value: string | string[] | undefined,
): string | undefined => (Array.isArray(value) ? value[0] : value);

type CheckoutParams = {
  productId: string;
  amountKrw: number;
  merchantPayKey: string;
  orderName: string;
  reportAltBilling: boolean;
  altToken: string;
  ownerUserId: Id<'users'>;
};

const formatKrw = (amountKrw: number): string =>
  `${amountKrw.toLocaleString()}원`;

const parseReturnParams = (
  url: string,
): {resultCode: string | null; paymentId: string | null} => {
  try {
    const parsed = new URL(url);

    return {
      resultCode: parsed.searchParams.get('resultCode'),
      paymentId: parsed.searchParams.get('paymentId'),
    };
  } catch {
    const resultCode = /[?&]resultCode=([^&]*)/.exec(url)?.[1] ?? null;
    const paymentId = /[?&]paymentId=([^&]*)/.exec(url)?.[1] ?? null;

    return {resultCode, paymentId};
  }
};

function CheckoutBody({params}: {params: CheckoutParams}) {
  const router = useRouter();
  const applyNaverPayment = useAction(api.naverpay.applyPayment);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pageOpened, setPageOpened] = useState(false);
  const completedRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const {productId, amountKrw, merchantPayKey, orderName} = params;
  const bulbsToAdd = getAltBillingBulbCount(productId);
  const returnUrl = useMemo(() => buildNaverReturnUrl(), []);
  const {taxScopeAmount, taxExScopeAmount} = useMemo(
    () => splitNaverTaxAmounts(amountKrw),
    [amountKrw],
  );
  const html = useMemo(
    () =>
      buildNaverCheckoutHtml({
        clientId: NAVER_PAY_CLIENT_ID,
        chainId: NAVER_PAY_CHAIN_ID,
        mode: NAVER_PAY_MODE,
        merchantUserKey: getOrCreateNaverUserKey(),
        merchantPayKey,
        productName: orderName,
        productId,
        totalPayAmount: amountKrw,
        taxScopeAmount,
        taxExScopeAmount,
        returnUrl,
      }),
    [
      productId,
      merchantPayKey,
      orderName,
      amountKrw,
      taxScopeAmount,
      taxExScopeAmount,
      returnUrl,
    ],
  );

  const completeNaverPayment = async (paymentId: string): Promise<void> => {
    if (!mountedRef.current || completedRef.current || isProcessing) {
      return;
    }

    if (bulbsToAdd <= 0) {
      Alert.alert(t('purchase.purchaseError'), t('purchase.tryAgainLater'));
      return;
    }

    completedRef.current = true;
    setIsProcessing(true);

    try {
      logEvent('alt_billing_naver_started', {
        productId,
        orderId: merchantPayKey,
        amountKrw,
      });

      const args = {
        paymentId,
        merchantPayKey,
        amount: amountKrw,
        productId,
        packageName:
          Constants.expoConfig?.android?.package ?? FALLBACK_PACKAGE_NAME,
        transactionToken: params.altToken,
        reportRequired: params.reportAltBilling,
      };
      const approved = await confirmAlternativeBillingPayment(
        params.ownerUserId,
        {provider: 'naver', args},
        () => {
          if (!mountedRef.current) throw new Error('Payment account changed');
          return applyNaverPayment(args);
        },
      );

      if (!mountedRef.current) return;

      logEvent('alt_billing_naver_completed', {
        productId,
        orderId: merchantPayKey,
        amountKrw,
        bulbsToAdd: approved.entitlement.bulbsGranted,
        alreadyRecorded: approved.entitlement.alreadyRecorded,
        reportStatus: approved.report.status,
      });

      Alert.alert(
        t('purchase.thankYou'),
        t('purchase.purchaseComplete', {
          count: approved.entitlement.bulbsGranted,
        }),
        [{text: 'OK', onPress: () => router.back()}],
      );
    } catch {
      if (!mountedRef.current) return;
      completedRef.current = false;
      logEvent('alt_billing_naver_failed', {
        productId,
        orderId: merchantPayKey,
        code: 'confirmation_failed',
      });
      Alert.alert(t('purchase.purchaseError'), t('purchase.tryAgainLater'), [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('error.tryAgain'),
          onPress: () => {
            void completeNaverPayment(paymentId);
          },
        },
      ]);
    } finally {
      if (mountedRef.current) setIsProcessing(false);
    }
  };

  const handleShouldStartLoad = (request: ShouldStartLoadRequest): boolean => {
    if (returnUrl && request.url.startsWith(returnUrl)) {
      const {resultCode, paymentId} = parseReturnParams(request.url);

      if (resultCode === 'Success' && paymentId) {
        void completeNaverPayment(paymentId);
      } else if (resultCode) {
        logEvent('alt_billing_naver_failed', {
          productId,
          orderId: merchantPayKey,
          code: resultCode,
        });
        Alert.alert(
          t('purchase.purchaseError'),
          `${resultCode}: ${t('purchase.tryAgainLater')}`,
        );
      }

      return false;
    }

    // Naver Pay hands off to bank/card apps via intent:// or scheme links;
    // hand them to the OS instead of loading them in the WebView.
    if (
      !request.url.startsWith('http://') &&
      !request.url.startsWith('https://')
    ) {
      void openExternalCheckoutUrl(request.url).then((opened) => {
        if (!opened) {
          logEvent('alt_billing_naver_failed', {
            productId,
            orderId: merchantPayKey,
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
      </View>
      <WebView
        source={{html, baseUrl: new URL(returnUrl).origin}}
        originWhitelist={['*']}
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data) as {type?: string};

            if (data.type === 'opened') {
              setPageOpened(true);
            } else if (data.type === 'sdk-error') {
              Alert.alert(
                t('purchase.purchaseError'),
                t('purchase.naver.sdkError'),
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
              t('purchase.naver.sdkError'),
            );
          }
        }}
      />
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

export default function NaverCheckoutScreen() {
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
        <Stack.Screen options={{title: t('purchase.naver.checkoutTitle')}} />
        <CenteredMessage
          message={t('purchase.altBilling.unsupportedPlatform')}
        />
      </>
    );
  }

  if (!NAVER_PAY_CLIENT_ID || !NAVER_PAY_CHAIN_ID) {
    return (
      <>
        <Stack.Screen options={{title: t('purchase.naver.checkoutTitle')}} />
        <CenteredMessage message={t('purchase.altBilling.missingClientKey')} />
      </>
    );
  }

  const productId = firstParam(rawParams.productId);
  const merchantPayKey = firstParam(rawParams.merchantPayKey);
  const orderName = firstParam(rawParams.orderName);
  const amountKrw = Number(firstParam(rawParams.amountKrw));

  if (
    !productId ||
    !merchantPayKey ||
    !orderName ||
    !Number.isInteger(amountKrw) ||
    amountKrw <= 0 ||
    amountKrw !== FALLBACK_BULB_PACK_KRW[productId] ||
    (firstParam(rawParams.report) === '1' &&
      !firstParam(rawParams.altToken)?.trim()) ||
    !buildNaverReturnUrl()
  ) {
    return (
      <>
        <Stack.Screen options={{title: t('purchase.naver.checkoutTitle')}} />
        <CenteredMessage message={t('purchase.purchaseErrorDesc')} />
      </>
    );
  }

  const params: CheckoutParams = {
    productId,
    amountKrw,
    merchantPayKey,
    orderName,
    reportAltBilling: firstParam(rawParams.report) === '1',
    altToken: firstParam(rawParams.altToken) ?? '',
    ownerUserId: currentUser._id,
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: `${t('purchase.naver.checkoutTitle')} · ${formatKrw(amountKrw)}`,
          headerTitle: () => (
            <CheckoutBrandTitle
              mark="naver"
              title={`${t('purchase.naver.checkoutTitle')} · ${formatKrw(amountKrw)}`}
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
