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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTransactions, ViewMode } from '../hooks/useTransactions';
import { TransactionRow } from '../components/TransactionRow';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { SettingsModal } from '../components/SettingsModal';
import { StatsModal } from '../components/StatsModal';
import { Colors } from '../utils/colors';

const { width: screenWidth } = Dimensions.get('window');

export const MainScreen: React.FC = () => {
  const {
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
  const translateX = useRef(new Animated.Value(0)).current;
  const listFadeAnim = useRef(new Animated.Value(1)).current;
  const listScaleAnim = useRef(new Animated.Value(1)).current;
  const totalScaleAnim = useRef(new Animated.Value(1)).current;

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

  // Animate fade when loading changes and sync tab colors
  React.useEffect(() => {
    if (isLoading) {

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
    if (isLoading) {
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
      // Haptic feedback when fade-in starts
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
  }, [isLoading, currentMode, transactionStates.length]);

  const currentModeRef = useRef(currentMode);
  currentModeRef.current = currentMode;

  // Track haptic feedback state - only trigger at specific thresholds
  const hasTriggeredFirstHaptic = useRef(false);
  const hasTriggeredSecondHaptic = useRef(false);
  const firstHapticThreshold = screenWidth * 0.03; // 3% of screen width - early feedback
  const secondHapticThreshold = screenWidth * 0.09; // 9% of screen width - just before switch

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        // Much more sensitive - activate with smaller movements
        return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5;
      },
      onPanResponderGrant: () => {
        // Reset haptic tracking for new swipe
        hasTriggeredFirstHaptic.current = false;
        hasTriggeredSecondHaptic.current = false;
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

        // Subtle haptic feedback at two key thresholds
        const currentPosition = Math.abs(gestureState.dx);

        // First haptic: Light tick when starting to swipe (3% threshold)
        if (!hasTriggeredFirstHaptic.current && currentPosition >= firstHapticThreshold) {
          Haptics.selectionAsync();
          hasTriggeredFirstHaptic.current = true;
        }

        // Second haptic: Slightly stronger when approaching switch threshold (9%)
        if (!hasTriggeredSecondHaptic.current && currentPosition >= secondHapticThreshold) {
          Haptics.selectionAsync(); // Use selection for both for consistency
          hasTriggeredSecondHaptic.current = true;
        }

        // Reset haptics if user swipes back below thresholds
        if (currentPosition < firstHapticThreshold) {
          hasTriggeredFirstHaptic.current = false;
          hasTriggeredSecondHaptic.current = false;
        } else if (currentPosition < secondHapticThreshold) {
          hasTriggeredSecondHaptic.current = false;
        }

        translateX.setValue(translation);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const swipeThreshold = screenWidth * 0.1; // Much more sensitive - 10% of screen width
        const velocityThreshold = 0.2; // Much more sensitive velocity

        // Reset haptic tracking
        hasTriggeredFirstHaptic.current = false;
        hasTriggeredSecondHaptic.current = false;

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
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          switchMode(newMode, false);
        }
      },
    })
  ).current;

  const handleRefresh = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const getTotalDisplay = () => {
    switch (currentMode) {
      case ViewMode.Day:
        return `$${dailyTotal.toFixed(2)}`;
      case ViewMode.Week:
        return `$${weeklyTotal.toFixed(2)}`;
      case ViewMode.Month:
        return `$${monthlyTotal.toFixed(2)}`;
      case ViewMode.Year:
        return `$${yearlyTotal.toFixed(2)}`;
      default:
        return '$0.00';
    }
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
  }, [statsVisible]);

  // Don't show error screen - just continue with normal UI

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Settings Icon */}
      <TouchableOpacity
        style={styles.settingsIconContainer}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSettingsVisible(true);
        }}
      >
        <Ionicons name="settings-sharp" size={20} color="rgba(102, 102, 102, 0.2)" />
      </TouchableOpacity>

      {/* Header Section */}
      <View style={styles.header}>
        {/* Main Amount */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setStatsVisible(true);
          }}
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
            {getTotalDisplay()}
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
            {isLoading && transactionStates.length === 0 ? (
              <SkeletonLoader count={10} />
            ) : transactionStates.length === 0 ? (
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
                data={transactionStates}
                keyExtractor={(item) => item.transaction.id.toString()}
                renderItem={({ item }) => (
                  <TransactionRow
                    state={item}
                    isNew={newTransactionIds.has(item.transaction.id.toString())}
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

      <SettingsModal
        visible={settingsVisible}
        onClose={() => {
          setSettingsVisible(false);
          // Refresh data when settings modal closes
          refresh();
        }}
      />

      <StatsModal
        visible={statsVisible}
        onClose={() => setStatsVisible(false)}
        data={statsData}
        average={statsAverage}
        title={statsTitle}
        averageLabel={statsAverageLabel}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.riverBackground,
  },
  settingsIconContainer: {
    position: 'absolute',
    top: 50,
    right: 40,
    zIndex: 10,
    width: 44,
    height: 44,
    alignItems: 'flex-end',
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
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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