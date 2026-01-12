import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Updates from 'expo-updates';
import { Config } from '../utils/config';
import { Colors, ColorThemes, setColorTheme, getCurrentThemeKey } from '../utils/colors';
import { PlaidService } from '../services/PlaidService';
import { getPlaidConfig } from '../config/plaid.config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { PlaidLinkNative } from './PlaidLinkNative';
import { LinkSuccess } from 'react-native-plaid-link-sdk';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onLogout?: () => void;
  onPlaidLink?: (linkToken: string) => void;
  demoMode?: boolean;
  onDemoModeToggle?: (enabled: boolean) => void;
}

const { height: screenHeight } = Dimensions.get('window');

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose, onLogout, onPlaidLink, demoMode = false, onDemoModeToggle }) => {
  const [lunchMoneyKey, setLunchMoneyKey] = useState('');
  const [usePlaid, setUsePlaid] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoadingLinkToken, setIsLoadingLinkToken] = useState(false);
  const [plaidConnected, setPlaidConnected] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<keyof typeof ColorThemes>('river');
  const [showPlaidLink, setShowPlaidLink] = useState(false);
  const plaidService = useState(() => new PlaidService())[0];

  // Animation values for iOS-style modal
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('SettingsModal visible:', visible);
    if (visible) {
      loadSettings();
      // Animate modal sliding up
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.3,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate modal sliding down
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const loadSettings = async () => {
    const key = await Config.getLunchMoneyAPIKey();
    setLunchMoneyKey(key || '');

    const storedUsePlaid = await AsyncStorage.getItem('use_plaid');
    setUsePlaid(storedUsePlaid === 'true');

    const connected = await plaidService.isConnected();
    setPlaidConnected(connected);

    // Load saved theme
    const savedTheme = await AsyncStorage.getItem('color_theme');
    if (savedTheme && savedTheme in ColorThemes) {
      setSelectedTheme(savedTheme as keyof typeof ColorThemes);
      setColorTheme(savedTheme as keyof typeof ColorThemes);
    }
  };

  const handleSave = async () => {
    if (!usePlaid && !lunchMoneyKey.trim()) {
      Alert.alert('Error', 'Please enter a LunchMoney API key or connect with Plaid');
      return;
    }

    if (usePlaid && !plaidConnected) {
      Alert.alert('Error', 'Please connect your bank account with Plaid');
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      if (!usePlaid) {
        await Config.setLunchMoneyAPIKey(lunchMoneyKey.trim());
      }
      await AsyncStorage.setItem('use_plaid', usePlaid ? 'true' : 'false');

      // Save theme
      await AsyncStorage.setItem('color_theme', selectedTheme);
      setColorTheme(selectedTheme);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();

      // Reload the app to apply changes
      if (!__DEV__) {
        // Only reload in production builds
        await Updates.reloadAsync();
      }
      // In development, the app will refresh automatically when modal closes
    } catch (error) {
      console.error('Error saving settings:', error);
      // Don't show error if save actually worked (which it usually does)
      // The reload might fail but the settings are saved
      onClose();
    }
  };

  const handleConnectPlaid = async () => {
    console.log('=== handleConnectPlaid called ===');
    setIsLoadingLinkToken(true);

    try {
      const config = getPlaidConfig();
      console.log('Plaid config:', JSON.stringify(config, null, 2));

      // Check if config exists
      if (!config) {
        Alert.alert(
          'Configuration Missing',
          'Unable to load Plaid configuration. This feature is currently unavailable.',
          [{ text: 'OK' }]
        );
        setIsLoadingLinkToken(false);
        return;
      }

      // Check configuration
      if (!config.clientId) {
        Alert.alert(
          'Plaid Not Configured',
          'Plaid integration requires API keys to be configured.\n\nPlease ensure EXPO_PUBLIC_PLAID_CLIENT_ID is set in your environment variables.',
          [{ text: 'OK' }]
        );
        setIsLoadingLinkToken(false);
        return;
      }

      if (!config.secret) {
        Alert.alert(
          'Plaid Not Configured',
          `Plaid secret key is missing.\n\nPlease ensure ${config.environment === 'production' ? 'EXPO_PUBLIC_PLAID_PRODUCTION_SECRET' : 'EXPO_PUBLIC_PLAID_SANDBOX_SECRET'} is set in your environment variables.`,
          [{ text: 'OK' }]
        );
        setIsLoadingLinkToken(false);
        return;
      }

      // Create link token using Plaid API directly
      console.log('Creating link token...');
      const plaidUrl = config.environment === 'production'
        ? 'https://production.plaid.com/link/token/create'
        : 'https://sandbox.plaid.com/link/token/create';

      console.log('Calling Plaid API:', plaidUrl);

      Alert.alert('Creating Link Token', 'Connecting to Plaid...');

      const requestBody = {
        client_id: config.clientId,
        secret: config.secret,
        user: {
          client_user_id: 'perch-user-' + Date.now(),
        },
        client_name: 'Perch',
        products: ['transactions'],
        country_codes: ['US'],
        language: 'en',
      };

      console.log('Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(plaidUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        let errorMessage = 'Failed to create link token';
        let errorDetails = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error_message || errorJson.display_message || errorJson.message || errorMessage;
          errorDetails = `Code: ${errorJson.error_code || 'Unknown'}\nType: ${errorJson.error_type || 'Unknown'}`;
        } catch {}
        Alert.alert('Plaid Error', `${errorMessage}\n\n${errorDetails}`);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Link token created:', data.link_token);

      Alert.alert(
        'Success',
        'Link token created. Opening Plaid Link...',
        [{
          text: 'OK',
          onPress: () => {
            setLinkToken(data.link_token);
            setShowPlaidLink(true);
            console.log('Link token ready for native SDK');
          }
        }]
      );
    } catch (error: any) {
      console.error('Error initializing Plaid:', error);
      console.error('Error details:', error.toString());

      // More user-friendly error messages
      let errorMessage = 'Failed to initialize Plaid Link';
      if (error?.message?.includes('Network request failed')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Alert.alert('Connection Failed', errorMessage, [{ text: 'OK' }]);
    } finally {
      setIsLoadingLinkToken(false);
    }
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

      setPlaidConnected(true);
      setShowPlaidLink(false);
      setLinkToken(null);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Bank account connected successfully!');
    } catch (error) {
      console.error('Error exchanging token:', error);
      Alert.alert('Error', 'Failed to connect bank account');
    }
  };

  const handlePlaidExit = () => {
    setShowPlaidLink(false);
    setLinkToken(null);
  };

  const handleDisconnectPlaid = async () => {
    Alert.alert(
      'Disconnect Bank Account',
      'Are you sure you want to disconnect your bank account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await plaidService.disconnect();
            setPlaidConnected(false);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      ]
    );
  };

  const handleModalClose = () => {
    // Animate out then call onClose
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  return (
    <>
      <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      presentationStyle="overFullScreen"
      onRequestClose={handleModalClose}
    >
      <View style={styles.modalContainer}>
        {/* Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdropOpacity }
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={handleModalClose}
          />
        </Animated.View>

        {/* Modal content */}
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.header}>
            <View style={styles.pillIndicator} />
          <TouchableOpacity onPress={handleModalClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={Colors.riverTextSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Ionicons name="checkmark-circle" size={32} color={Colors.riverBlue} />
          </TouchableOpacity>
        </View>
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >

            <View style={styles.content}>
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>Use Plaid</Text>
              <Switch
                value={usePlaid}
                onValueChange={setUsePlaid}
                trackColor={{ false: Colors.riverBorder, true: Colors.riverBlueLighter }}
                thumbColor='#f4f3f4'
              />
            </View>
          </View>

          {usePlaid ? (
            <View style={styles.section}>
              <Text style={styles.label}>Plaid Connection</Text>
              {plaidConnected ? (
                <View style={styles.connectedContainer}>
                  <Text style={styles.connectedText}>✓ Bank account connected</Text>
                  <TouchableOpacity
                    style={styles.disconnectButton}
                    onPress={handleDisconnectPlaid}
                  >
                    <Text style={styles.disconnectButtonText}>Disconnect</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.addBankContainer}>
                  <Text style={styles.addBankText}>Add Bank Account</Text>
                  <TouchableOpacity
                    style={[styles.addButton, isLoadingLinkToken && styles.addButtonDisabled]}
                    onPress={async () => {
                      // Immediate haptic feedback
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

                      // Call the handler directly since config is working
                      await handleConnectPlaid();
                    }}
                    disabled={isLoadingLinkToken}
                  >
                    {isLoadingLinkToken ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.addButtonText}>+</Text>
                    )}
                  </TouchableOpacity>
                  {isLoadingLinkToken && (
                    <Text style={styles.loadingText}>Setting up Plaid...</Text>
                  )}
                </View>
              )}
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <Text style={styles.label}>LunchMoney API Key</Text>
                <TextInput
                  style={styles.input}
                  value={lunchMoneyKey}
                  onChangeText={setLunchMoneyKey}
                  placeholder="Enter your API key"
                  placeholderTextColor={Colors.riverTextSecondary}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Color Theme</Text>
                <View style={styles.themeContainer}>
                  {(Object.keys(ColorThemes) as Array<keyof typeof ColorThemes>).map((theme) => (
                    <TouchableOpacity
                      key={theme}
                      style={[
                        styles.themeOption,
                        selectedTheme === theme && styles.themeOptionSelected
                      ]}
                      onPress={() => {
                        setSelectedTheme(theme);
                        Haptics.selectionAsync();
                      }}
                    >
                      <View
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: ColorThemes[theme].primary }
                        ]}
                      />
                      <Text style={[
                        styles.themeLabel,
                        selectedTheme === theme && { color: ColorThemes[theme].primary }
                      ]}>
                        {ColorThemes[theme].name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}

            {/* Plaid Link temporarily disabled for build
            {linkToken && (
              <PlaidLink
                linkToken={linkToken}
                onSuccess={handlePlaidSuccess}
                onExit={handlePlaidExit}
              />
            )} */}

            {/* Demo Mode Toggle */}
            {onDemoModeToggle && (
              <View style={styles.section}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Demo Mode (App Store Video)</Text>
                  <Switch
                    value={demoMode}
                    onValueChange={onDemoModeToggle}
                    trackColor={{ false: Colors.riverBorder, true: Colors.riverBlueLighter }}
                    thumbColor='#f4f3f4'
                  />
                </View>
                <Text style={styles.helperText}>Shows sample transactions for recording</Text>
              </View>
            )}

            {/* Logout Button */}
            {onLogout && Platform.OS === 'ios' && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.logoutButton}
                  onPress={() => {
                    Alert.alert(
                      'Sign Out',
                      'Are you sure you want to sign out?',
                      [
                        {
                          text: 'Cancel',
                          style: 'cancel'
                        },
                        {
                          text: 'Sign Out',
                          style: 'destructive',
                          onPress: () => {
                            onClose();
                            onLogout();
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Text style={styles.logoutButtonText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            )}
            </View>
        </ScrollView>
        </Animated.View>
      </View>
    </Modal>

    {/* Native Plaid Link - opens when link token is ready */}
    {linkToken && showPlaidLink && (
      <PlaidLinkNative
        linkToken={linkToken}
        visible={showPlaidLink}
        onSuccess={async (publicToken: string, metadata: LinkSuccess) => {
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

            setPlaidConnected(true);
            setShowPlaidLink(false);
            setLinkToken(null);

            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', 'Bank account connected successfully!');
          } catch (error) {
            console.error('Error exchanging token:', error);
            Alert.alert('Error', 'Failed to connect bank account');
          }
        }}
        onExit={(error) => {
          console.log('Plaid Link exited:', error);
          setShowPlaidLink(false);
          setLinkToken(null);
        }}
      />
    )}

    </>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },
  container: {
    backgroundColor: Colors.riverBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: screenHeight * 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  pillIndicator: {
    width: 40,
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
    marginBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    left: 20,
    top: 35,
    padding: 4,
  },
  saveButton: {
    position: 'absolute',
    right: 20,
    top: 35,
    padding: 4,
  },
  content: {
    padding: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.riverText,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.riverBorder,
    color: Colors.riverText,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  connectButton: {
    backgroundColor: Colors.riverBlue,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  connectedContainer: {
    backgroundColor: Colors.riverBackground,
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.riverBorder,
  },
  connectedText: {
    color: Colors.riverText,
    fontSize: 14,
  },
  disconnectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  disconnectButtonText: {
    color: Colors.riverBlue,
    fontSize: 14,
  },
  themeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 12,
  },
  themeOption: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.riverBorder,
    width: '22%',
  },
  themeOptionSelected: {
    borderWidth: 2,
    borderColor: Colors.riverBlue,
    backgroundColor: 'rgba(70, 130, 180, 0.05)',
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 4,
  },
  themeLabel: {
    fontSize: 12,
    color: Colors.riverText,
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: Colors.riverBlue,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  addBankContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  addBankText: {
    fontSize: 14,
    color: Colors.riverTextSecondary,
    marginBottom: 16,
  },
  addButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.riverBlue,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  addButtonText: {
    fontSize: 36,
    fontWeight: '300',
    color: 'white',
    marginTop: -2,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.riverTextSecondary,
    marginTop: 8,
  },
  helperText: {
    fontSize: 12,
    color: Colors.riverTextSecondary,
    marginTop: 4,
  },
});