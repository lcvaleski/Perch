// Plaid Configuration
// IMPORTANT: Set these values in your environment variables or EAS secrets
// Never commit API keys to source control

export const PlaidConfig = {
  // Sandbox environment for testing
  sandbox: {
    clientId: process.env.EXPO_PUBLIC_PLAID_CLIENT_ID || '',
    secret: process.env.EXPO_PUBLIC_PLAID_SANDBOX_SECRET || '', // NEVER expose secret in production client code
    environment: 'sandbox',
    products: ['transactions'],
    countryCodes: ['US'],
  },

  // Production configuration (secret should be on backend only)
  production: {
    clientId: process.env.EXPO_PUBLIC_PLAID_CLIENT_ID || '',
    secret: process.env.EXPO_PUBLIC_PLAID_PRODUCTION_SECRET || '', // NEVER expose secret in production client code
    environment: 'production',
    products: ['transactions'],
    countryCodes: ['US'],
  },

  // Current environment
  currentEnvironment: (process.env.EXPO_PUBLIC_PLAID_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
};

export const getPlaidConfig = () => {
  const config = PlaidConfig[PlaidConfig.currentEnvironment];

  // Log for debugging
  console.log('Environment:', PlaidConfig.currentEnvironment);
  console.log('Client ID from env:', process.env.EXPO_PUBLIC_PLAID_CLIENT_ID);
  console.log('Has sandbox secret:', !!process.env.EXPO_PUBLIC_PLAID_SANDBOX_SECRET);

  return config;
};

// Backend URL for Plaid operations (if you have a backend)
export const PLAID_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000/api/plaid';