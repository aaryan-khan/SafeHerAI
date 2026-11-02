import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { describeApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Banner, Button, colors } from '@/components/ui';

export default function HomeScreen() {
  const { state, logout, reloadProfile } = useAuth();
  const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(null);
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
      setMessage({ tone: 'info', text: 'Profile loaded from the server.' });
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading} accessibilityRole="header">
        Hello, {user.displayName}
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user.email}</Text>
        <Text style={styles.label}>Account type</Text>
        <Text style={styles.value}>{user.role === 'USER' ? 'Standard' : user.role}</Text>
      </View>

      <Text style={styles.note}>
        Maps, incident reports, trusted contacts and SOS arrive in later milestones. They are not available yet.
      </Text>

      {message ? <Banner tone={message.tone} message={message.text} /> : null}

      <Button title="Reload profile" variant="secondary" onPress={onReload} loading={busy === 'reload'} />
      <Button title="Log out" onPress={onLogout} loading={busy === 'logout'} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 16, backgroundColor: colors.background, flexGrow: 1 },
  heading: { fontSize: 26, fontWeight: '700', color: colors.text },
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 16, gap: 4 },
  label: { fontSize: 14, color: colors.muted, marginTop: 8 },
  value: { fontSize: 17, color: colors.text },
  note: { fontSize: 15, lineHeight: 21, color: colors.muted },
});
