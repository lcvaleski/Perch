import { useEffect } from 'react';
import { Linking, Alert } from 'react-native';

interface PlaidLinkBrowserProps {
  linkToken: string;
  onSuccess: (publicToken: string, metadata: any) => void;
  onExit: () => void;
}

export const PlaidLinkBrowser: React.FC<PlaidLinkBrowserProps> = ({
  linkToken,
  onSuccess,
  onExit,
}) => {
  useEffect(() => {
    if (linkToken) {
      openPlaidLink();
    }
  }, [linkToken]);

  const openPlaidLink = async () => {
    // Create a redirect URI for your app
    const redirectUri = encodeURIComponent('perch://plaid-link');

    // Use the hosted Link URL
    const plaidUrl = `https://cdn.plaid.com/link/v2/stable/link.html?token=${linkToken}&redirect_uri=${redirectUri}`;

    try {
      // Open Plaid Link in the system browser
      const supported = await Linking.canOpenURL(plaidUrl);
      if (supported) {
        await Linking.openURL(plaidUrl);

        // Set up a listener for when the user returns
        const handleUrl = (url: string) => {
          console.log('Received URL:', url);

          if (url.includes('perch://plaid-link')) {
            // Parse the response
            const urlParams = new URLSearchParams(url.split('?')[1]);
            const publicToken = urlParams.get('public_token');
            const error = urlParams.get('error');

            if (publicToken) {
              onSuccess(publicToken, {});
            } else if (error) {
              console.error('Plaid Link error:', error);
              onExit();
            } else {
              onExit();
            }
          }
        };

        // Listen for the app to be reopened
        const subscription = Linking.addEventListener('url', (event) => {
          handleUrl(event.url);
        });

        // Clean up the listener after some time
        setTimeout(() => {
          subscription.remove();
          onExit();
        }, 300000); // 5 minutes timeout

      } else {
        Alert.alert('Error', 'Cannot open Plaid Link');
        onExit();
      }
    } catch (error) {
      console.error('Error opening Plaid Link:', error);
      Alert.alert('Error', 'Failed to open Plaid Link');
      onExit();
    }
  };

  // This component doesn't render anything
  return null;
};