import { VercelRequest, VercelResponse } from '@vercel/node';
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

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
    const { user_id = 'default-user' } = req.body;

    const request = {
      client_name: 'Perch',
      country_codes: [CountryCode.Us],
      language: 'en',
      products: [Products.Transactions],
      user: {
        client_user_id: user_id,
      },
      transactions: {
        days_requested: 90,
      },
    };

    const response = await plaidClient.linkTokenCreate(request);

    res.status(200).json({
      link_token: response.data.link_token,
      expiration: response.data.expiration
    });
  } catch (error: any) {
    console.error('Error creating link token:', error);
    res.status(500).json({
      error: 'Failed to create link token',
      details: error.response?.data || error.message
    });
  }
}