import { useState, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, TransactionUtils } from '../models/Transaction';
import { TransactionState } from '../models/TransactionState';
import { LunchMoneyAPI } from '../services/LunchMoneyAPI';
import { PlaidService } from '../services/PlaidService';
import { viewedTransactionsService } from '../services/ViewedTransactionsService';
import { Config } from '../utils/config';

export enum ViewMode {
  Day = 'day',
  Week = 'week',
  Month = 'month',
  Year = 'year'
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionStates, setTransactionStates] = useState<TransactionState[]>([]);
  const [newTransactionIds, setNewTransactionIds] = useState<Set<string>>(new Set());
  const [dailyTotal, setDailyTotal] = useState(0);
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [yearlyTotal, setYearlyTotal] = useState(0);
  const [lastWeekTotal, setLastWeekTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<ViewMode>(ViewMode.Day);
  const [usePlaid, setUsePlaid] = useState(false);
  const [api, setApi] = useState<LunchMoneyAPI | PlaidService | null>(null);

  const currentTaskRef = useRef<any>(null);
  const hasMarkedAsViewed = useRef(false);

  const calculateTotal = (transactions: Transaction[]): number => {
    return transactions.reduce((sum, t) => sum + TransactionUtils.getAmount(t), 0);
  };

  const loadTransactions = async (mode: ViewMode, isInitialLoad = false) => {
    if (currentTaskRef.current) {
      currentTaskRef.current = null;
    }

    if (!api) {
      setErrorMessage('Service not initialized');
      return;
    }

    // Only set loading state if we don't have existing data (prevents flicker on refresh)
    if (isInitialLoad || transactionStates.length === 0) {
      setIsLoading(true);
    }
    setErrorMessage(null);

    const taskPromise = async () => {
      try {
        let fetchedTransactions: Transaction[] = [];
        let promises: Promise<any>[] = [];

        switch (mode) {
          case ViewMode.Day:
            promises = [
              api.fetchDailyTransactions()
                .then(t => {
                  fetchedTransactions = t;
                  setDailyTotal(calculateTotal(t));
                })
                .catch(err => console.error('Error fetching daily:', err)),
              api.fetchWeeklyTransactions()
                .then(t => setWeeklyTotal(calculateTotal(t)))
                .catch(err => console.error('Error fetching weekly total:', err)),
              api.fetchMonthlyTransactions()
                .then(t => setMonthlyTotal(calculateTotal(t)))
                .catch(err => console.error('Error fetching monthly total:', err)),
              api.fetchYearlyTotal()
                .then(setYearlyTotal)
                .catch(err => console.error('Error fetching yearly total:', err))
            ];
            break;

          case ViewMode.Week:
            promises = [
              api.fetchWeeklyTransactions()
                .then(t => {
                  fetchedTransactions = t;
                  setWeeklyTotal(calculateTotal(t));
                })
                .catch(err => console.error('Error fetching weekly:', err)),
              api.fetchMonthlyTransactions()
                .then(t => setMonthlyTotal(calculateTotal(t)))
                .catch(err => console.error('Error fetching monthly total:', err)),
              api.fetchYearlyTotal()
                .then(setYearlyTotal)
                .catch(err => console.error('Error fetching yearly total:', err)),
              api.fetchLastWeekTotal()
                .then(setLastWeekTotal)
                .catch(err => console.error('Error fetching last week total:', err))
            ];
            break;

          case ViewMode.Month:
            promises = [
              api.fetchMonthlyTransactions()
                .then(t => {
                  fetchedTransactions = t;
                  setMonthlyTotal(calculateTotal(t));
                })
                .catch(err => console.error('Error fetching monthly:', err)),
              api.fetchYearlyTotal()
                .then(setYearlyTotal)
                .catch(err => console.error('Error fetching yearly total:', err))
            ];
            break;

          case ViewMode.Year:
            promises = [
              api.fetchYearlyTransactions()
                .then(t => {
                  fetchedTransactions = t;
                  setYearlyTotal(calculateTotal(t));
                })
                .catch(err => console.error('Error fetching yearly:', err))
            ];
            break;
        }

        await Promise.allSettled(promises);

        setTransactions(fetchedTransactions);
        const states = fetchedTransactions.map(t => new TransactionState(t));
        setTransactionStates(states);

        // Check which transactions are new
        const newIds = new Set<string>();
        for (const transaction of fetchedTransactions) {
          const id = transaction.id.toString();
          if (!viewedTransactionsService.isViewed(id)) {
            newIds.add(id);
          }
        }
        setNewTransactionIds(newIds);

        // Only show error if main transaction fetch failed
        if (fetchedTransactions.length === 0 && !isLoading) {
          if (usePlaid) {
            const plaidConnected = await (api as PlaidService).isConnected();
            if (!plaidConnected) {
              setErrorMessage('Please connect your bank account in Settings');
            }
          } else {
            const hasApiKey = await Config.hasRequiredKeys();
            if (!hasApiKey) {
              setErrorMessage('Please configure your LunchMoney API key in Settings');
            }
          }
        }
      } catch (error: any) {
        console.error('Critical error in loadTransactions:', error);
        if (usePlaid) {
          setErrorMessage('Please connect your bank account in Settings');
        } else {
          setErrorMessage('Please configure your API keys in Settings');
        }
      } finally {
        setIsLoading(false);
      }
    };

    const taskExecution = taskPromise();
    currentTaskRef.current = taskExecution;
    await taskExecution;
  };


  const switchMode = async (mode: ViewMode) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentMode(mode);

    // Show loading state for a brief moment to indicate data refresh
    setIsLoading(true);

    // Add a small delay to make the loading state visible
    await new Promise(resolve => setTimeout(resolve, 150));

    await loadTransactions(mode);
  };

  const refresh = async () => {
    await loadTransactions(currentMode);
  };

  // Mark transactions as viewed after 3 seconds
  useEffect(() => {
    if (newTransactionIds.size > 0 && !hasMarkedAsViewed.current) {
      const timer = setTimeout(() => {
        const idsToMark = Array.from(newTransactionIds);
        viewedTransactionsService.markAsViewed(idsToMark).then(() => {
          setNewTransactionIds(new Set());
          hasMarkedAsViewed.current = true;
        });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [newTransactionIds]);

  // Reset viewed flag when mode changes
  useEffect(() => {
    hasMarkedAsViewed.current = false;
  }, [currentMode]);

  // Initialize API service based on user preference
  useEffect(() => {
    const initializeService = async () => {
      const storedUsePlaid = await AsyncStorage.getItem('use_plaid');
      const shouldUsePlaid = storedUsePlaid === 'true';
      setUsePlaid(shouldUsePlaid);
      setApi(shouldUsePlaid ? new PlaidService() : new LunchMoneyAPI());
    };
    initializeService();
  }, []);

  // Initialize viewed service and load transactions when API is ready
  useEffect(() => {
    if (api) {
      viewedTransactionsService.initialize().then(() => {
        loadTransactions(currentMode, true);
      });
    }
  }, [api]);

  return {
    transactions,
    transactionStates,
    newTransactionIds,
    dailyTotal,
    weeklyTotal,
    monthlyTotal,
    yearlyTotal,
    lastWeekTotal,
    isLoading,
    errorMessage,
    currentMode,
    switchMode,
    refresh
  };
}