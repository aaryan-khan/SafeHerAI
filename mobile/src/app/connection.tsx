import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { checkHealth, describeHealth, type HealthResult } from '@/api/health';
import { API_URL } from '@/config/env';
import { BackButton, Banner, Button, Card, Icon, Screen, Text, theme } from '@/ui';

/**
 * Diagnostic screen: checks that the phone can reach the backend.
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
    <Screen>
      <BackButton />
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header">
          Connection check
        </Text>
        <Text variant="body" color="textMuted">
          Checks whether this phone can reach the SafeHerAI server.
        </Text>
      </View>

      <Card>
        <View style={styles.row}>
          <Icon name="dns" size={22} color={theme.colors.primary} />
          <Text variant="label" color="textMuted">
            Server address
          </Text>
        </View>
        <Text variant="bodyStrong" selectable>
          {API_URL ?? 'Not set'}
        </Text>
      </Card>

      <Button
        title={checking ? 'Checking…' : 'Check connection'}
        icon="wifi"
        onPress={onCheck}
        loading={checking}
        accessibilityHint="Contacts the SafeHerAI server and reports whether it answered"
      />

      {result && !checking ? (
        <Banner tone={ok ? 'success' : 'error'} title={ok ? 'Connected' : 'Not connected'} message={describeHealth(result)} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: theme.spacing.xs, marginTop: theme.spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
});
