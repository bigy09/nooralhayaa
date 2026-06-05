/**
 * Wave Payment Service
 * Integrates with Wave API for payment processing
 * 
 * Documentation: https://developer.wave.com/
 * 
 * For MVP: Using deep links (user manually sends payment)
 * For Advanced: Can integrate actual payment verification
 */

export class WavePaymentService {
  constructor(apiKey, businessId) {
    this.apiKey = apiKey;
    this.businessId = businessId;
    this.baseUrl = 'https://api.wave.com/graphql';
  }

  /**
   * Generate payment deep link for Wave mobile app
   * User receives the link and opens Wave app to complete payment
   */
  generatePaymentLink(order) {
    const merchantPhone = process.env.WAVE_MERCHANT_PHONE || '2250702396063';
    const amount = Math.round(order.total);
    const reference = order.orderNumber;

    return {
      deepLink: `wave://send?phone=${merchantPhone}&amount=${amount}&currency=XOF&note=${encodeURIComponent(reference)}`,
      webLink: `https://app.wave.com/send?phone=${merchantPhone}&amount=${amount}`,
      reference,
    };
  }

  /**
   * Verify payment status (requires Wave webhook setup)
   * This is called when Wave sends a webhook notification
   */
  async verifyPayment(transactionId) {
    // This would require implementing webhook handler
    // and storing transaction IDs in database
    
    if (!this.apiKey) {
      console.warn('Wave API key not configured - payment verification disabled');
      return null;
    }

    try {
      const query = `
        query GetTransaction($id: ID!) {
          transaction(id: $id) {
            id
            status
            amount {
              value
              currency
            }
            createdAt
          }
        }
      `;

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables: { id: transactionId } }),
      });

      const data = await response.json();
      return data?.data?.transaction || null;
    } catch (error) {
      console.error('Wave verification error:', error);
      return null;
    }
  }

  /**
   * Send payment request to Wave API (for advanced integration)
   */
  async createPaymentRequest(order) {
    if (!this.apiKey || !this.businessId) {
      throw new Error('Wave API credentials not configured');
    }

    const mutation = `
      mutation CreatePaymentRequest($input: CreatePaymentRequestInput!) {
        createPaymentRequest(input: $input) {
          paymentRequest {
            id
            reference
            amount {
              value
              currency
            }
            expiryDate
          }
        }
      }
    `;

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: mutation,
          variables: {
            input: {
              businessId: this.businessId,
              customerReference: order.customer.phone,
              amount: order.total,
              currency: 'XOF',
              description: `Order ${order.orderNumber}`,
              externalReference: order.orderNumber,
            },
          },
        }),
      });

      const data = await response.json();
      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      return data?.data?.createPaymentRequest?.paymentRequest || null;
    } catch (error) {
      console.error('Failed to create payment request:', error);
      throw error;
    }
  }
}

export default WavePaymentService;
