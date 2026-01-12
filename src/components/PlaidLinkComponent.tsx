import React, { useEffect, useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  View,
} from 'react-native';
import { PlaidLink, LinkSuccess, LinkExit } from 'react-native-plaid-link-sdk';
import { Colors } from '../utils/colors';
import { getPlaidConfig } from '../config/plaid.config';
import * as SecureStore from 'expo-secure-store';

interface PlaidLinkComponentProps {
  onSuccess?: (publicToken: string, metadata: any) => void;
  onExit?: () => void;
}

export const PlaidLinkComponent: React.FC<PlaidLinkComponentProps> = ({
  onSuccess,
  onExit,
}) => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    createLinkToken();
  }, []);

  const createLinkToken = async () => {
    try {
      setIsLoading(true);
      const config = getPlaidConfig();

      // In a production app, this should be done on your backend
      // This is only for testing purposes with sandbox
      const response = await fetch('https://sandbox.plaid.com/link/token/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: config.clientId,
          secret: config.secret,
          user: {
            client_user_id: 'perch-user-' + Date.now(),
          },
          client_name: 'Perch',
          products: ['transactions'],
          country_codes: ['US'],
          language: 'en',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create link token');
      }

      const data = await response.json();
      setLinkToken(data.link_token);
    } catch (error) {
      console.error('Error creating link token:', error);
      Alert.alert('Error', 'Failed to initialize Plaid Link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = async (success: LinkSuccess) => {
    try {
      // Exchange public token for access token
      // In production, this should be done on your backend
      const config = getPlaidConfig();

      const response = await fetch('https://sandbox.plaid.com/item/public_token/exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: config.clientId,
          secret: config.secret,
          public_token: success.publicToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange token');
      }

      const data = await response.json();

      // Store access token securely
      await SecureStore.setItemAsync('plaid_access_token', data.access_token);
      await SecureStore.setItemAsync('plaid_item_id', data.item_id);

      if (onSuccess) {
        onSuccess(success.publicToken, success.metadata);
      }

      Alert.alert('Success', 'Bank account connected successfully!');
    } catch (error) {
      console.error('Error exchanging token:', error);
      Alert.alert('Error', 'Failed to connect bank account');
    }
  };

  const handleExit = (exit: LinkExit) => {
    if (!exit.success) {
      console.log('User exited Link:', exit);
    }
    if (onExit) {
      onExit();
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={Colors.riverBlue} />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  if (!linkToken) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Unable to connect to Plaid</Text>
      </View>
    );
  }

  return (
    <PlaidLink
      tokenConfig={{
        token: linkToken,
      }}
      onSuccess={handleSuccess}
      onExit={handleExit}
    >
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Connect Bank Account</Text>
      </TouchableOpacity>
    </PlaidLink>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  button: {
    backgroundColor: Colors.riverBlue,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.riverTextSecondary,
  },
  errorText: {
    fontSize: 14,
    color: 'red',
  },
});