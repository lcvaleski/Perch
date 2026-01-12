import React, { useEffect } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/colors';

interface PlaidLinkWebViewProps {
  linkToken: string;
  visible: boolean;
  onSuccess: (publicToken: string, metadata: any) => void;
  onExit: () => void;
}

export const PlaidLinkWebView: React.FC<PlaidLinkWebViewProps> = ({
  linkToken,
  visible,
  onSuccess,
  onExit,
}) => {
  console.log('PlaidLinkWebView rendered - visible:', visible, 'linkToken:', linkToken);
  // Use hosted Link flow (without isWebview parameter)
  const plaidLinkUri = `https://cdn.plaid.com/link/v2/stable/link.html?token=${linkToken}&isEmbedded=true`;

  useEffect(() => {
    console.log('PlaidLinkWebView effect - Modal should be visible:', visible);
    if (visible) {
      console.log('Modal IS visible, rendering with URI:', plaidLinkUri);
    }
  }, [visible, plaidLinkUri]);

  const handleNavigationStateChange = (event: any) => {
    console.log('WebView navigation:', event.url);

    // Only handle plaidlink:// URLs
    if (event.url.includes('plaidlink://')) {
      const url = decodeURIComponent(event.url);
      console.log('Plaid Link URL detected:', url);

      if (url.includes('plaidlink://connected')) {
        // Extract public token from URL
        const publicTokenMatch = url.match(/public_token=([^&]*)/);
        const metadataMatch = url.match(/metadata=({.*})/);

        if (publicTokenMatch) {
          const publicToken = publicTokenMatch[1];
          const metadata = metadataMatch ? JSON.parse(metadataMatch[1]) : {};
          console.log('Success! Public token:', publicToken);
          onSuccess(publicToken, metadata);
        }
      } else if (url.includes('plaidlink://exit')) {
        console.log('User explicitly exited Plaid Link');
        onExit();
      }

      return false;
    }
    return true;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onExit}
      onShow={() => console.log('Modal onShow triggered!')}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onExit} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={Colors.riverText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Connect Your Bank</Text>
          <View style={styles.placeholder} />
        </View>

        <WebView
          source={{ uri: plaidLinkUri }}
          onNavigationStateChange={handleNavigationStateChange}
          onShouldStartLoadWithRequest={(request) => {
            console.log('Should start load with request:', request.url);
            // Allow all requests
            return true;
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error:', nativeEvent);
          }}
          onLoad={() => console.log('WebView loaded successfully')}
          originWhitelist={['https://*', 'plaidlink://*', 'about:*']}
          style={styles.webview}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text>Loading Plaid Link...</Text>
            </View>
          )}
        />
      </SafeAreaView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.riverBorder,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.riverText,
  },
  closeButton: {
    padding: 4,
  },
  placeholder: {
    width: 36,
  },
  webview: {
    flex: 1,
  },
});