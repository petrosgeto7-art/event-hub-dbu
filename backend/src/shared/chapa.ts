import { env } from '../config/env';
import logger from './logger';

const CHAPA_API_URL = 'https://api.chapa.co/v1';

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
  subaccounts?: Array<{
    id: string;
  }>;
}

interface CreateSubaccountPayload {
  business_name: string;
  account_name: string;
  bank_code: string;
  account_number: string;
  split_type: 'percentage' | 'flat';
  split_value: number;
}

export const chapaService = {
  /**
   * Initialize a new transaction with Chapa
   * Supports split payment via subaccounts
   */
  async initialize(payload: InitializePaymentPayload) {
    try {
      const body: any = {
        ...payload,
        currency: payload.currency || 'ETB',
      };

      // DEVELOPMENT MOCK BYPASS:
      // If there is no real Chapa key, just return the redirect URL directly to simulate a successful payment.
      const secretKey = env.CHAPA_SECRET_KEY || '';
      if (!secretKey || secretKey.includes('CHASECK_TEST-1234567890abcdef')) {
        logger.info('Using Mock Chapa Checkout for local testing');
        return payload.return_url as string;
      }

      const response = await fetch(`${CHAPA_API_URL}/transaction/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.CHAPA_SECRET_KEY || 'CHAPA_SECRET_KEY'}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
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
      const secretKey = env.CHAPA_SECRET_KEY || '';
      if (!secretKey || secretKey.includes('CHASECK_TEST-1234567890abcdef')) {
        logger.info(`Mocking Chapa Verify Success for tx_ref: ${tx_ref}`);
        return true;
      }

      const response = await fetch(`${CHAPA_API_URL}/transaction/verify/${tx_ref}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${secretKey || 'CHAPA_SECRET_KEY'}`,
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
  },

  /**
   * Create a Chapa subaccount for split payments
   * This allows automatic splitting of payments between vendor and admin
   */
  async createSubaccount(payload: CreateSubaccountPayload): Promise<string | null> {
    try {
      const secretKey = env.CHAPA_SECRET_KEY || '';
      if (!secretKey || secretKey.includes('CHASECK_TEST-1234567890abcdef')) {
        logger.info('Mocking Chapa Subaccount creation');
        return `mock-subaccount-${Date.now()}`;
      }

      const response = await fetch(`${CHAPA_API_URL}/subaccount`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretKey || 'CHAPA_SECRET_KEY'}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json() as any;

      if (!response.ok) {
        logger.error('Chapa Create Subaccount Error:', data);
        return null;
      }

      // Return the subaccount ID
      return data.data?.subaccount_id || data.data?.id || null;
    } catch (error) {
      logger.error('Failed to create Chapa subaccount:', error);
      return null;
    }
  },

  /**
   * Get list of supported banks from Chapa
   */
  async getBanks(): Promise<any[]> {
    try {
      const response = await fetch(`${CHAPA_API_URL}/banks`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${env.CHAPA_SECRET_KEY || 'CHAPA_SECRET_KEY'}`,
        },
      });

      const data = await response.json() as any;
      return data.data || [];
    } catch (error) {
      logger.error('Failed to fetch banks:', error);
      return [];
    }
  }
};
