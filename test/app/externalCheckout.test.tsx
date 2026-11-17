import React from 'react';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {Alert, Linking, Platform} from 'react-native';
import {
  createOnShouldStartLoadWithRequest,
  defaultOriginWhitelist,
} from 'react-native-webview/lib/WebViewShared';
import type {WebViewProps} from 'react-native-webview';
import TossCheckout from '../../app/toss-checkout';
import NaverCheckout from '../../app/naver-checkout';

const mockConfirm = jest.fn().mockResolvedValue({
  entitlement: {alreadyRecorded: false, bulbsGranted: 10},
  report: {status: 'pending'},
});
const mockParams: Record<string, string> = {
  productId: 'dev.hyo.martie.10bulbs',
  amountKrw: '1400',
  orderId: 'order-1',
  merchantPayKey: 'order-1',
  orderName: '10 bulbs',
  report: '1',
  altToken: 'token-1',
  ownerUserId: 'user-a',
};
let mockAuthenticated = true;
let mockUserId = 'user-a';
const mockPendingConfirm = jest.fn(
  (_userId: string, _payment: unknown, approve: () => Promise<unknown>) =>
    approve(),
);
jest.mock('../../src/utils/pendingAlternativeBilling', () => ({
  confirmAlternativeBillingPayment: (
    ...args: Parameters<typeof mockPendingConfirm>
  ) => mockPendingConfirm(...args),
}));
jest.mock('convex/react', () => ({
  useAction: () => mockConfirm,
  useConvexAuth: () => ({isAuthenticated: mockAuthenticated, isLoading: false}),
  useQuery: () => (mockAuthenticated ? {_id: mockUserId} : null),
}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({back: jest.fn()}),
  Stack: {Screen: () => null},
}));
jest.mock('cpk-ui', () => ({
  useCPK: () => ({theme: {bg: {}, role: {}, text: {}}}),
  Typography: {Body2: () => null},
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0}),
}));
jest.mock('react-native-webview', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    WebView: (props: Record<string, unknown>) =>
      React.createElement('CheckoutWebView', props),
  };
});
jest.mock('../../src/STRINGS', () => ({
  t: (key: string, params?: {count?: number}) =>
    params?.count === undefined ? key : `${key}:${params.count}`,
}));
jest.mock('../../src/utils/analytics', () => ({logEvent: jest.fn()}));
jest.mock('../../src/components/payment/CheckoutBrandTitle', () => () => null);
jest.mock('../../src/components/payment/OrderSummaryCard', () => () => null);
jest.mock('../../src/utils/alternativeBilling', () => ({
  ...jest.requireActual('../../src/utils/alternativeBilling'),
  TOSS_CLIENT_KEY: 'test_key',
  buildTossReturnUrl: () => 'https://example.invalid/toss/return',
}));
jest.mock('../../src/utils/naverPay', () => ({
  ...jest.requireActual('../../src/utils/naverPay'),
  NAVER_PAY_CLIENT_ID: 'test_client',
  NAVER_PAY_CHAIN_ID: 'test_chain',
  buildNaverReturnUrl: () => 'https://example.invalid/naverpay/return',
  getOrCreateNaverUserKey: () => 'anonymous-naver-user',
}));
jest.mock('../../src/utils/storage', () => ({Storage: {}, storage: {}}));

let renderer: ReactTestRenderer;
const originalOS = Platform.OS;
const webviews = () =>
  renderer.root.findAll((node) => String(node.type) === 'CheckoutWebView');
const mount = async (Screen: typeof TossCheckout): Promise<void> => {
  await act(async () => {
    renderer = create(<Screen />);
  });
};
const callbacks = {
  toss: 'https://example.invalid/toss/return?paymentKey=provider-key&orderId=order-1&amount=1400',
  naver:
    'https://example.invalid/naverpay/return?resultCode=Success&paymentId=provider-key',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthenticated = true;
  mockUserId = 'user-a';
  mockParams.amountKrw = '1400';
  mockParams.altToken = 'token-1';
  Object.defineProperty(Platform, 'OS', {value: 'android', configurable: true});
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => {
  if (renderer) act(() => renderer.unmount());
  Object.defineProperty(Platform, 'OS', {
    value: originalOS,
    configurable: true,
  });
  jest.restoreAllMocks();
});

it.each([TossCheckout, NaverCheckout])(
  'gives the provider a non-opaque merchant origin for postMessage replies',
  async (Screen) => {
    await mount(Screen);
    const source = webviews()[0].props.source as {baseUrl?: string};
    expect(new URL(source.baseUrl ?? 'about:blank').origin).toBe(
      'https://example.invalid',
    );
  },
);
it.each([TossCheckout, NaverCheckout])(
  'routes Android intents through the checkout resolver instead of raw Linking',
  async (Screen) => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await mount(Screen);
    const props = webviews()[0].props as WebViewProps;
    const dispatch = createOnShouldStartLoadWithRequest(
      jest.fn(),
      props.originWhitelist ?? defaultOriginWhitelist,
      props.onShouldStartLoadWithRequest,
    );
    await act(async () => {
      dispatch({
        nativeEvent: {
          url: 'intent://pay#Intent;scheme=supertoss;package=viva.republica.toss;end',
          lockIdentifier: 1,
        },
      } as Parameters<typeof dispatch>[0]);
    });
    expect(openURL).toHaveBeenCalledWith('supertoss://pay');
  },
);
it.each([TossCheckout, NaverCheckout])(
  'does not open a provider for a signed-out direct route',
  async (Screen) => {
    mockAuthenticated = false;
    await mount(Screen);
    expect(webviews()).toHaveLength(0);
  },
);
it.each([TossCheckout, NaverCheckout])(
  'does not reuse another account checkout route',
  async (Screen) => {
    mockUserId = 'user-b';
    await mount(Screen);
    expect(webviews()).toHaveLength(0);
  },
);
it.each([TossCheckout, NaverCheckout])(
  'rejects a route price the server will not approve',
  async (Screen) => {
    mockParams.amountKrw = '1';
    await mount(Screen);
    expect(webviews()).toHaveLength(0);
  },
);
it.each([TossCheckout, NaverCheckout])(
  'rejects reportable checkout without a Google token',
  async (Screen) => {
    mockParams.altToken = '';
    await mount(Screen);
    expect(webviews()).toHaveLength(0);
  },
);
it.each([
  ['toss', TossCheckout],
  ['naver', NaverCheckout],
] as const)(
  'persists %s callback once before approval and offers failed confirmation retry',
  async (provider, Screen) => {
    mockConfirm.mockRejectedValueOnce(new Error('network unavailable'));
    await mount(Screen);
    const callback = webviews()[0].props
      .onShouldStartLoadWithRequest as (request: {url: string}) => boolean;
    await act(async () => {
      callback({url: callbacks[provider]});
      callback({url: callbacks[provider]});
    });
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockPendingConfirm).toHaveBeenCalledWith(
      'user-a',
      expect.objectContaining({provider}),
      expect.any(Function),
    );
    const calls = jest.mocked(Alert.alert).mock.calls;
    const buttons = calls[calls.length - 1]?.[2];
    const retry = buttons?.find((button) => button.text === 'error.tryAgain');
    expect(retry?.onPress).toBeDefined();
    await act(async () => retry?.onPress?.());
    expect(mockConfirm).toHaveBeenCalledTimes(2);
  },
);

it.each([
  ['toss', TossCheckout],
  ['naver', NaverCheckout],
] as const)(
  'shows the actual %s grant when the bulb cap limits the purchase',
  async (provider, Screen) => {
    mockConfirm.mockResolvedValueOnce({
      entitlement: {alreadyRecorded: false, bulbsGranted: 4},
      report: {status: 'pending'},
    });
    await mount(Screen);
    await act(async () => {
      webviews()[0].props.onShouldStartLoadWithRequest({
        url: callbacks[provider],
      });
    });
    expect(Alert.alert).toHaveBeenCalledWith(
      'purchase.thankYou',
      'purchase.purchaseComplete:4',
      expect.any(Array),
    );
  },
);

it.each([
  ['toss', TossCheckout],
  ['naver', NaverCheckout],
] as const)(
  'does not show a stale %s result after navigating away during confirmation',
  async (provider, Screen) => {
    let resolve: (result: {
      entitlement: {alreadyRecorded: boolean};
      report: {status: string};
    }) => void = () => {};
    mockConfirm.mockImplementationOnce(
      () =>
        new Promise((finish) => {
          resolve = finish;
        }),
    );
    await mount(Screen);
    const callback = webviews()[0].props
      .onShouldStartLoadWithRequest as (request: {url: string}) => boolean;
    await act(async () => {
      callback({url: callbacks[provider]});
    });
    act(() => renderer.unmount());
    await act(async () => {
      resolve({
        entitlement: {alreadyRecorded: false},
        report: {status: 'pending'},
      });
    });
    expect(Alert.alert).not.toHaveBeenCalled();
  },
);
