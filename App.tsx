import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MainScreen } from './src/screens/MainScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { Config } from './src/utils/config';
import { Colors, ColorThemes, setColorTheme } from './src/utils/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';

// Polyfill for react-native-svg
import { Buffer } from 'buffer';
global.Buffer = Buffer;

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [hasKeys, setHasKeys] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      // Check authentication status
      const authData = await AsyncStorage.getItem('apple_auth_data');
      setIsAuthenticated(authData !== null);

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

  const handleAuthSuccess = async (credential: AppleAuthentication.AppleAuthenticationCredential) => {
    try {
      // Store auth data
      await AsyncStorage.setItem('apple_auth_data', JSON.stringify({
        user: credential.user,
        email: credential.email,
        fullName: credential.fullName,
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode,
      }));
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error storing auth data:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('apple_auth_data');
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error during logout:', error);
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

  if (!isAuthenticated) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <MainScreen onLogout={handleLogout} />
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
