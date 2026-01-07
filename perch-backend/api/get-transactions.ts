import { VercelRequest, VercelResponse } from '@vercel/node';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { access_token, start_date, end_date, cursor } = req.body;

    if (!access_token) {
      return res.status(400).json({ error: 'Access token is required' });
    }

    const request: any = {
      access_token,
    };

    if (cursor) {
      request.cursor = cursor;
    }

    if (start_date && end_date) {
      request.options = {
        days_requested: Math.ceil(
          (new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24)
        )
      };
    }

    const response = await plaidClient.transactionsSync(request);

    const formattedTransactions = response.data.added.map((transaction) => ({
      id: transaction.transaction_id,
      date: transaction.date,
      payee: transaction.merchant_name || transaction.name,
      amount: Math.abs(transaction.amount).toFixed(2),
      currency: transaction.iso_currency_code || 'USD',
      account_id: transaction.account_id,
      category_name: transaction.personal_finance_category?.primary || 'OTHER',
    }));

    res.status(200).json({
      transactions: formattedTransactions,
      has_more: response.data.has_more,
      next_cursor: response.data.next_cursor,
      accounts: response.data.accounts || [],
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      error: 'Failed to fetch transactions',
      details: error.response?.data || error.message
    });
  }
}