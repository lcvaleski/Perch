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
  const [currentMode, setCurrentMode] = useState<ViewMode>(ViewMode.Week);
  const [usePlaid, setUsePlaid] = useState(false);
  const api = useRef<LunchMoneyAPI | PlaidService>(new LunchMoneyAPI()).current;
  const hasMarkedAsViewed = useRef(false);

  // Cache for transactions by mode
  const transactionCache = useRef<Map<ViewMode, { transactions: Transaction[], timestamp: number }>>(new Map());
  const CACHE_DURATION = 30000; // 30 seconds cache

  const calculateTotal = (transactions: Transaction[]): number => {
    return transactions.reduce((sum, t) => sum + TransactionUtils.getAmount(t), 0);
  };

  const loadTransactions = async (mode: ViewMode, forceRefresh = false) => {
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = transactionCache.current.get(mode);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        // Use cached data instantly without loading state
        setTransactions(cached.transactions);
        const states = cached.transactions.map(t => new TransactionState(t));
        setTransactionStates(states);

        // Still update totals from cache
        const total = calculateTotal(cached.transactions);
        switch (mode) {
          case ViewMode.Day:
            setDailyTotal(total);
            break;
          case ViewMode.Week:
            setWeeklyTotal(total);
            break;
          case ViewMode.Month:
            setMonthlyTotal(total);
            break;
          case ViewMode.Year:
            setYearlyTotal(total);
            break;
        }

        // Check for new transactions
        const newIds = new Set<string>();
        for (const transaction of cached.transactions) {
          const id = transaction.id.toString();
          if (!viewedTransactionsService.isViewed(id)) {
            newIds.add(id);
          }
        }
        setNewTransactionIds(newIds);
        return; // Exit early with cached data
      }
    }

    setIsLoading(true);

    try {
      let fetchedTransactions: Transaction[] = [];
      let promises: Promise<any>[] = [];

      switch (mode) {
        case ViewMode.Day:
          // Fetch main transactions and wait for them
          fetchedTransactions = await api.fetchDailyTransactions().catch(err => {
            console.error('Error fetching daily:', err);
            return [];
          });
          setDailyTotal(calculateTotal(fetchedTransactions));

          // Fire off other totals in background (don't wait)
          api.fetchWeeklyTransactions()
            .then(t => setWeeklyTotal(calculateTotal(t)))
            .catch(err => console.error('Error fetching weekly total:', err));
          api.fetchMonthlyTransactions()
            .then(t => setMonthlyTotal(calculateTotal(t)))
            .catch(err => console.error('Error fetching monthly total:', err));
          api.fetchYearlyTotal()
            .then(setYearlyTotal)
            .catch(err => console.error('Error fetching yearly total:', err));
          break;

        case ViewMode.Week:
          // Fetch main transactions and wait for them
          fetchedTransactions = await api.fetchWeeklyTransactions().catch(err => {
            console.error('Error fetching weekly:', err);
            return [];
          });
          setWeeklyTotal(calculateTotal(fetchedTransactions));

          // Fire off other totals in background (don't wait)
          api.fetchMonthlyTransactions()
            .then(t => setMonthlyTotal(calculateTotal(t)))
            .catch(err => console.error('Error fetching monthly total:', err));
          api.fetchYearlyTotal()
            .then(setYearlyTotal)
            .catch(err => console.error('Error fetching yearly total:', err));
          api.fetchLastWeekTotal()
            .then(setLastWeekTotal)
            .catch(err => console.error('Error fetching last week total:', err));
          break;

        case ViewMode.Month:
          // Fetch main transactions and wait for them
          fetchedTransactions = await api.fetchMonthlyTransactions().catch(err => {
            console.error('Error fetching monthly:', err);
            return [];
          });
          setMonthlyTotal(calculateTotal(fetchedTransactions));

          // Fire off other totals in background (don't wait)
          api.fetchYearlyTotal()
            .then(setYearlyTotal)
            .catch(err => console.error('Error fetching yearly total:', err));
          break;

        case ViewMode.Year:
          // Fetch main transactions and wait for them
          fetchedTransactions = await api.fetchYearlyTransactions().catch(err => {
            console.error('Error fetching yearly:', err);
            return [];
          });
          setYearlyTotal(calculateTotal(fetchedTransactions));
          break;
      }

      // Cache the fetched transactions
      transactionCache.current.set(mode, {
        transactions: fetchedTransactions,
        timestamp: Date.now()
      });

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

    } catch (error: any) {
      console.error('Error in loadTransactions:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const switchMode = async (mode: ViewMode, withHaptics = true) => {

    if (withHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setCurrentMode(mode);

    await loadTransactions(mode);
  };

  const refresh = async () => {
    await loadTransactions(currentMode, true); // Force refresh, bypass cache
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

  // Initialize and load on mount
  useEffect(() => {
    viewedTransactionsService.initialize().then(() => {
      loadTransactions(currentMode);
    });
  }, []);

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