import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
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
    errorMessage,
    currentMode,
    switchMode,
    refresh,
  } = useTransactions();

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const listFadeAnim = useRef(new Animated.Value(1)).current;
  const totalScaleAnim = useRef(new Animated.Value(1)).current;
  const currentModeRef = useRef(currentMode);

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

  // Update ref when mode changes
  React.useEffect(() => {
    currentModeRef.current = currentMode;
  }, [currentMode]);

  // Animate fade when loading changes and sync tab colors
  React.useEffect(() => {
    if (isLoading) {
      // Smoothly fade out the list when loading starts
      Animated.timing(listFadeAnim, {
        toValue: 0.3, // Keep slightly visible instead of fully transparent
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      // Fade in when loading completes
      Animated.timing(listFadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }

    // Animate total with fade and subtle bounce
    if (isLoading) {
      // Fade out and scale down slightly
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(totalScaleAnim, {
          toValue: 0.99,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Haptic feedback when fade-in starts
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Fade in with subtle overshoot bounce
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(totalScaleAnim, {
            toValue: 1.015, // Very subtle overshoot
            duration: 120,
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

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        // Only activate if horizontal movement is significantly larger than vertical
        // and the horizontal distance is more than 30 pixels
        return Math.abs(dx) > Math.abs(dy) * 3 && Math.abs(dx) > 30;
      },
      onPanResponderMove: (evt, gestureState) => {
        // Add visual feedback during swipe
        let translation = gestureState.dx;

        // Get current index from ref to avoid stale closure
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
        const swipeThreshold = screenWidth * 0.45; // Increased to 45% of screen width
        const velocityThreshold = 1.2; // Increased to 1.2 for very fast swipes only

        // Get current index from ref to avoid stale closure
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

        // Animate back to center
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 40,
          friction: 7,
        }).start();

        if (shouldChangeView && newMode) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          switchMode(newMode);
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

  if (errorMessage) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setSettingsVisible(true)}
          >
            <Text style={styles.settingsButtonText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
        <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Settings Icon */}
      <TouchableOpacity
        style={styles.settingsIconContainer}
        onPress={async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSettingsVisible(true);
        }}
      >
        <Ionicons name="settings-sharp" size={20} color="rgba(102, 102, 102, 0.2)" />
      </TouchableOpacity>

      {/* Header Section */}
      <View style={styles.header}>
        {/* Main Amount */}
        <Animated.Text
          style={[
            styles.totalAmount,
            {
              opacity: fadeAnim,
              transform: [{ scale: totalScaleAnim }],
            }
          ]}
        >
          {getTotalDisplay()}
        </Animated.Text>

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
              onPress={() => switchMode(mode.key)}
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
                  <View style={styles.underline} />
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
              opacity: Animated.multiply(
                translateX.interpolate({
                  inputRange: [-screenWidth/2, 0, screenWidth/2],
                  outputRange: [0.8, 1, 0.8],
                  extrapolate: 'clamp',
                }),
                fadeAnim
              ),
            },
          ]}
          {...panResponder.panHandlers}
        >
          <Animated.View style={{ flex: 1, opacity: listFadeAnim }}>
            {isLoading && transactionStates.length === 0 ? (
              <SkeletonLoader count={10} />
            ) : transactionStates.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No transactions yet</Text>
              </View>
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

      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
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
    fontSize: 28,
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
    fontSize: 14,
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
    fontSize: 14,
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