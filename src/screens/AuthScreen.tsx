import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Colors } from '../utils/colors';

const { width: screenWidth } = Dimensions.get('window');

interface AuthScreenProps {
  onAuthSuccess: (credential: AppleAuthentication.AppleAuthenticationCredential) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      onAuthSuccess(credential);
    } catch (error: any) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        console.error('Apple Sign In error:', error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../../assets/wallet.png')}
          style={styles.wallet}
          resizeMode="contain"
        />

        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={5}
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.riverBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    width: screenWidth,
    paddingHorizontal: 40,
  },
  wallet: {
    width: 100,
    height: 100,
    marginBottom: 40,
  },
  appleButton: {
    width: 220,
    height: 44,
  },
});