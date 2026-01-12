import React, { useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Colors } from '../utils/colors';
import {
  create,
  open,
  LinkSuccess,
  LinkExit,
  LinkIOSPresentationStyle,
  LinkLogLevel,
} from 'react-native-plaid-link-sdk';

interface PlaidLinkNativeProps {
  linkToken: string;
  onSuccess: (publicToken: string, metadata: LinkSuccess) => void;
  onExit: (error?: LinkExit) => void;
  visible: boolean;
}

export const PlaidLinkNative: React.FC<PlaidLinkNativeProps> = ({
  linkToken,
  onSuccess,
  onExit,
  visible,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);

  useEffect(() => {
    if (visible && linkToken) {
      openPlaidLink();
    }
  }, [visible, linkToken]);

  const openPlaidLink = async () => {
    try {
      setIsLoading(true);
      console.log('Creating Plaid Link with token:', linkToken);

      // Create the Plaid Link configuration
      const linkTokenConfiguration = {
        token: linkToken,
        logLevel: LinkLogLevel.ERROR,
        // iOS specific options
        presentationStyle: LinkIOSPresentationStyle.MODAL,
      };

      // Create the Plaid Link instance
      const result = await create(linkTokenConfiguration);

      if (!result.success) {
        console.error('Failed to create Plaid Link');
        onExit();
        return;
      }

      // Open Plaid Link
      const openResult = await open({
        onSuccess: (success: LinkSuccess) => {
          console.log('Plaid Link success:', success);
          onSuccess(success.publicToken, success);
        },
        onExit: (linkExit: LinkExit) => {
          console.log('Plaid Link exit:', linkExit);
          onExit(linkExit);
        },
      });

      console.log('Plaid Link open result:', openResult);
    } catch (error) {
      console.error('Error opening Plaid Link:', error);
      onExit();
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={Colors.riverBlue} />
        <Text style={styles.loadingText}>Opening Plaid Link...</Text>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -75 }, { translateY: -25 }],
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: Colors.riverTextSecondary,
  },
});