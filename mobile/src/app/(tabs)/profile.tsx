import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { Role } from '@/api/client';
import { describeApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Avatar, Banner, Button, Card, ListItem, Screen, StatusPill, Text, theme } from '@/ui';

const ROLE_LABEL: Record<Role, string> = { USER: 'Standard account', MODERATOR: 'Moderator', ADMIN: 'Administrator' };

/** "28 October 2026", in the phone's language settings. */
function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? 'Unknown'
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ProfileScreen() {
  const { state, logout, reloadProfile } = useAuth();
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState<'reload' | 'logout' | null>(null);

  if (state.status !== 'signedIn') {
    return null; // the navigator is about to switch away
  }
  const { user } = state;

  async function onReload() {
    setBusy('reload');
    setMessage(null);
    try {
      await reloadProfile();
      setMessage({ tone: 'success', text: 'Profile is up to date.' });
    } catch (error) {
      setMessage({ tone: 'error', text: describeApiError(error) });
    } finally {
      setBusy(null);
    }
  }

  async function onLogout() {
    setBusy('logout');
    await logout(); // always succeeds on this phone; the navigator then shows the welcome screen
  }

  return (
    <Screen edges={['top']}>
      <Animated.View entering={FadeInDown.duration(theme.motion.slow)} style={styles.identity}>
        <Avatar name={user.displayName} size={88} />
        <Text variant="title" align="center" accessibilityRole="header">
          {user.displayName}
        </Text>
        <Text variant="body" color="textMuted" align="center">
          {user.email}
        </Text>
        <StatusPill label={ROLE_LABEL[user.role]} tone={user.role === 'USER' ? 'neutral' : 'ai'} align="center" />
      </Animated.View>

      {message ? <Banner tone={message.tone} message={message.text} /> : null}

      <Card style={styles.list}>
        <Text variant="overline" color="textSubtle" style={styles.listTitle}>
          ACCOUNT
        </Text>
        <ListItem icon="edit" title="Edit display name" subtitle="Change how your name appears" onPress={() => router.push('/edit-profile')} />
        <ListItem icon="list_alt" title="My reports" subtitle="Check on or delete reports you sent" onPress={() => router.push('/my-reports')} />
        <ListItem icon="calendar_today" title="Member since" subtitle={formatDate(user.createdAt)} />
        <ListItem icon="refresh" title="Refresh profile" subtitle="Load the latest details from the server" onPress={onReload} />
      </Card>

      <Card style={styles.list}>
        <Text variant="overline" color="textSubtle" style={styles.listTitle}>
          APP
        </Text>
        <ListItem icon="dns" title="Connection check" subtitle="Test the link to the SafeHerAI server" onPress={() => router.push('/connection')} />
        <ListItem
          icon="shield_lock"
          title="Your privacy"
          subtitle="Your password is stored only as a secure hash. Your email isn't shown to other users."
        />
        {__DEV__ ? (
          <ListItem icon="palette" title="UI gallery" subtitle="Development builds only" onPress={() => router.push('/gallery')} />
        ) : null}
      </Card>

      <View style={styles.logout}>
        <Button title="Log out" variant="secondary" icon="logout" onPress={onLogout} loading={busy === 'logout'} />
        {busy === 'reload' ? (
          <Text variant="caption" color="textSubtle" align="center">
            Refreshing…
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.md, marginBottom: theme.spacing.sm },
  list: { padding: theme.spacing.sm, gap: 2 },
  listTitle: { paddingHorizontal: theme.spacing.xs, paddingTop: theme.spacing.xs },
  logout: { gap: theme.spacing.xs, marginTop: theme.spacing.xs, marginBottom: theme.spacing.lg },
});
