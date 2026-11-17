import {Platform} from 'react-native';

export const PaymentMode = {
  IapOnly: 'iap_only',
  MockPg: 'mock_pg',
  TossTest: 'toss_test',
  NaverTest: 'naver_test',
  AlternativeBilling: 'alternative_billing',
} as const;

export type PaymentModeValue = (typeof PaymentMode)[keyof typeof PaymentMode];

const paymentModes = new Set<string>(Object.values(PaymentMode));

const getPaymentMode = (): PaymentModeValue => {
  const mode = process.env.EXPO_PUBLIC_PAYMENT_MODE;

  if (mode && paymentModes.has(mode)) {
    return mode as PaymentModeValue;
  }

  return PaymentMode.IapOnly;
};

export const PAYMENT_MODE = getPaymentMode();

export const SHOW_PAYMENT_TEST_TOOLS =
  PAYMENT_MODE === PaymentMode.MockPg ||
  PAYMENT_MODE === PaymentMode.TossTest ||
  PAYMENT_MODE === PaymentMode.NaverTest;

export const ENABLE_ANDROID_ALTERNATIVE_BILLING =
  Platform.OS === 'android' && PAYMENT_MODE === PaymentMode.AlternativeBilling;
