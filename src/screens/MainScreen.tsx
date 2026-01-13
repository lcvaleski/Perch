import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTransactions, ViewMode } from '../hooks/useTransactions';
import { TransactionRow } from '../components/TransactionRow';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { TransactionState } from '../models/TransactionState';
import { Transaction } from '../models/Transaction';
import { SettingsModal } from '../components/SettingsModal';
import { StatsModal } from '../components/StatsModal';
import { PlaidLinkWebView } from '../components/PlaidLinkWebView';
import { Colors } from '../utils/colors';
import * as SecureStore from 'expo-secure-store';
import { getPlaidConfig } from '../config/plaid.config';

const { width: screenWidth } = Dimensions.get('window');

interface MainScreenProps {
  onLogout?: () => void;
}

export const MainScreen: React.FC<MainScreenProps> = ({ onLogout }) => {
  const {
    transactions,
    transactionStates,
    newTransactionIds,
    dailyTotal,
    weeklyTotal,
    monthlyTotal,
    yearlyTotal,
    isLoading,
    currentMode,
    switchMode,
    refresh,
  } = useTransactions();

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [statsData, setStatsData] = useState<{ label: string; amount: number }[]>([]);
  const [statsAverage, setStatsAverage] = useState<number>(0);
  const [statsTitle, setStatsTitle] = useState<string>('');
  const [statsAverageLabel, setStatsAverageLabel] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [hiddenTransactions, setHiddenTransactions] = useState<Set<string>>(new Set());
  const [plaidLinkToken, setPlaidLinkToken] = useState<string | null>(null);
  const [showPlaidLink, setShowPlaidLink] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [demoTransactionIndex, setDemoTransactionIndex] = useState(0);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoTransactionStates, setDemoTransactionStates] = useState<TransactionState[]>([]);
  const demoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tapRef = useRef({ lastTap: 0, tapCount: 0 });
  const translateX = useRef(new Animated.Value(0)).current;
  const listFadeAnim = useRef(new Animated.Value(1)).current;
  const listScaleAnim = useRef(new Animated.Value(1)).current;
  const totalScaleAnim = useRef(new Animated.Value(1)).current;

  // iOS modal presentation animations
  const backgroundScaleAnim = useRef(new Animated.Value(1)).current;
  const backgroundBorderRadiusAnim = useRef(new Animated.Value(0)).current;

  const modes = [
    { key: ViewMode.Day, label: 'Day' },
    { key: ViewMode.Week, label: 'Week' },
    { key: ViewMode.Month, label: 'Month' },
    { key: ViewMode.Year, label: 'Year' },
  ];

  // Animation values for each tab
  const tabAnimations = useRef(
    modes.map((mode) => new Animated.Value(mode.key === currentMode ? 1 : 0))
  ).current;

  const totalOpacityAnim = useRef(new Animated.Value(1)).current;

  // Mock transactions for demo mode
  const mockTransactions = [
    { id: 1001, date: '2025-01-12', payee: 'Uber Eats', amount: 32.64, category: 'Food & Drink', account: 'Visa' },
    { id: 1002, date: '2025-01-12', payee: 'MTA', amount: 6.75, category: 'Transportation', account: 'Visa' },
    { id: 1003, date: '2025-01-12', payee: "Trader Joe's", amount: 46.29, category: 'Groceries', account: 'Amex' },
    { id: 1004, date: '2025-01-12', payee: 'Spotify', amount: 4.99, category: 'Entertainment', account: 'Amex' },
    { id: 1005, date: '2025-01-12', payee: 'Gas', amount: 41.03, category: 'Transportation', account: 'Chase Work' },
    { id: 1006, date: '2025-01-12', payee: 'Starbucks', amount: 7.99, category: 'Food & Drink', account: 'Chase Work' },
  ];

  // Load hidden transactions from storage
  useEffect(() => {
    const loadHiddenTransactions = async () => {
      try {
        const stored = await AsyncStorage.getItem('hidden_transactions');
        if (stored) {
          setHiddenTransactions(new Set(JSON.parse(stored)));
        }
      } catch (error) {
        console.error('Error loading hidden transactions:', error);
      }
    };
    loadHiddenTransactions();
  }, []);

  // Save hidden transactions whenever they change
  useEffect(() => {
    const saveHiddenTransactions = async () => {
      try {
        await AsyncStorage.setItem('hidden_transactions', JSON.stringify(Array.from(hiddenTransactions)));
      } catch (error) {
        console.error('Error saving hidden transactions:', error);
      }
    };
    saveHiddenTransactions();
  }, [hiddenTransactions]);

  // Toggle hidden state for a transaction
  const toggleHiddenTransaction = (transactionId: string) => {
    // Haptic feedback for transaction tap
    Haptics.selectionAsync();

    // Trigger subtle bounce animation on total
    Animated.sequence([
      Animated.timing(totalScaleAnim, {
        toValue: 0.97,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(totalScaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();

    setHiddenTransactions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId);
      } else {
        newSet.add(transactionId);
      }
      return newSet;
    });
  };

  // Animate fade when loading changes and sync tab colors
  React.useEffect(() => {
    const loading = demoMode ? demoLoading : isLoading;
    if (loading) {

      // Fade out and scale down the list
      Animated.parallel([
        Animated.timing(listFadeAnim, {
          toValue: 0.5, // Keep more visible
          duration: 50, // Very fast
          useNativeDriver: true,
        }),
        Animated.timing(listScaleAnim, {
          toValue: 0.99, // Very slightly smaller
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Fade in with bounce effect for list
      Animated.parallel([
        Animated.timing(listFadeAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(listScaleAnim, {
            toValue: 1.005, // Very subtle overshoot
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.spring(listScaleAnim, {
            toValue: 1,
            tension: 120,
            friction: 10,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }

    // Animate total with shimmer effect
    if (loading) {
      // Create pulsing shimmer effect with opacity
      Animated.loop(
        Animated.sequence([
          Animated.timing(totalOpacityAnim, {
            toValue: 0.4,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(totalOpacityAnim, {
            toValue: 0.8,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Subtle scale down
      Animated.timing(totalScaleAnim, {
        toValue: 0.99,
        duration: 80,
        useNativeDriver: true,
      }).start();
    } else {
      // Stop the shimmer loop
      totalOpacityAnim.stopAnimation();

      // Fade in with subtle overshoot bounce
      Animated.parallel([
        Animated.timing(totalOpacityAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(totalScaleAnim, {
            toValue: 1.01, // Very subtle overshoot
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.spring(totalScaleAnim, {
            toValue: 1,
            tension: 120,
            friction: 10,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }

    // Sync tab color animations with loading state
    modes.forEach((mode, index) => {
      Animated.timing(tabAnimations[index], {
        toValue: mode.key === currentMode ? 1 : 0,
        duration: 100, // Same timing as fadeAnim
        useNativeDriver: false,
      }).start();
    });
  }, [isLoading, demoLoading, demoMode, currentMode, transactionStates.length, demoTransactionStates.length]);

  const currentModeRef = useRef(currentMode);
  currentModeRef.current = currentMode;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        // Much more sensitive - activate with smaller movements
        return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5;
      },
      onPanResponderGrant: () => {
        // Trigger haptic at the start of swipe
        Haptics.selectionAsync();
      },
      onPanResponderMove: (evt, gestureState) => {
        // Add visual feedback during swipe
        let translation = gestureState.dx;

        // Get current index
        const currentIdx = modes.findIndex(m => m.key === currentModeRef.current);

        // Add resistance at edges
        if (currentIdx === 0 && gestureState.dx > 0) {
          translation = gestureState.dx * 0.3;
        } else if (currentIdx === modes.length - 1 && gestureState.dx < 0) {
          translation = gestureState.dx * 0.3;
        }

        translateX.setValue(translation);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const swipeThreshold = screenWidth * 0.1; // Much more sensitive - 10% of screen width
        const velocityThreshold = 0.2; // Much more sensitive velocity


        // Get current index
        const currentIdx = modes.findIndex(m => m.key === currentModeRef.current);


        let shouldChangeView = false;
        let newMode = null;

        // Determine swipe direction
        if (gestureState.dx < -swipeThreshold || gestureState.vx < -velocityThreshold) {
          // Swiped left - go to next view
          if (currentIdx < modes.length - 1) {
            shouldChangeView = true;
            newMode = modes[currentIdx + 1].key;
          }
        } else if (gestureState.dx > swipeThreshold || gestureState.vx > velocityThreshold) {
          // Swiped right - go to previous view
          if (currentIdx > 0) {
            shouldChangeView = true;
            newMode = modes[currentIdx - 1].key;
          }
        }

        // Always animate back to center
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }).start();

        if (shouldChangeView && newMode) {
          switchMode(newMode, false);
        }
      },
    })
  ).current;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleModalSwipe = (direction: 'left' | 'right') => {
    const currentIndex = modes.findIndex(m => m.key === currentMode);
    let newIndex = currentIndex;

    if (direction === 'left') {
      // Move to next mode
      newIndex = (currentIndex + 1) % modes.length;
    } else {
      // Move to previous mode
      newIndex = (currentIndex - 1 + modes.length) % modes.length;
    }

    switchMode(modes[newIndex].key);
  };

  const getTotalDisplay = () => {
    // Calculate total excluding hidden transactions
    const visibleTotal = transactionStates.reduce((sum, state) => {
      if (!hiddenTransactions.has(state.transaction.id.toString())) {
        // Parse amount from string to number
        const amount = parseFloat(state.transaction.amount.replace(/[^0-9.-]/g, '')) || 0;
        return sum + amount;
      }
      return sum;
    }, 0);

    return `$${visibleTotal.toFixed(2)}`;
  };

  const loadStatsData = async () => {
    // Generate dummy data based on current view mode
    // In production, this would fetch from API
    let data: { label: string; amount: number }[] = [];
    let title = '';
    let averageLabel = '';
    let average = 0;

    switch (currentMode) {
      case ViewMode.Day:
        // Last 7 days
        const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        data = days.map(day => ({
          label: day,
          amount: Math.random() * 200 + 50, // Random daily amounts 50-250
        }));
        title = 'Last Seven Days';
        averageLabel = '30 Day Average';
        average = Math.random() * 150 + 75; // Random average 75-225
        break;

      case ViewMode.Week:
        // Last 6 weeks
        const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];
        data = weeks.map(week => ({
          label: week,
          amount: Math.random() * 800 + 400, // Random weekly amounts 400-1200
        }));
        title = 'Last Six Weeks';
        averageLabel = '12 Week Average';
        average = Math.random() * 700 + 500; // Random average 500-1200
        break;

      case ViewMode.Month:
        // Last 6 months
        const months = ['A', 'S', 'O', 'N', 'D', 'J'];
        data = months.map(month => ({
          label: month,
          amount: Math.random() * 3000 + 1000, // Random amounts between 1000-4000
        }));
        title = 'Last Six Months';
        averageLabel = '12 Month Average';
        average = Math.random() * 2500 + 1500; // Random average between 1500-4000
        break;

      case ViewMode.Year:
        // Last 5 years
        const years = ['20', '21', '22', '23', '24', '25'];
        data = years.map(year => ({
          label: year,
          amount: Math.random() * 35000 + 15000, // Random yearly amounts 15k-50k
        }));
        title = 'Last Six Years';
        averageLabel = '6 Year Average';
        average = Math.random() * 30000 + 20000; // Random average 20k-50k
        break;
    }

    setStatsData(data);
    setStatsTitle(title);
    setStatsAverageLabel(averageLabel);
    setStatsAverage(average);
  };

  useEffect(() => {
    if (statsVisible) {
      loadStatsData();
    }
  }, [statsVisible, currentMode]);

  // Handle Plaid link from settings
  const handlePlaidLink = (linkToken: string) => {
    console.log('MainScreen: handlePlaidLink called with token:', linkToken);
    setPlaidLinkToken(linkToken);
    setShowPlaidLink(true);
  };

  const handlePlaidSuccess = async (publicToken: string, metadata: any) => {
    try {
      const config = getPlaidConfig();

      // Exchange public token for access token
      const response = await fetch('https://sandbox.plaid.com/item/public_token/exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: config.clientId,
          secret: config.secret,
          public_token: publicToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange token');
      }

      const data = await response.json();

      // Store access token securely
      await SecureStore.setItemAsync('plaid_access_token', data.access_token);
      await SecureStore.setItemAsync('plaid_item_id', data.item_id);

      setShowPlaidLink(false);
      setPlaidLinkToken(null);

      Alert.alert('Success', 'Bank account connected successfully!');

      // Refresh transactions
      refresh();
    } catch (error) {
      console.error('Error exchanging token:', error);
      Alert.alert('Error', 'Failed to connect bank account');
    }
  };

  const handlePlaidExit = () => {
    console.log('MainScreen: Plaid exit');
    setShowPlaidLink(false);
    setPlaidLinkToken(null);
  };

  // Demo mode for App Store video
  const startDemoMode = () => {
    setDemoMode(true);
    setDemoTransactionIndex(0);
    setDemoLoading(true);

    // Clear any existing interval
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
    }

    // Helper to create full transaction object
    const createFullTransaction = (t: any): Transaction => ({
      id: t.id,
      date: t.date,
      payee: t.payee,
      amount: t.amount.toString(),
      currency: 'usd',
      categoryName: t.category,
      account_display_name: t.account,
      excludeFromTotals: false,
    });

    // Start with empty list, then show 2 transactions after brief delay
    setTimeout(() => {
      const initialTransactions = mockTransactions.slice(0, 2).map(createFullTransaction);
      const states: TransactionState[] = initialTransactions.map(t => new TransactionState(t));
      setDemoTransactionStates(states);
      setDemoTransactionIndex(2);
      setDemoLoading(false);

      // Trigger pull-to-refresh animation for subsequent loads
      let refreshCount = 0;

      // Add 2 more transactions every 1.6 seconds with loading animation
      demoIntervalRef.current = setInterval(() => {
        refreshCount++;

        // Show loading state instead of pull-to-refresh
        setDemoLoading(true);

        setTimeout(() => {
          setDemoTransactionIndex(prev => {
            const newIndex = prev + 2;
            if (newIndex > mockTransactions.length) {
              // Reset to start with all transactions for a cycle
              if (refreshCount % 2 === 0) {
                // Every other cycle, show all transactions
                const allTransactions = mockTransactions.map(createFullTransaction);
                const states: TransactionState[] = allTransactions.map(t => new TransactionState(t));
                setDemoTransactionStates(states);
                setDemoLoading(false);
                return mockTransactions.length;
              } else {
                // Otherwise reset to 2
                const resetTransactions = mockTransactions.slice(0, 2).map(createFullTransaction);
                const states: TransactionState[] = resetTransactions.map(t => new TransactionState(t));
                setDemoTransactionStates(states);
                setDemoLoading(false);
                return 2;
              }
            } else {
              const nextTransactions = mockTransactions.slice(0, newIndex).map(createFullTransaction);
              const states: TransactionState[] = nextTransactions.map(t => new TransactionState(t));
              setDemoTransactionStates(states);
              setDemoLoading(false);
              return newIndex;
            }
          });
        }, 300); // Quick loading animation
      }, 1600);
    }, 300); // Initial delay for loading state
  };

  const stopDemoMode = () => {
    setDemoMode(false);
    setRefreshing(false);
    setDemoLoading(false);
    setDemoTransactionStates([]);
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
    }
    // Refresh real data
    refresh();
  };

  useEffect(() => {
    // Cleanup interval on unmount
    return () => {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
      }
    };
  }, []);

  // Don't show error screen - just continue with normal UI

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Animated wrapper for iOS-style modal presentation */}
      <Animated.View
        style={[
          styles.mainContent,
          {
            transform: [{ scale: backgroundScaleAnim }],
          }
        ]}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: backgroundBorderRadiusAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 20],
              }),
              overflow: 'hidden',
              backgroundColor: Colors.riverBackground,
            }
          ]}
        >
        {/* Settings Icon */}
        <TouchableOpacity
          style={styles.settingsIconContainer}
          onPress={() => {
            // Animate background to scale down
            Animated.parallel([
              Animated.spring(backgroundScaleAnim, {
                toValue: 0.93,
                tension: 100,
                friction: 30,
                useNativeDriver: true,
              }),
              Animated.timing(backgroundBorderRadiusAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: false,
              }),
            ]).start();
            setSettingsVisible(true);
          }}
        >
          <Ionicons name="settings-sharp" size={20} color="rgba(102, 102, 102, 0.2)" />
        </TouchableOpacity>

        {/* Header Section */}
        <View style={styles.header}>
        {/* Main Amount - Tap for stats */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setStatsVisible(true)}
        >
          <Animated.Text
            style={[
              styles.totalAmount,
              {
                color: Colors.riverBlue,
                opacity: totalOpacityAnim,
                transform: [{ scale: totalScaleAnim }],
              }
            ]}
          >
            {demoMode ? (
              demoTransactionIndex === 0 ? '$0.00' :
              `$${mockTransactions.slice(0, Math.min(demoTransactionIndex, mockTransactions.length)).reduce((sum, t) => sum + t.amount, 0).toFixed(2)}`
            ) : getTotalDisplay()}
          </Animated.Text>
        </TouchableOpacity>

        {/* Time Range Selector */}
        <View style={styles.modeSelector}>
          {/* Tab Buttons */}
          {modes.map((mode, index) => (
            <TouchableOpacity
              key={mode.key}
              style={[
                styles.modeButton,
                currentMode === mode.key && styles.modeButtonActive
              ]}
              onPress={() => switchMode(mode.key, true)}
              activeOpacity={0.7}
            >
              <View style={styles.modeButtonContent}>
                <Animated.Text
                  style={[
                    styles.modeButtonText,
                    {
                      color: tabAnimations[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [Colors.riverTextSecondaryOpacity06, Colors.riverBlueLighter],
                      }),
                      fontWeight: tabAnimations[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: ['400', '500'],
                      }),
                    },
                  ]}
                >
                  {mode.label}
                </Animated.Text>
                {currentMode === mode.key && (
                  <View style={[styles.underline, { backgroundColor: Colors.riverBlueLighter }]} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Transaction List with Swipe Gesture */}
      <View style={styles.listWrapper}>
        <Animated.View
          style={[
            styles.listContainer,
            {
              transform: [
                {
                  translateX: translateX.interpolate({
                    inputRange: [-screenWidth, 0, screenWidth],
                    outputRange: [-50, 0, 50],
                    extrapolate: 'clamp',
                  }),
                },
              ],
              opacity: translateX.interpolate({
                inputRange: [-screenWidth/2, 0, screenWidth/2],
                outputRange: [0.8, 1, 0.8],
                extrapolate: 'clamp',
              }),
            },
          ]}
          {...panResponder.panHandlers}
        >
          <Animated.View style={{
            flex: 1,
            opacity: listFadeAnim,
            transform: [{ scale: listScaleAnim }]
          }}>
            {(isLoading || demoLoading) && (demoMode ? demoTransactionStates : transactionStates).length === 0 ? (
              <SkeletonLoader count={10} />
            ) : (demoMode ? demoTransactionStates : transactionStates).length === 0 ? (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.emptyContainer}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor={Colors.riverBlue}
                  />
                }
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.emptyText}>No transactions yet</Text>
              </ScrollView>
            ) : (
              <FlatList
                data={demoMode ? demoTransactionStates : transactionStates}
                keyExtractor={(item) => item.transaction.id.toString()}
                renderItem={({ item }) => (
                  <TransactionRow
                    state={item}
                    isNew={!demoMode && newTransactionIds.has(item.transaction.id.toString())}
                    isHidden={!demoMode && hiddenTransactions.has(item.transaction.id.toString())}
                    onToggleHidden={() => !demoMode && toggleHiddenTransaction(item.transaction.id.toString())}
                  />
                )}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor={Colors.riverBlue}
                  />
                }
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
              />
            )}
          </Animated.View>
        </Animated.View>

        {/* Gradient overlay at top */}
        <LinearGradient
          colors={['rgba(243, 243, 243, 1)', 'rgba(243, 243, 243, 0)']}
          style={styles.gradientOverlay}
          pointerEvents="none"
        />
      </View>

        {/* Plaid Link WebView - rendered outside of settings modal */}
        {plaidLinkToken && (
          <PlaidLinkWebView
            linkToken={plaidLinkToken}
            visible={showPlaidLink}
            onSuccess={handlePlaidSuccess}
            onExit={handlePlaidExit}
          />
        )}
        </Animated.View>
      </Animated.View>

      {/* Modals rendered outside of animated wrapper */}
      <SettingsModal
        visible={settingsVisible}
        onClose={() => {
          // Animate background back to normal
          Animated.parallel([
            Animated.spring(backgroundScaleAnim, {
              toValue: 1,
              tension: 100,
              friction: 30,
              useNativeDriver: true,
            }),
            Animated.timing(backgroundBorderRadiusAnim, {
              toValue: 0,
              duration: 250,
              useNativeDriver: false,
            }),
          ]).start();
          setSettingsVisible(false);
          // Refresh data when settings modal closes
          refresh();
        }}
        onLogout={onLogout}
        onPlaidLink={handlePlaidLink}
        demoMode={demoMode}
        onDemoModeToggle={(enabled) => {
          if (enabled) {
            startDemoMode();
          } else {
            stopDemoMode();
          }
        }}
      />

      <StatsModal
        visible={statsVisible}
        onClose={() => setStatsVisible(false)}
        data={statsData}
        average={statsAverage}
        title={statsTitle}
        averageLabel={statsAverageLabel}
        currentMode={currentMode}
        onSwitchMode={handleModalSwipe}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.riverBackground,
  },
  mainContent: {
    flex: 1,
    backgroundColor: Colors.riverBackground,
  },
  settingsIconContainer: {
    position: 'absolute',
    top: 10,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 12,
    alignItems: 'center',
  },
  totalAmount: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.riverBlue,
    marginBottom: 16,
    fontFamily: Platform.select({
      ios: 'Courier',
      android: 'Courier',
      default: 'Courier'
    }),
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'relative',
    height: 30,
    alignItems: 'center',
  },
  modeButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  modeButtonActive: {
    // Active state for button container
  },
  modeButtonContent: {
    position: 'relative',
    alignItems: 'center',
  },
  modeButtonText: {
    fontSize: 13,
    color: Colors.riverTextSecondaryOpacity06,
  },
  modeButtonTextActive: {
    color: Colors.riverBlueLighter,
    fontWeight: '500',
  },
  underline: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.riverBlueLighter,
    borderRadius: 1,
  },
  listWrapper: {
    flex: 1,
    position: 'relative',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 30,
    zIndex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  emptyText: {
    fontSize: 13,
    color: 'rgba(102, 102, 102, 0.4)',
    fontStyle: 'italic',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.riverTextSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.riverBlue,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  settingsButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  settingsButtonText: {
    color: Colors.riverBlue,
    fontSize: 16,
  },
});