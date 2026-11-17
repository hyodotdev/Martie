import type {ProductSubscription, ProductSubscriptionAndroid} from './iap';
import {SUB_MONTHLY, SUB_YEARLY} from './iapEntitlements';

export type AndroidSubscriptionStore = 'google' | 'amazon' | 'horizon';

export const getAndroidSubscriptionOffer = (
  product?: Pick<ProductSubscriptionAndroid, 'id' | 'subscriptionOffers'>,
  store: AndroidSubscriptionStore = 'google',
) => {
  if (!product || ![SUB_MONTHLY, SUB_YEARLY].includes(product.id)) {
    return undefined;
  }
  if (store !== 'google') return product.subscriptionOffers?.[0];
  const billingPeriod = product.id === SUB_MONTHLY ? 'P1M' : 'P1Y';
  const recurrenceMode = product.id === SUB_MONTHLY ? 3 : 1;
  return product.subscriptionOffers?.find((offer) => {
    const phases = offer.pricingPhasesAndroid?.pricingPhaseList;
    const phase = phases?.[0];
    return (
      offer.basePlanIdAndroid === 'premium' &&
      !!offer.offerTokenAndroid &&
      phases?.length === 1 &&
      phase?.billingPeriod === billingPeriod &&
      !!phase.formattedPrice &&
      phase.recurrenceMode === recurrenceMode
    );
  });
};

export const getSubscriptionTerms = (
  product?: ProductSubscription,
  store: AndroidSubscriptionStore = 'google',
) => {
  if (!product || ![SUB_MONTHLY, SUB_YEARLY].includes(product.id)) {
    return null;
  }
  if (product.platform === 'android') {
    if (store !== 'google') {
      return product.displayPrice
        ? {price: product.displayPrice, autoRenews: true}
        : null;
    }
    const offer = getAndroidSubscriptionOffer(product);
    const phase = offer?.pricingPhasesAndroid?.pricingPhaseList[0];
    if (!phase) return null;
    return {
      price: phase.formattedPrice,
      autoRenews: phase.recurrenceMode === 1,
    };
  }
  const period = product.id === SUB_MONTHLY ? 'month' : 'year';
  if (
    !product.displayPrice ||
    product.typeIOS !== 'auto-renewable-subscription' ||
    product.subscriptionPeriodUnitIOS !== period ||
    product.subscriptionPeriodNumberIOS !== '1'
  ) {
    return null;
  }
  return {price: product.displayPrice, autoRenews: true};
};
