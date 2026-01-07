import axios from 'axios';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks } from 'date-fns';
import { Transaction } from '../models/Transaction';
import { Config } from '../utils/config';

interface LunchMoneyResponse {
  transactions: Transaction[];
}

export class LunchMoneyAPI {
  private baseURL = 'https://dev.lunchmoney.app/v1';

  private async getHeaders() {
    const apiKey = await Config.getLunchMoneyAPIKey();
    if (!apiKey) {
      throw new Error('LunchMoney API key not configured');
    }
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  private filterTransactions(transactions: Transaction[]): Transaction[] {
    if (!transactions || !Array.isArray(transactions)) {
      return [];
    }

    const filtered = transactions.filter(t => {
      const amount = parseFloat(t.amount);
      if (amount < 0) return false;

      if (t.excludeFromTotals) return false;

      const categoryLower = t.categoryName?.toLowerCase() || '';
      const excludeCategories = ['transfer', 'payment', 'income', 'allowance'];
      if (excludeCategories.some(cat => categoryLower.includes(cat))) {
        return false;
      }

      return true;
    });

    // Sort by date, most recent first
    return filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // Descending order (newest first)
    });
  }

  async fetchDailyTransactions(): Promise<Transaction[]> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const headers = await this.getHeaders();

      const response = await axios.get<LunchMoneyResponse>(
        `${this.baseURL}/transactions`,
        {
          headers,
          params: {
            start_date: today,
            end_date: today,
            limit: 500
          }
        }
      );

      return this.filterTransactions(response.data.transactions);
    } catch (error) {
      console.error('Error fetching daily transactions:', error);
      throw error;
    }
  }

  async fetchWeeklyTransactions(): Promise<Transaction[]> {
    try {
      const now = new Date();
      const start = format(startOfWeek(now, { weekStartsOn: 0 }), 'yyyy-MM-dd');
      const end = format(endOfWeek(now, { weekStartsOn: 0 }), 'yyyy-MM-dd');
      const headers = await this.getHeaders();

      const response = await axios.get<LunchMoneyResponse>(
        `${this.baseURL}/transactions`,
        {
          headers,
          params: {
            start_date: start,
            end_date: end,
            limit: 500
          }
        }
      );

      return this.filterTransactions(response.data.transactions);
    } catch (error) {
      console.error('Error fetching weekly transactions:', error);
      throw error;
    }
  }

  async fetchMonthlyTransactions(): Promise<Transaction[]> {
    try {
      const now = new Date();
      const start = format(startOfMonth(now), 'yyyy-MM-dd');
      const end = format(endOfMonth(now), 'yyyy-MM-dd');
      const headers = await this.getHeaders();

      const response = await axios.get<LunchMoneyResponse>(
        `${this.baseURL}/transactions`,
        {
          headers,
          params: {
            start_date: start,
            end_date: end,
            limit: 500
          }
        }
      );

      return this.filterTransactions(response.data.transactions);
    } catch (error) {
      console.error('Error fetching monthly transactions:', error);
      throw error;
    }
  }

  async fetchYearlyTransactions(): Promise<Transaction[]> {
    try {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const headers = await this.getHeaders();

      // Fetch each month and collect results
      const monthPromises: Promise<Transaction[]>[] = [];

      // Fetch all months of current year up to current month
      for (let month = 0; month <= currentMonth; month++) {
        const monthStart = new Date(currentYear, month, 1);
        const monthEnd = new Date(currentYear, month + 1, 0); // Last day of month

        const promise = axios.get<LunchMoneyResponse>(
          `${this.baseURL}/transactions`,
          {
            headers,
            params: {
              start_date: format(monthStart, 'yyyy-MM-dd'),
              end_date: format(monthEnd, 'yyyy-MM-dd'),
              limit: 1000
            }
          }
        ).then(response => {
          const transactions = response.data.transactions || [];
          console.log(`${currentYear}/${month + 1}: ${transactions.length} transactions`);
          return transactions;
        }).catch(error => {
          console.error(`Error fetching transactions for ${currentYear}/${month + 1}:`, error);
          return [];
        });

        monthPromises.push(promise);
      }

      // Wait for all promises and flatten the results
      const monthlyResults = await Promise.all(monthPromises);
      const allTransactions = monthlyResults.flat();

      console.log(`Fetched ${allTransactions.length} total yearly transactions for ${currentYear}`);
      return this.filterTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching yearly transactions:', error);
      throw error;
    }
  }

  async fetchYearlyTotal(): Promise<number> {
    try {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const headers = await this.getHeaders();

      const monthPromises: Promise<number>[] = [];

      // Calculate total month by month for current year up to current month
      for (let month = 0; month <= currentMonth; month++) {
        const monthStart = new Date(currentYear, month, 1);
        const monthEnd = new Date(currentYear, month + 1, 0);

        const promise = axios.get<LunchMoneyResponse>(
          `${this.baseURL}/transactions`,
          {
            headers,
            params: {
              start_date: format(monthStart, 'yyyy-MM-dd'),
              end_date: format(monthEnd, 'yyyy-MM-dd'),
              limit: 1000
            }
          }
        ).then(response => {
          const filtered = this.filterTransactions(response.data.transactions || []);
          const monthTotal = filtered.reduce((sum, t) => sum + parseFloat(t.amount), 0);
          console.log(`${currentYear}/${month + 1} total: $${monthTotal.toFixed(2)}`);
          return monthTotal;
        }).catch(error => {
          console.error(`Error fetching total for ${currentYear}/${month + 1}:`, error);
          return 0;
        });

        monthPromises.push(promise);
      }

      const monthlyTotals = await Promise.all(monthPromises);
      const total = monthlyTotals.reduce((sum, monthTotal) => sum + monthTotal, 0);

      console.log(`${currentYear} YTD total: $${total.toFixed(2)}`);
      return total;
    } catch (error) {
      console.error('Error fetching yearly total:', error);
      return 0;
    }
  }

  async fetchLastWeekTotal(): Promise<number> {
    try {
      const lastWeek = subWeeks(new Date(), 1);
      const start = format(startOfWeek(lastWeek, { weekStartsOn: 0 }), 'yyyy-MM-dd');
      const end = format(endOfWeek(lastWeek, { weekStartsOn: 0 }), 'yyyy-MM-dd');
      const headers = await this.getHeaders();

      // Fetch transactions and calculate total manually
      const response = await axios.get<LunchMoneyResponse>(
        `${this.baseURL}/transactions`,
        {
          headers,
          params: {
            start_date: start,
            end_date: end,
            limit: 500
          }
        }
      );

      const filtered = this.filterTransactions(response.data.transactions);
      return filtered.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    } catch (error) {
      console.error('Error fetching last week total:', error);
      // Return 0 instead of throwing to prevent app crashes
      return 0;
    }
  }
}