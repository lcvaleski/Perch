# Perch - Personal Finance Tracker

## Project Overview
Perch is a React Native/Expo mobile application for tracking personal spending. It integrates with LunchMoney API to fetch and display transaction data with a clean, animated interface.

## Tech Stack
- **Framework**: React Native with Expo (v54)
- **Language**: TypeScript
- **Platform**: iOS/Android/Web
- **State Management**: React hooks (useState, useEffect, useRef)
- **Navigation**: Gesture-based with react-native-gesture-handler
- **Animations**: react-native-reanimated
- **External APIs**:
  - LunchMoney API (transaction data)

## Project Structure
```
/
├── App.tsx                 # Main app entry point
├── app.json               # Expo configuration
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── assets/                # Images and icons
└── src/
    ├── components/
    │   ├── SkeletonLoader.tsx    # Loading skeleton UI
    │   ├── TransactionRow.tsx    # Transaction list item
    │   └── SettingsModal.tsx     # Settings configuration modal
    ├── hooks/
    │   └── useTransactions.ts     # Main transaction data hook
    ├── models/
    │   ├── Transaction.ts         # Transaction data model
    │   └── TransactionState.ts   # Transaction state management
    ├── screens/
    │   └── MainScreen.tsx         # Main app screen
    ├── services/
    │   ├── LunchMoneyAPI.ts      # LunchMoney API integration
    │   └── ViewedTransactionsService.ts  # Track new/viewed transactions
    └── utils/
        ├── colors.ts              # Color constants
        └── config.ts              # Configuration management

```

## Key Features

### 1. Transaction Views
- **Day View**: Today's transactions and spending
- **Week View**: Current week's transactions (Sunday-Saturday)
- **Month View**: Current month's transactions
- **Year View**: Year-to-date transactions

### 2. Gesture Navigation
- Swipe left/right to switch between time periods
- Pull-to-refresh to update transaction data
- Smooth animated transitions between views with subtle bounce effects
- Animated underline indicator for active view

### 3. New Transaction Indicators
- Shows "new" label in light blue for transactions not seen before
- Automatically marks as viewed after 3 seconds
- Tracks viewed state using AsyncStorage

### 4. Smart Filtering
- Excludes transfers, payments, income, and allowance categories
- Only shows spending transactions (positive amounts in LunchMoney)
- Excludes transactions marked as "exclude from totals"

## Configuration

### API Keys Required
The app requires one API key configured via the Settings modal:
1. **LunchMoney API Key**: For fetching transaction data

Keys are stored securely using expo-secure-store.

## Available Scripts
```bash
npm start       # Start Expo development server
npm run ios     # Run on iOS simulator
npm run android # Run on Android emulator
npm run web     # Run in web browser
```

## Architecture Notes

### Data Flow
1. `App.tsx` initializes the app and checks for API configuration
2. `MainScreen.tsx` renders the UI and handles gesture navigation
3. `useTransactions` hook manages all transaction data and API calls
4. `LunchMoneyAPI` service fetches transaction data
5. `ViewedTransactionsService` tracks which transactions are new/viewed
6. `TransactionState` holds transaction data

### State Management
- Uses React hooks for state management
- Transaction states wrapped in TransactionState objects
- New/viewed status tracked in AsyncStorage

### Performance Optimizations
- Parallel API calls for different time periods
- Skeleton loading states during data fetching
- Smooth fade transitions between views
- Animated transitions use native drivers where possible
- Subtle bounce animations on total amount display

## Color Scheme
Primary colors defined in `src/utils/colors.ts`:
- River Blue: #4682B4 (primary)
- River Blue Hover: rgb(90, 154, 214)
- River Blue Lighter: rgb(120, 174, 224) (used for active tabs and "new" indicator)
- River Background: rgb(243, 243, 243)
- Text colors with various opacity levels

## API Integration Details

### LunchMoney API
- Base URL: https://dev.lunchmoney.app/v1
- Endpoints used: `/transactions`
- Fetches transactions with date range filters
- Limits: 500-1000 transactions per request


## Important Implementation Details

### Transaction Filtering Logic
Located in `LunchMoneyAPI.filterTransactions()`:
- Filters out negative amounts (in LunchMoney, positive = spending)
- Excludes transactions marked as "excludeFromTotals"
- Excludes categories: transfer, payment, income, allowance
- Sorts by date (newest first)

### View Mode Switching
- Animated underline indicator for active view
- Light blue text color for active tab
- Swipe gestures with resistance at edges
- Haptic feedback on mode changes
- Smooth fade transitions during data refresh
- Subtle bounce animation on total amount

### Error Handling
- Graceful fallbacks for API failures
- Settings prompt when API keys are missing
- Retry functionality for failed requests
- Console logging for debugging

## Development Guidelines

### Adding New Features
1. Follow existing code patterns and conventions
2. Use TypeScript for type safety
3. Implement loading and error states
4. Add haptic feedback for user interactions
5. Consider performance impacts of API calls

### Testing Considerations
- Test with various transaction volumes
- Verify gesture navigation on different devices
- Check API key configuration flow
- Test offline/error scenarios

### Security Notes
- API keys stored in secure storage
- No hardcoded credentials
- HTTPS for all API communications
- Minimal data persistence (only viewed transaction IDs cached)

## Common Tasks

### Debugging API Issues
- Check console logs for detailed error messages
- Verify API keys in Settings modal
- Check network connectivity
- Review API response format changes

### Modifying Transaction Filters
Edit `LunchMoneyAPI.filterTransactions()` method to adjust:
- Category exclusions
- Amount filtering
- Date sorting

### Customizing UI
- Colors: Edit `src/utils/colors.ts`
- Animations: Modify spring/timing configs in `MainScreen.tsx`
- Layout: Adjust styles in component StyleSheet definitions
- Wallet icon: Replace `assets/wallet.png`

## Recent UI Updates
- Removed AI transaction refinement functionality
- Added wallet image at top of screen
- Implemented animated underline for active view tabs
- Light blue color scheme for active elements
- "New" indicator for unviewed transactions (auto-marks as viewed after 3 seconds)
- Subtle bounce animation on total amount when loading
- Smooth fade transitions between different transaction lists

## Dependencies to Note
- **expo-secure-store**: Secure API key storage
- **expo-haptics**: Touch feedback
- **date-fns**: Date manipulation
- **axios**: HTTP client
- **react-native-reanimated**: Smooth animations
- **@expo/vector-icons**: Icon library (Ionicons)
- **@react-native-async-storage/async-storage**: Local storage for viewed transactions