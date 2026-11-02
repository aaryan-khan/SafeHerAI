import * as SecureStore from 'expo-secure-store';
import { secureTokenStore } from '@/auth/tokenStorage';

// Replace the phone's secure storage with an in-memory fake for this test.
jest.mock('expo-secure-store', () => {
  const data = new Map<string, string>();
  return {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
    getItemAsync: jest.fn(async (key: string) => data.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      data.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      data.delete(key);
    }),
  };
});

describe('secureTokenStore', () => {
  it('saves, reads and clears the refresh token through SecureStore', async () => {
    await secureTokenStore.setRefreshToken('refresh-abc');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('safeherai.refreshToken', 'refresh-abc', {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
    await expect(secureTokenStore.getRefreshToken()).resolves.toBe('refresh-abc');

    await secureTokenStore.clear();
    await expect(secureTokenStore.getRefreshToken()).resolves.toBeNull();
  });
});
