export const STRIPE_CONFIG = {
  PRODUCTS: {
    AURAMIND_BASIC: {
      id: 'prod_SRSywkTrAEv1Bc',
      priceId: 'price_1RWa2z4IM61npFmyRi4yPV9F',
      description: 'Basic Plan',
      mode: 'subscription'
    },
    AURAMIND_PREMIUM: {
      id: 'prod_SRT0icrDg8RJjN',
      priceId: 'price_1RWa434IM61npFmyubGrGJIK',
      description: 'Premium Plan',
      mode: 'subscription'
    }
  },
  PRICES: {
    BASIC: {
      MONTHLY: 5.55,
      YEARLY: 50
    },
    PREMIUM: {
      MONTHLY: 15.55,
      YEARLY: 120
    }
  }
};