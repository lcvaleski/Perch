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
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Updates from 'expo-updates';
import PlaidLink from '@burstware/expo-plaid-link';
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

      // Reload the app
      if (__DEV__) {
        // In development, just close and let parent refresh
        window.location.reload();
      } else {
        // In production, use expo-updates to reload
        await Updates.reloadAsync();
      }
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to save settings');
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
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>Use Plaid (Beta)</Text>
              <Switch
                value={usePlaid}
                onValueChange={setUsePlaid}
                trackColor={{ false: Colors.riverBorder, true: Colors.riverBlueLighter }}
                thumbColor={usePlaid ? Colors.riverBlue : '#f4f3f4'}
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
        </View>

        {linkToken && (
          <PlaidLink
            linkToken={linkToken}
            onSuccess={handlePlaidSuccess}
            onExit={handlePlaidExit}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.riverBackground,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: Colors.riverBackground,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.riverBorder,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: Colors.riverBlue,
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    color: Colors.riverBlue,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.riverText,
  },
  content: {
    padding: 20,
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