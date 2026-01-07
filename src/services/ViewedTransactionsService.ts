import AsyncStorage from '@react-native-async-storage/async-storage';

const VIEWED_TRANSACTIONS_KEY = 'viewed_transactions';
const MAX_STORED_IDS = 1000; // Limit to prevent storage bloat

export class ViewedTransactionsService {
  private viewedIds: Set<string> = new Set();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const stored = await AsyncStorage.getItem(VIEWED_TRANSACTIONS_KEY);
      if (stored) {
        const ids = JSON.parse(stored) as string[];
        this.viewedIds = new Set(ids);
      }
      this.initialized = true;
    } catch (error) {
      console.error('Failed to load viewed transactions:', error);
      this.initialized = true;
    }
  }

  isViewed(transactionId: string): boolean {
    return this.viewedIds.has(transactionId);
  }

  async markAsViewed(transactionIds: string[]): Promise<void> {
    const wasUpdated = transactionIds.some(id => !this.viewedIds.has(id));

    transactionIds.forEach(id => this.viewedIds.add(id));

    // Limit the stored IDs to prevent unlimited growth
    if (this.viewedIds.size > MAX_STORED_IDS) {
      const idsArray = Array.from(this.viewedIds);
      // Keep only the most recent IDs
      this.viewedIds = new Set(idsArray.slice(-MAX_STORED_IDS));
    }

    if (wasUpdated) {
      await this.save();
    }
  }

  async markAllAsViewed(transactionIds: string[]): Promise<void> {
    await this.markAsViewed(transactionIds);
  }

  private async save(): Promise<void> {
    try {
      const idsArray = Array.from(this.viewedIds);
      await AsyncStorage.setItem(VIEWED_TRANSACTIONS_KEY, JSON.stringify(idsArray));
    } catch (error) {
      console.error('Failed to save viewed transactions:', error);
    }
  }

  async clear(): Promise<void> {
    this.viewedIds.clear();
    try {
      await AsyncStorage.removeItem(VIEWED_TRANSACTIONS_KEY);
    } catch (error) {
      console.error('Failed to clear viewed transactions:', error);
    }
  }
}

export const viewedTransactionsService = new ViewedTransactionsService();