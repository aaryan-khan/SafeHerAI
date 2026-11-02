import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { EmptyState, LogoMark, Screen, Text, theme, useAppFonts } from '@/ui';

// Keep the splash screen visible until the fonts are ready, so text never "jumps".
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const fontsReady = useAppFonts();

  useEffect(() => {
    if (fontsReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsReady]);

  if (!fontsReady) {
    return null;
  }

  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

/**
 * Decides which screens exist right now. Screens inside a Stack.Protected whose guard is
 * false can't be opened at all, so a logged-out user can never reach "home".
 */
function RootNavigator() {
  const { state, retry } = useAuth();

  if (state.status === 'loading') {
    return <LoadingScreen />;
  }

  if (state.status === 'offline') {
    return (
      <Screen centered>
        <EmptyState
          icon="wifi_off"
          tone="error"
          title="Can't reach the server"
          message="You're still logged in on this phone, but SafeHerAI can't reach its server right now. Check your internet connection and try again."
          actionLabel="Try again"
          onAction={retry}
        />
      </Screen>
    );
  }

  const signedIn = state.status === 'signedIn';
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'slide_from_right',
      }}>
      {/* redirectTo: where to send someone who opens a screen they can't use right now. */}
      <Stack.Protected guard={signedIn} redirectTo="/">
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="edit-profile" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn} redirectTo="/home">
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>
      <Stack.Screen name="connection" />
      <Stack.Screen name="gallery" />
    </Stack>
  );
}

/** Shown for a moment at start-up while the saved session is checked. */
function LoadingScreen() {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!reduceMotion) {
      scale.value = withRepeat(withTiming(1.08, { duration: 900 }), -1, true);
    }
  }, [reduceMotion, scale]);

  const pulse = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Screen centered scroll={false}>
      <View style={styles.loading} accessible accessibilityLabel="Loading SafeHerAI" accessibilityRole="progressbar">
        <Animated.View style={pulse}>
          <LogoMark size={88} />
        </Animated.View>
        <Text variant="label" color="textMuted">
          Checking your session…
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg },
});
