'use strict';
const SECRET = process.env.PAYSTACK_SECRET_KEY;

module.exports = {
  async initiatePayment({ amount, email, orderId, metadata }) {
    try {
      const res = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SECRET}`,
        },
        body: JSON.stringify({
          amount: amount * 100, // convert to kobo
          email,
          reference: `BR-${orderId}-${Date.now()}`,
          metadata: { orderId, ...metadata },
          callback_url: `${process.env.FRONTEND_URL || 'https://blackrockrestaurantng.com'}/order-confirmation/${orderId}`,
        }),
      });
      const data = await res.json();
      if (!data.status) return { success: false, error: data.message || 'Paystack error' };
      return {
        success: true,
        paymentUrl: data.data.authorization_url,
        reference: data.data.reference,
      };
    } catch (err) {
      return { success: false, error: err.message || 'Paystack request failed' };
    }
  },

  async verifyPayment({ reference }) {
    try {
      const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { 'Authorization': `Bearer ${SECRET}` },
      });
      const data = await res.json();
      if (!data.status) return { success: false, error: data.message || 'Verification failed' };
      const tx = data.data;
      return {
        success: tx.status === 'success',
        status: tx.status,
        amount: Math.round(tx.amount / 100), // convert from kobo
        reference: tx.reference,
      };
    } catch (err) {
      return { success: false, error: err.message || 'Paystack verification failed' };
    }
  },
};
