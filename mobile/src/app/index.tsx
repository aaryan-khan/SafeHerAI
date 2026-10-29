import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { checkHealth, describeHealth, type HealthResult } from '@/api/health';
import { API_URL } from '@/config/env';

/**
 * Temporary first screen: checks that the phone can reach the backend.
 * Milestone 3 Part 2 replaces it with Welcome / Login / Register.
 */
export default function ConnectionCheckScreen() {
  const [result, setResult] = useState<HealthResult | null>(null);
  const [checking, setChecking] = useState(false);

  async function onCheck() {
    setChecking(true);
    setResult(await checkHealth(API_URL));
    setChecking(false);
  }

  const ok = result?.kind === 'up';

  return (
    <View style={styles.container}>
      <Text style={styles.heading} accessibilityRole="header">
        Server connection check
      </Text>
      <Text style={styles.label}>Server address</Text>
      <Text style={styles.value} selectable>
        {API_URL ?? 'not set'}
      </Text>

      <Pressable
        onPress={onCheck}
        disabled={checking}
        accessibilityRole="button"
        accessibilityLabel="Check connection to the SafeHerAI server"
        style={({ pressed }) => [styles.button, (pressed || checking) && styles.buttonPressed]}>
        <Text style={styles.buttonText}>{checking ? 'Checking…' : 'Check connection'}</Text>
      </Pressable>

      {checking && <ActivityIndicator size="large" />}
      {result && !checking && (
        <Text
          style={[styles.result, ok ? styles.ok : styles.problem]}
          accessibilityLiveRegion="polite">
          {ok ? '✓ ' : '✕ '}
          {describeHealth(result)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, backgroundColor: '#fff' },
  heading: { fontSize: 24, fontWeight: '700', color: '#1a1a1a' },
  label: { fontSize: 14, color: '#555', marginTop: 8 },
  value: { fontSize: 16, color: '#1a1a1a' },
  button: {
    marginTop: 16,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#6a1b9a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  result: { fontSize: 16, lineHeight: 22, marginTop: 8 },
  ok: { color: '#1b5e20' },
  problem: { color: '#b71c1c' },
});
