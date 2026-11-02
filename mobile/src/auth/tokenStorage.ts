import * as SecureStore from 'expo-secure-store';
import type { TokenStore } from '@/api/client';

const REFRESH_TOKEN_KEY = 'safeherai.refreshToken';

/**
 * Keeps the refresh token in the phone's secure storage (Android Keystore / iOS Keychain).
 * Never use AsyncStorage for tokens: it is not encrypted.
 */
export const secureTokenStore: TokenStore = {
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  setRefreshToken: (token) =>
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    }),
  clear: () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
};
