# Perch Backend - Vercel Functions

This backend provides the API endpoints for Plaid integration in the Perch app.

## Setup Instructions

### 1. Install Dependencies

```bash
cd perch-backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and add your Plaid credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Plaid Sandbox credentials:
```
PLAID_CLIENT_ID=your_client_id_here
PLAID_SECRET=your_secret_here
PLAID_ENV=sandbox
```

### 3. Test Locally

```bash
npm run dev
```

This will start the Vercel development server on `http://localhost:3000`

### 4. Deploy to Vercel

```bash
npm run deploy
```

Or deploy through Vercel Dashboard:
1. Push this folder to a GitHub repository
2. Import the project in Vercel
3. Add environment variables in Vercel Dashboard
4. Deploy

## API Endpoints

### POST /api/create-link-token
Creates a Plaid Link token for initializing the Link flow.

Request body:
```json
{
  "user_id": "optional-user-id"
}
```

Response:
```json
{
  "link_token": "link-sandbox-xxx",
  "expiration": "2024-01-01T00:00:00Z"
}
```

### POST /api/exchange-token
Exchanges a public token for an access token.

Request body:
```json
{
  "public_token": "public-sandbox-xxx"
}
```

Response:
```json
{
  "access_token": "access-sandbox-xxx",
  "item_id": "item-xxx"
}
```

### POST /api/get-transactions
Fetches transactions for a given date range.

Request body:
```json
{
  "access_token": "access-sandbox-xxx",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31"
}
```

Response:
```json
{
  "transactions": [...],
  "has_more": false,
  "next_cursor": null,
  "accounts": [...]
}
```

## Testing with Sandbox

Use these test credentials in Plaid Link:
- Username: `user_good`
- Password: `pass_good`

This will create test transactions you can fetch through the API.

## Frontend Configuration

In your React Native app, set the backend URL:

```javascript
// .env or config file
EXPO_PUBLIC_BACKEND_URL=https://your-app.vercel.app/api
```

## Troubleshooting

- **CORS errors**: The `vercel.json` file includes CORS headers configuration
- **Environment variables not working**: Make sure to add them in Vercel Dashboard
- **TypeScript errors locally**: Run `npm install` in the perch-backend folder