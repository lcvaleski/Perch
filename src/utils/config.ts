import * as SecureStore from 'expo-secure-store';

const LUNCH_MONEY_KEY = 'lunch_money_api_key';
const CLAUDE_KEY = 'claude_api_key';

export class Config {
  static async getLunchMoneyAPIKey(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(LUNCH_MONEY_KEY);
    } catch (error) {
      console.error('Error getting LunchMoney API key:', error);
      return null;
    }
  }

  static async setLunchMoneyAPIKey(key: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(LUNCH_MONEY_KEY, key);
    } catch (error) {
      console.error('Error setting LunchMoney API key:', error);
      throw error;
    }
  }

  static async getClaudeAPIKey(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(CLAUDE_KEY);
    } catch (error) {
      console.error('Error getting Claude API key:', error);
      return null;
    }
  }

  static async setClaudeAPIKey(key: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(CLAUDE_KEY, key);
    } catch (error) {
      console.error('Error setting Claude API key:', error);
      throw error;
    }
  }

  static async hasRequiredKeys(): Promise<boolean> {
    const lunchKey = await this.getLunchMoneyAPIKey();
    return lunchKey !== null && lunchKey.length > 0;
  }
}