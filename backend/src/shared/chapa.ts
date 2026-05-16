import { env } from '../config/env';
import logger from './logger';

const CHAPA_API_URL = 'https://api.chapa.co/v1/transaction';

interface InitializePaymentPayload {
  amount: number;
  currency?: string;
  email: string;
  first_name: string;
  last_name: string;
  tx_ref: string;
  callback_url: string;
  return_url: string;
  customization: {
    title: string;
    description: string;
  };
}

export const chapaService = {
  /**
   * Initialize a new transaction with Chapa
   */
  async initialize(payload: InitializePaymentPayload) {
    try {
      const response = await fetch(`${CHAPA_API_URL}/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.CHAPA_SECRET_KEY || 'CHAPA_SECRET_KEY'}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          currency: payload.currency || 'ETB',
        }),
      });

      const data = await response.json() as any;
      
      if (!response.ok) {
        logger.error('Chapa Initialize Error:', data);
        throw new Error(data.message || 'Payment initialization failed');
      }
      
      return data.data.checkout_url as string;
    } catch (error) {
      logger.error('Failed to communicate with Chapa:', error);
      throw new Error('Payment gateway error. Please try again later.');
    }
  },

  /**
   * Verify a transaction using its tx_ref
   */
  async verify(tx_ref: string) {
    try {
      const response = await fetch(`${CHAPA_API_URL}/verify/${tx_ref}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${env.CHAPA_SECRET_KEY || 'CHAPA_SECRET_KEY'}`,
        },
      });

      const data = await response.json() as any;
      
      if (!response.ok || data.status !== 'success') {
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to verify payment with Chapa:', error);
      return false;
    }
  }
};
