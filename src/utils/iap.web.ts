import type {
  ActiveSubscription,
  Product,
  ProductIOS,
  ProductSubscription,
  Purchase,
  PurchaseAndroid,
  ProductAndroid,
  ProductSubscriptionAndroid,
  UseIAPOptions,
} from 'expo-iap';

export type {
  ActiveSubscription,
  Product,
  ProductIOS,
  ProductSubscription,
  Purchase,
  PurchaseAndroid,
  ProductAndroid,
  ProductSubscriptionAndroid,
  UseIAPOptions,
};

export const ErrorCode = {
  ActivityUnavailable: 'activity-unavailable',
  AlreadyOwned: 'already-owned',
  AlreadyPrepared: 'already-prepared',
  BillingResponseJsonParseError: 'billing-response-json-parse-error',
  BillingUnavailable: 'billing-unavailable',
  ConnectionClosed: 'connection-closed',
  DeferredPayment: 'deferred-payment',
  DeveloperError: 'developer-error',
  DuplicatePurchase: 'duplicate-purchase',
  EmptySkuList: 'empty-sku-list',
  FeatureNotSupported: 'feature-not-supported',
  IapNotAvailable: 'iap-not-available',
  InitConnection: 'init-connection',
  Interrupted: 'interrupted',
  ItemNotOwned: 'item-not-owned',
  ItemUnavailable: 'item-unavailable',
  NetworkError: 'network-error',
  NotEnded: 'not-ended',
  NotPrepared: 'not-prepared',
  Pending: 'pending',
  PurchaseError: 'purchase-error',
  PurchaseVerificationFailed: 'purchase-verification-failed',
  PurchaseVerificationFinishFailed: 'purchase-verification-finish-failed',
  PurchaseVerificationFinished: 'purchase-verification-finished',
  QueryProduct: 'query-product',
  ReceiptFailed: 'receipt-failed',
  ReceiptFinished: 'receipt-finished',
  ReceiptFinishedFailed: 'receipt-finished-failed',
  RemoteError: 'remote-error',
  ServiceDisconnected: 'service-disconnected',
  ServiceError: 'service-error',
  ServiceTimeout: 'service-timeout',
  SkuNotFound: 'sku-not-found',
  SkuOfferMismatch: 'sku-offer-mismatch',
  SyncError: 'sync-error',
  TransactionValidationFailed: 'transaction-validation-failed',
  Unknown: 'unknown',
  UserCancelled: 'user-cancelled',
  UserError: 'user-error',
} as const;

const noop = async (): Promise<void> => {};
const unsupported = async (): Promise<never> => {
  throw new Error('In-app purchases are not supported on web.');
};

export const getActiveSubscriptions = async (): Promise<ActiveSubscription[]> =>
  [];

export const getAvailablePurchases = async (): Promise<Purchase[]> => [];

export const finishTransaction = noop;

const verifyPurchaseStub = async () => ({
  isValid: false,
  receiptData: null,
  jwsRepresentation: null,
});

export const verifyPurchase = verifyPurchaseStub;

export const verifyPurchaseWithProvider = verifyPurchaseStub;

export const isBillingProgramAvailableAndroid = async (
  _program: string,
): Promise<{isAvailable: boolean}> => ({isAvailable: false});

export const createBillingProgramReportingDetailsAndroid = async (_args: {
  program: string;
}): Promise<{externalTransactionToken: string}> => ({
  externalTransactionToken: '',
});

export function useIAP(_options?: UseIAPOptions) {
  return {
    connected: false,
    products: [] as Product[],
    subscriptions: [] as ProductSubscription[],
    availablePurchases: [] as Purchase[],
    promotedProductIOS: undefined as Product | undefined,
    activeSubscriptions: [] as ActiveSubscription[],
    finishTransaction: noop,
    getAvailablePurchases: noop,
    fetchProducts: noop,
    requestPurchase: unsupported,
    verifyPurchase,
    verifyPurchaseWithProvider,
    restorePurchases: noop,
    getPromotedProductIOS: async () => null,
    requestPurchaseOnPromotedProductIOS: async () => false,
    getActiveSubscriptions: noop,
    hasActiveSubscriptions: async () => false,
    reconnect: async () => false,
    isBillingProgramAvailableAndroid,
    createBillingProgramReportingDetailsAndroid,
  };
}
