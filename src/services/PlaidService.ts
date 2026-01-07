import * as SecureStore from 'expo-secure-store';
import { Transaction } from '../models/Transaction';

export class PlaidService {
  private baseURL: string;
  private accessToken: string | null = null;
  private accountsMap: Map<string, string> = new Map();

  constructor() {
    this.baseURL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://your-app.vercel.app/api';
    this.loadAccessToken();
  }

  private async loadAccessToken() {
    try {
      this.accessToken = await SecureStore.getItemAsync('plaid_access_token');
    } catch (error) {
      console.error('Failed to load access token:', error);
    }
  }

  async createLinkToken(userId?: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/create-link-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId || 'default-user'
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create link token: ${response.statusText}`);
      }

      const data = await response.json();
      return data.link_token;
    } catch (error) {
      console.error('Error creating link token:', error);
      throw error;
    }
  }

  async exchangePublicToken(publicToken: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/exchange-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_token: publicToken
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to exchange token: ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;

      await SecureStore.setItemAsync('plaid_access_token', data.access_token);
      await SecureStore.setItemAsync('plaid_item_id', data.item_id);
    } catch (error) {
      console.error('Error exchanging public token:', error);
      throw error;
    }
  }

  async isConnected(): Promise<boolean> {
    if (!this.accessToken) {
      await this.loadAccessToken();
    }
    return !!this.accessToken;
  }

  async disconnect(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync('plaid_access_token');
      await SecureStore.deleteItemAsync('plaid_item_id');
      this.accessToken = null;
      this.accountsMap.clear();
    } catch (error) {
      console.error('Error disconnecting Plaid:', error);
    }
  }

  private async fetchTransactionsForDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    try {
      const response = await fetch(`${this.baseURL}/get-transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: this.accessToken,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.accounts) {
        data.accounts.forEach((account: any) => {
          this.accountsMap.set(account.account_id, account.name || account.official_name || 'Unknown');
        });
      }

      return data.transactions.map((t: any) => ({
        ...t,
        account_display_name: this.accountsMap.get(t.account_id) || 'Unknown Account',
      }));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  async fetchDailyTransactions(): Promise<Transaction[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.fetchTransactionsForDateRange(today, tomorrow);
  }

  async fetchWeeklyTransactions(): Promise<Transaction[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    return this.fetchTransactionsForDateRange(weekStart, weekEnd);
  }

  async fetchMonthlyTransactions(): Promise<Transaction[]> {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    return this.fetchTransactionsForDateRange(monthStart, monthEnd);
  }

  async fetchYearlyTransactions(): Promise<Transaction[]> {
    const today = new Date();
    const yearStart = new Date(today.getFullYear(), 0, 1);
    const yearEnd = new Date(today.getFullYear(), 11, 31);

    return this.fetchTransactionsForDateRange(yearStart, yearEnd);
  }

  async fetchYearlyTotal(): Promise<number> {
    const transactions = await this.fetchYearlyTransactions();
    return transactions.reduce((sum, t) => {
      const amount = parseFloat(t.amount.toString());
      return sum + amount;
    }, 0);
  }

  async fetchLastWeekTotal(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastWeekEnd = new Date(today);
    lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);

    const lastWeekStart = new Date(lastWeekEnd);
    lastWeekStart.setDate(lastWeekEnd.getDate() - 6);

    const transactions = await this.fetchTransactionsForDateRange(lastWeekStart, lastWeekEnd);
    return transactions.reduce((sum, t) => {
      const amount = parseFloat(t.amount.toString());
      return sum + amount;
    }, 0);
  }
}