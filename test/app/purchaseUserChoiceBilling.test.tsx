import React from 'react';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {Alert, Platform} from 'react-native';
import {useIAP} from '../../src/utils/iap';
import PurchaseWrapper from '../../app/purchase';
import {BULB_PACK_SKUS} from '../../src/utils/iapEntitlements';
import type {Purchase, UserChoiceBillingDetails} from 'expo-iap';
import type {FunctionReference} from 'convex/server';

type IapOptions = NonNullable<Parameters<typeof useIAP>[0]>;
const mockRequestPurchase = jest.fn().mockResolvedValue(undefined);
const mockFetchProducts = jest.fn().mockResolvedValue(undefined);
const mockGetPurchases = jest.fn().mockResolvedValue([]);
const mockFinishTransaction = jest.fn().mockResolvedValue(undefined);
const mockPush = jest.fn();
const mockCheckPremium = jest.fn().mockResolvedValue(undefined);
const mockRecord = jest.fn().mockResolvedValue({});
const mockVerify = jest.fn();
const mockAppleVerify = jest.fn();
const mockAmazonVerify = jest.fn();
const mockGrantBulbs = jest.fn();
const mockShowSignIn = jest.fn();
let mockIsAuthenticated = true;
let mockAuthLoading = false;
let mockUserId: string | undefined = 'user-a';
let mockAlternativeBilling = true;
let mockPaymentTestTools = false;
let mockOptions: IapOptions;

jest.mock('../../src/utils/iap', () => ({
  ...jest.requireActual('../../src/utils/iap'),
  finishTransaction: mockFinishTransaction,
  useIAP: jest.fn((options: IapOptions) => {
    mockOptions = options;
    return {
      connected: true,
      products: [],
      subscriptions: [],
      availablePurchases: [],
      activeSubscriptions: [],
      requestPurchase: mockRequestPurchase,
      fetchProducts: mockFetchProducts,
      getAvailablePurchases: mockGetPurchases,
      finishTransaction: mockFinishTransaction,
    };
  }),
}));
jest.mock('kstyled', () => {
  const component = () => null;
  const template = Object.assign(() => component, {
    __withStyles: () => component,
  });
  const factory = () => template;
  return {
    css: jest.requireActual('kstyled').css,
    styled: new Proxy(factory, {get: () => factory}),
  };
});
jest.mock('cpk-ui', () => ({
  useCPK: () => ({
    theme: {bg: {}, role: {}, text: {}},
    themeType: 'light',
  }),
  Typography: new Proxy({}, {get: () => () => null}),
  Icon: () => null,
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({push: mockPush, navigate: jest.fn()}),
  Stack: {Screen: () => null},
}));
jest.mock('../../src/STRINGS', () => ({
  t: (key: string) => key,
  getLocale: () => 'ko',
}));
jest.mock('../../src/icons', () => ({IC_BULB: 1}));
jest.mock('../../src/utils/analytics', () => ({logEvent: jest.fn()}));
jest.mock('../../src/utils/error', () => ({logError: jest.fn()}));
jest.mock('../../src/hooks/useBulbManager', () => ({
  useBulbManager: () => ({bulbCount: 0, updateBulbCount: mockGrantBulbs}),
}));
jest.mock('../../src/stores/userStore', () => {
  const state = {
    hasCertifiedBadge: false,
    setCertifiedBadge: jest.fn(),
    checkPremium: () => mockCheckPremium(),
    isPremium: false,
  };
  return {
    useUserStore: Object.assign(
      (selector?: (value: typeof state) => unknown) =>
        selector ? selector(state) : state,
      {getState: () => state, setState: jest.fn()},
    ),
  };
});
jest.mock('convex/react', () => ({
  useAction: (reference: FunctionReference<'action'>) => {
    const name = jest
      .requireActual<typeof import('convex/server')>('convex/server')
      .getFunctionName(reference);
    if (name === 'apple:verifyApplePurchase') return mockAppleVerify;
    if (name === 'amazon:verifyAmazonPurchase') return mockAmazonVerify;
    return mockVerify;
  },
  useMutation: () => mockRecord,
  useQuery: () =>
    mockIsAuthenticated && mockUserId ? {_id: mockUserId} : undefined,
  useConvexAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    isLoading: mockAuthLoading,
  }),
}));
jest.mock('../../src/stores/signInRequireModalStore', () => ({
  useSignInRequireModalStore: (
    selector: (state: {setVisible: (visible: boolean) => void}) => unknown,
  ) => selector({setVisible: mockShowSignIn}),
}));
jest.mock('../../src/utils/paymentMode', () => ({
  PaymentMode: {
    IapOnly: 'iap_only',
    MockPg: 'mock_pg',
    TossTest: 'toss_test',
    NaverTest: 'naver_test',
    AlternativeBilling: 'alternative_billing',
  },
  PAYMENT_MODE: 'alternative_billing',
  get ENABLE_ANDROID_ALTERNATIVE_BILLING() {
    return mockAlternativeBilling;
  },
  get SHOW_PAYMENT_TEST_TOOLS() {
    return mockPaymentTestTools;
  },
}));
jest.mock('../../src/utils/alternativeBilling', () => ({
  TOSS_CLIENT_KEY: 'test_mock',
  buildTossOrderId: () => 'mock-toss-order',
  getTossAmountKrw: () => 1400,
}));
jest.mock('../../src/utils/naverPay', () => ({
  NAVER_PAY_CLIENT_ID: 'mock-client',
  NAVER_PAY_CHAIN_ID: 'mock-chain',
  buildNaverMerchantPayKey: () => 'mock-naver-order',
  buildNaverReturnUrl: () => 'https://example.invalid/naver-return',
  getNaverAmountKrw: () => 1400,
}));
jest.mock('../../src/components/payment/PaymentTestBanner', () => () => null);
jest.mock('../../src/components/payment/AlternativeBillingSheet', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) =>
      React.createElement('ProviderChooser', props),
  };
});

type ScreenProps = {onBuyBulbs: (productId: string) => Promise<void>};
type ChooserProps = {
  visible: boolean;
  onSelect: (provider: 'toss' | 'naver') => void;
  onClose: () => void;
};
let renderer: ReactTestRenderer;
const screen = (): ScreenProps =>
  renderer.root.find(
    (node) =>
      typeof node.type === 'function' && node.type.name === 'PurchaseScreen',
  ).props as ScreenProps;
const chooser = (): ChooserProps =>
  renderer.root.find((node) => String(node.type) === 'ProviderChooser')
    .props as ChooserProps;
const choose = (details: UserChoiceBillingDetails): void => {
  act(() => mockOptions.onUserChoiceBillingAndroid?.(details));
};
const tokenDetails = {
  products: [BULB_PACK_SKUS[0]],
  externalTransactionToken: 'mock-listener-token',
};
const originalOS = Platform.OS;

beforeEach(async () => {
  jest.clearAllMocks();
  mockIsAuthenticated = true;
  mockAuthLoading = false;
  mockUserId = 'user-a';
  mockAlternativeBilling = true;
  mockPaymentTestTools = false;
  Object.defineProperty(Platform, 'OS', {value: 'android', configurable: true});
  mockRequestPurchase.mockResolvedValue(undefined);
  mockFinishTransaction.mockResolvedValue(undefined);
  mockVerify.mockResolvedValue({
    isValid: true,
    entitlement: {alreadyRecorded: false, bulbsGranted: 10},
  });
  await act(async () => {
    renderer = create(<PurchaseWrapper />);
  });
});
afterEach(() => {
  act(() => renderer.unmount());
  Object.defineProperty(Platform, 'OS', {
    value: originalOS,
    configurable: true,
  });
  expect(fetch).not.toHaveBeenCalled();
});

it('launches the native Google flow before opening a provider chooser', async () => {
  expect(mockOptions.enableBillingProgramAndroid).toBe('user-choice-billing');
  await act(async () => screen().onBuyBulbs(BULB_PACK_SKUS[0]));
  expect(mockRequestPurchase).toHaveBeenCalledWith({
    type: 'in-app',
    request: {
      apple: {
        sku: BULB_PACK_SKUS[0],
        andDangerouslyFinishTransactionAutomatically: false,
        appAccountToken: expect.any(String),
      },
      google: {skus: [BULB_PACK_SKUS[0]], obfuscatedAccountId: 'user-a'},
    },
  });
  expect(chooser().visible).toBe(false);
  expect(mockPush).not.toHaveBeenCalled();
});

it.each([
  ['ios', false],
  ['android', false],
  ['ios', true],
  ['android', true],
] as const)(
  'hides guest products on %s, including when payment test tools are %s',
  async (platform, testTools) => {
    act(() => renderer.unmount());
    jest.clearAllMocks();
    mockIsAuthenticated = false;
    mockAlternativeBilling = platform === 'android';
    mockPaymentTestTools = testTools;
    Object.defineProperty(Platform, 'OS', {value: platform});
    await act(async () => {
      renderer = create(<PurchaseWrapper />);
    });

    expect(() => screen()).toThrow();
    expect(mockFetchProducts).not.toHaveBeenCalled();
    expect(mockGetPurchases).not.toHaveBeenCalled();
    expect(mockRequestPurchase).not.toHaveBeenCalled();
    act(() =>
      renderer.root.findByProps({testID: 'purchase-sign-in'}).props.onPress(),
    );
    expect(mockPush).toHaveBeenCalledWith('/sign-in');
  },
);

it.each([true, false])(
  'shows the app-only notice on web instead of the store (signed in: %s)',
  async (signedIn) => {
    act(() => renderer.unmount());
    jest.clearAllMocks();
    mockIsAuthenticated = signedIn;
    mockUserId = signedIn ? 'user-a' : undefined;
    Object.defineProperty(Platform, 'OS', {value: 'web'});
    await act(async () => {
      renderer = create(<PurchaseWrapper />);
    });

    expect(() => screen()).toThrow();
    expect(
      renderer.root.findAllByProps({testID: 'purchase-web-notice'}).length,
    ).toBeGreaterThan(0);
    expect(
      renderer.root.findAllByProps({testID: 'purchase-sign-in'}),
    ).toHaveLength(0);
    expect(mockRequestPurchase).not.toHaveBeenCalled();
  },
);

it.each(['auth', 'profile'] as const)(
  'keeps the catalog hidden while %s is loading and reveals it after sign-in',
  async (loading) => {
    act(() => renderer.unmount());
    jest.clearAllMocks();
    mockAuthLoading = loading === 'auth';
    mockUserId = loading === 'profile' ? undefined : 'user-a';
    await act(async () => {
      renderer = create(<PurchaseWrapper />);
    });
    expect(() => screen()).toThrow();
    expect(mockFetchProducts).not.toHaveBeenCalled();
    expect(
      renderer.root.findAllByProps({testID: 'purchase-sign-in'}),
    ).toHaveLength(0);

    mockAuthLoading = false;
    mockUserId = 'user-a';
    await act(async () => renderer.update(<PurchaseWrapper />));
    expect(screen()).toBeDefined();
    expect(mockFetchProducts).toHaveBeenCalledTimes(2);
  },
);

it.each(['toss', 'naver'] as const)(
  'passes the listener token to %s once',
  async (provider) => {
    await act(async () => screen().onBuyBulbs(BULB_PACK_SKUS[0]));
    choose(tokenDetails);
    expect(chooser().visible).toBe(true);
    const select = chooser().onSelect;
    act(() => select(provider));
    choose(tokenDetails);
    act(() => select(provider));
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: `/${provider}-checkout`,
      params: expect.objectContaining({
        altToken: tokenDetails.externalTransactionToken,
        report: '1',
      }),
    });
  },
);

it('ignores unrelated products and accepts structured product details', async () => {
  await act(async () => screen().onBuyBulbs(BULB_PACK_SKUS[0]));
  choose({...tokenDetails, products: [BULB_PACK_SKUS[1]]});
  expect(chooser().visible).toBe(false);
  choose({
    ...tokenDetails,
    products: [],
    productDetailsAndroid: [{id: BULB_PACK_SKUS[0], type: 'in-app'}],
  });
  expect(chooser().visible).toBe(true);
});

it('blocks empty tokens and allows a fresh native purchase', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await act(async () => screen().onBuyBulbs(BULB_PACK_SKUS[0]));
  choose({...tokenDetails, externalTransactionToken: '  '});
  expect(chooser().visible).toBe(false);
  expect(mockPush).not.toHaveBeenCalled();
  expect(alert).toHaveBeenCalled();
  await act(async () => screen().onBuyBulbs(BULB_PACK_SKUS[0]));
  expect(mockRequestPurchase).toHaveBeenCalledTimes(2);
  alert.mockRestore();
});

it('clears chooser cancellation and ignores stale callbacks', async () => {
  await act(async () => screen().onBuyBulbs(BULB_PACK_SKUS[0]));
  choose(tokenDetails);
  const select = chooser().onSelect;
  act(() => chooser().onClose());
  choose(tokenDetails);
  act(() => select('toss'));
  expect(chooser().visible).toBe(false);
  expect(mockPush).not.toHaveBeenCalled();
  await act(async () => screen().onBuyBulbs(BULB_PACK_SKUS[0]));
  expect(mockRequestPurchase).toHaveBeenCalledTimes(2);
});

it('clears native cancellation and permits retry', async () => {
  await act(async () => screen().onBuyBulbs(BULB_PACK_SKUS[0]));
  await act(async () => {
    await mockOptions.onPurchaseError?.(
      Object.assign(new Error('cancelled'), {
        code: 'user-cancelled' as Parameters<
          NonNullable<IapOptions['onPurchaseError']>
        >[0]['code'],
      }),
    );
  });
  choose(tokenDetails);
  expect(chooser().visible).toBe(false);
  await act(async () => screen().onBuyBulbs(BULB_PACK_SKUS[0]));
  expect(mockRequestPurchase).toHaveBeenCalledTimes(2);
});

it('prevents duplicate taps while waiting for the native choice', async () => {
  await act(async () => screen().onBuyBulbs(BULB_PACK_SKUS[0]));
  await act(async () => screen().onBuyBulbs(BULB_PACK_SKUS[1]));
  expect(mockRequestPurchase).toHaveBeenCalledTimes(1);
});

it('does not reuse a cancelled token on a later attempt for the same product', async () => {
  await act(async () => screen().onBuyBulbs(BULB_PACK_SKUS[0]));
  choose(tokenDetails);
  act(() => chooser().onClose());
  await act(async () => screen().onBuyBulbs(BULB_PACK_SKUS[0]));
  choose(tokenDetails);
  expect(chooser().visible).toBe(false);
  choose({...tokenDetails, externalTransactionToken: 'mock-new-token'});
  expect(chooser().visible).toBe(true);
});

it('clears a rejected native request before allowing retry', async () => {
  mockRequestPurchase.mockRejectedValueOnce(new Error('user-cancelled'));
  await act(async () => screen().onBuyBulbs(BULB_PACK_SKUS[0]));
  choose(tokenDetails);
  expect(chooser().visible).toBe(false);
  await act(async () => screen().onBuyBulbs(BULB_PACK_SKUS[0]));
  expect(mockRequestPurchase).toHaveBeenCalledTimes(2);
});

it('invalidates the native choice when authentication changes', async () => {
  await act(async () => screen().onBuyBulbs(BULB_PACK_SKUS[0]));
  choose(tokenDetails);
  const select = chooser().onSelect;
  mockIsAuthenticated = false;
  await act(async () => renderer.update(<PurchaseWrapper />));
  act(() => select('toss'));
  expect(() => screen()).toThrow();
  expect(() => chooser()).toThrow();
  expect(mockPush).not.toHaveBeenCalled();
});

const googlePurchase = {
  id: 'order-test',
  productId: BULB_PACK_SKUS[0],
  purchaseToken: 'receipt-test',
  store: 'google',
  storeId: 'google',
  transactionId: 'order-test',
  purchaseState: 'purchased',
  transactionDate: 1,
  quantity: 1,
  isAutoRenewing: false,
} satisfies Purchase;

it('never finishes or grants a Horizon purchase the server cannot verify', async () => {
  await act(async () => {
    await mockOptions.onPurchaseSuccess?.({
      ...googlePurchase,
      store: 'horizon',
    });
  });
  expect(mockFinishTransaction).not.toHaveBeenCalled();
  expect(mockRecord).not.toHaveBeenCalled();
  expect(mockGrantBulbs).not.toHaveBeenCalled();
});

it('verifies an Amazon receipt on the server before finishing', async () => {
  const order: string[] = [];
  mockAmazonVerify.mockImplementationOnce(async () => {
    order.push('verified-and-granted');
    return {purchaseId: 'p', alreadyRecorded: false, bulbsGranted: 10};
  });
  mockFinishTransaction.mockImplementationOnce(async () => {
    order.push('finished');
  });
  await act(async () => {
    await mockOptions.onPurchaseSuccess?.({
      ...googlePurchase,
      store: 'amazon',
      purchaseToken: 'amazon-receipt',
      userIdAmazon: 'amazon-user',
    });
  });
  expect(order).toEqual(['verified-and-granted', 'finished']);
  expect(mockAmazonVerify).toHaveBeenCalledWith(
    expect.objectContaining({
      productId: BULB_PACK_SKUS[0],
      receiptId: 'amazon-receipt',
      amazonUserId: 'amazon-user',
    }),
  );
  expect(mockRecord).not.toHaveBeenCalled();
  expect(mockGrantBulbs).not.toHaveBeenCalled();
});

it('keeps a rejected Amazon receipt unfinished', async () => {
  mockAmazonVerify.mockRejectedValueOnce(new Error('rvs rejected'));
  await act(async () => {
    await mockOptions.onPurchaseSuccess?.({
      ...googlePurchase,
      store: 'amazon',
      purchaseToken: 'amazon-receipt',
      userIdAmazon: 'amazon-user',
    });
  });
  expect(mockFinishTransaction).not.toHaveBeenCalled();
  expect(mockGrantBulbs).not.toHaveBeenCalled();
});

it.each(['apple', 'google'] as const)(
  'does not finish or grant a late %s purchase after sign-out',
  async (store) => {
    mockIsAuthenticated = false;
    Object.defineProperty(Platform, 'OS', {
      value: store === 'apple' ? 'ios' : 'android',
    });
    await act(async () => renderer.update(<PurchaseWrapper />));
    await act(async () => {
      await mockOptions.onPurchaseSuccess?.({...googlePurchase, store});
    });
    expect(mockFinishTransaction).not.toHaveBeenCalled();
    expect(mockVerify).not.toHaveBeenCalled();
    expect(mockRecord).not.toHaveBeenCalled();
    expect(mockGrantBulbs).not.toHaveBeenCalled();
  },
);

it('stops catalog initialization when the account signs out mid-request', async () => {
  mockIsAuthenticated = false;
  await act(async () => renderer.update(<PurchaseWrapper />));
  jest.clearAllMocks();
  let completeFetch: () => void = () => {};
  mockFetchProducts.mockReturnValueOnce(
    new Promise<void>((resolve) => {
      completeFetch = resolve;
    }),
  );
  mockIsAuthenticated = true;
  await act(async () => renderer.update(<PurchaseWrapper />));
  expect(mockFetchProducts).toHaveBeenCalledTimes(1);
  mockIsAuthenticated = false;
  await act(async () => renderer.update(<PurchaseWrapper />));
  await act(async () => completeFetch());
  expect(mockFetchProducts).toHaveBeenCalledTimes(1);
  expect(mockGetPurchases).not.toHaveBeenCalled();
  expect(mockCheckPremium).not.toHaveBeenCalled();
});

it('records and grants on the server before consuming a Google purchase', async () => {
  const order: string[] = [];
  mockVerify.mockImplementationOnce(async () => {
    order.push('verified-and-granted');
    return {
      isValid: true,
      entitlement: {alreadyRecorded: false, bulbsGranted: 10},
    };
  });
  mockFinishTransaction.mockImplementationOnce(async () => {
    order.push('consumed');
  });
  await act(async () => {
    await mockOptions.onPurchaseSuccess?.(googlePurchase);
  });
  expect(order).toEqual(['verified-and-granted', 'consumed']);
  expect(mockRecord).not.toHaveBeenCalled();
  expect(mockGrantBulbs).not.toHaveBeenCalled();
  expect(mockVerify).toHaveBeenCalledWith(
    expect.objectContaining({
      completePurchase: true,
      purchaseToken: 'receipt-test',
    }),
  );
});

it('verifies and grants an Apple purchase before finishing without a client grant', async () => {
  Object.defineProperty(Platform, 'OS', {value: 'ios'});
  const order: string[] = [];
  mockAppleVerify.mockImplementationOnce(async () => {
    order.push('verified-and-granted');
    return {alreadyRecorded: false, bulbsGranted: 10};
  });
  mockFinishTransaction.mockImplementationOnce(async () => {
    order.push('finished');
  });
  await act(async () => {
    await mockOptions.onPurchaseSuccess?.({...googlePurchase, store: 'apple'});
  });
  expect(order).toEqual(['verified-and-granted', 'finished']);
  expect(mockRecord).not.toHaveBeenCalled();
  expect(mockGrantBulbs).not.toHaveBeenCalled();
  expect(mockAppleVerify).toHaveBeenCalledWith({
    productId: BULB_PACK_SKUS[0],
    signedTransaction: 'receipt-test',
  });
});

it('keeps a rejected Apple receipt unfinished and retries the server grant', async () => {
  Object.defineProperty(Platform, 'OS', {value: 'ios'});
  mockAppleVerify.mockRejectedValueOnce(new Error('invalid signature'));
  await act(async () => {
    await mockOptions.onPurchaseSuccess?.({...googlePurchase, store: 'apple'});
  });
  expect(mockFinishTransaction).not.toHaveBeenCalled();
  expect(mockRecord).not.toHaveBeenCalled();
  expect(mockGrantBulbs).not.toHaveBeenCalled();
  mockAppleVerify.mockResolvedValueOnce({
    alreadyRecorded: false,
    bulbsGranted: 10,
  });
  await act(async () => {
    await mockOptions.onPurchaseSuccess?.({...googlePurchase, store: 'apple'});
  });
  expect(mockAppleVerify).toHaveBeenCalledTimes(2);
  expect(mockFinishTransaction).toHaveBeenCalledTimes(1);
});

it('does not consume a failed receipt and allows a later callback to retry', async () => {
  mockVerify.mockRejectedValueOnce(new Error('temporary provider error'));
  await act(async () => {
    await mockOptions.onPurchaseSuccess?.(googlePurchase);
  });
  expect(mockFinishTransaction).not.toHaveBeenCalled();
  await act(async () => {
    await mockOptions.onPurchaseSuccess?.(googlePurchase);
  });
  expect(mockVerify).toHaveBeenCalledTimes(2);
  expect(mockFinishTransaction).toHaveBeenCalledTimes(1);
});

it('retries acknowledgement after a successful grant without a second client grant', async () => {
  mockFinishTransaction.mockRejectedValueOnce(
    new Error('temporary billing error'),
  );
  await act(async () => {
    await mockOptions.onPurchaseSuccess?.(googlePurchase);
  });
  mockVerify.mockResolvedValueOnce({
    isValid: true,
    entitlement: {alreadyRecorded: true, bulbsGranted: 0},
  });
  await act(async () => {
    await mockOptions.onPurchaseSuccess?.(googlePurchase);
  });
  expect(mockFinishTransaction).toHaveBeenCalledTimes(2);
  expect(mockGrantBulbs).not.toHaveBeenCalled();
});
