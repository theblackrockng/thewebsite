'use strict';
const SECRET = process.env.FLUTTERWAVE_SECRET_KEY;

module.exports = {
  async initiatePayment({ amount, email, orderId, metadata }) {
    try {
      const txRef = `BR-${orderId}-${Date.now()}`;
      const res = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SECRET}`,
        },
        body: JSON.stringify({
          tx_ref: txRef,
          amount,
          currency: 'NGN',
          redirect_url: `${process.env.FRONTEND_URL || 'https://blackrockrestaurantng.com'}/order-confirmation/${orderId}`,
          customer: { email },
          meta: { orderId, ...metadata },
          customizations: {
            title: 'BLACKROCK Restaurant',
            description: `Order ${orderId}`,
          },
        }),
      });
      const data = await res.json();
      if (data.status !== 'success') return { success: false, error: data.message || 'Flutterwave error' };
      return {
        success: true,
        paymentUrl: data.data.link,
        reference: txRef,
      };
    } catch (err) {
      return { success: false, error: err.message || 'Flutterwave request failed' };
    }
  },

  async verifyPayment({ reference }) {
    try {
      const res = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, {
        headers: { 'Authorization': `Bearer ${SECRET}` },
      });
      const data = await res.json();
      if (data.status !== 'success') return { success: false, error: data.message || 'Verification failed' };
      const tx = data.data;
      return {
        success: tx.status === 'successful',
        status: tx.status,
        amount: tx.amount,
        reference: tx.tx_ref,
      };
    } catch (err) {
      return { success: false, error: err.message || 'Flutterwave verification failed' };
    }
  },
};
