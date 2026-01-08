import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Updates from 'expo-updates';
// import PlaidLink from '@burstware/expo-plaid-link'; // Temporarily disabled for build
import { Config } from '../utils/config';
import { Colors } from '../utils/colors';
import { PlaidService } from '../services/PlaidService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
  const [lunchMoneyKey, setLunchMoneyKey] = useState('');
  const [usePlaid, setUsePlaid] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoadingLinkToken, setIsLoadingLinkToken] = useState(false);
  const [plaidConnected, setPlaidConnected] = useState(false);
  const plaidService = useState(() => new PlaidService())[0];

  useEffect(() => {
    console.log('SettingsModal visible:', visible);
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    const key = await Config.getLunchMoneyAPIKey();
    setLunchMoneyKey(key || '');

    const storedUsePlaid = await AsyncStorage.getItem('use_plaid');
    setUsePlaid(storedUsePlaid === 'true');

    const connected = await plaidService.isConnected();
    setPlaidConnected(connected);
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
    setIsLoadingLinkToken(true);
    try {
      const token = await plaidService.createLinkToken();
      setLinkToken(token);
    } catch (error) {
      Alert.alert('Error', 'Failed to initialize Plaid. Please check your backend configuration.');
    } finally {
      setIsLoadingLinkToken(false);
    }
  };

  const handlePlaidSuccess = async (success: any) => {
    try {
      await plaidService.exchangePublicToken(success.publicToken);
      setPlaidConnected(true);
      setLinkToken(null);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Bank account connected successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to connect bank account');
    }
  };

  const handlePlaidExit = () => {
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.pillIndicator} />
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
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
          <View style={[styles.section, { opacity: 0.3, pointerEvents: 'none' }]}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>Use Plaid (Coming Soon)</Text>
              <Switch
                value={false}
                onValueChange={() => {}}
                trackColor={{ false: Colors.riverBorder, true: Colors.riverBlueLighter }}
                thumbColor='#f4f3f4'
                disabled={true}
              />
            </View>
          </View>

          {false ? (
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
                <TouchableOpacity
                  style={styles.connectButton}
                  onPress={handleConnectPlaid}
                  disabled={isLoadingLinkToken}
                >
                  {isLoadingLinkToken ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.connectButtonText}>Connect Bank Account</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ) : (
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
          )}

            {/* Plaid Link temporarily disabled for build
            {linkToken && (
              <PlaidLink
                linkToken={linkToken}
                onSuccess={handlePlaidSuccess}
                onExit={handlePlaidExit}
              />
            )} */}
            </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.riverBackground,
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
});