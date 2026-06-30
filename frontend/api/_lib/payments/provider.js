'use strict';
const ACTIVE = process.env.PAYMENT_PROVIDER || 'none';
const providers = {
  none: require('./providers/none'),
  paystack: require('./providers/paystack'),
  flutterwave: require('./providers/flutterwave'),
};
module.exports = {
  provider: providers[ACTIVE] || providers.none,
  activeProvider: ACTIVE,
};
