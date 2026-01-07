export interface Transaction {
  id: number;
  date: string;
  payee: string;
  amount: string;
  currency: string;
  plaid_account_name?: string;
  plaidAccountName?: string;
  asset_name?: string;
  assetName?: string;
  account_display_name?: string;
  exclude_from_budget?: boolean;
  excludeFromBudget?: boolean;
  exclude_from_totals?: boolean;
  excludeFromTotals?: boolean;
  is_group?: boolean;
  isGroup?: boolean;
  group_id?: number;
  groupId?: number;
  category_name?: string;
  categoryName?: string;
}

export class TransactionUtils {
  static getAmount(transaction: Transaction): number {
    const cleanAmount = transaction.amount.replace(/[^0-9.-]/g, '');
    return parseFloat(cleanAmount) || 0;
  }

  static getAccountName(transaction: Transaction): string | null {
    // Try all possible field names from the API
    const accountName =
      transaction.plaid_account_name ||
      transaction.plaidAccountName ||
      transaction.asset_name ||
      transaction.assetName ||
      transaction.account_display_name;

    if (!accountName) return null;

    // Return raw account name, truncated to 10 characters
    if (accountName.length > 10) {
      return accountName.substring(0, 10);
    }

    return accountName;
  }

  static getFormattedDate(transaction: Transaction): string {
    const date = new Date(transaction.date);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  }
}