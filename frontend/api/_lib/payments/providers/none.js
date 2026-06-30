'use strict';
module.exports = {
  async initiatePayment() {
    return { success: false, error: 'No payment gateway configured' };
  },
  async verifyPayment() {
    return { success: false, error: 'No payment gateway configured' };
  },
};
