import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MainScreen } from './src/screens/MainScreen';
import { Config } from './src/utils/config';
import { Colors, ColorThemes, setColorTheme } from './src/utils/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [hasKeys, setHasKeys] = useState(false);

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      // Load saved theme
      const savedTheme = await AsyncStorage.getItem('color_theme');
      if (savedTheme && savedTheme in ColorThemes) {
        setColorTheme(savedTheme as keyof typeof ColorThemes);
      }

      const keysConfigured = await Config.hasRequiredKeys();
      setHasKeys(keysConfigured);
    } catch (error) {
      console.error('Error checking configuration:', error);
    } finally {
      setIsReady(true);
    }
  };

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.riverBlue} />
        <Text style={styles.loadingText}>Loading Perch...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <MainScreen />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
