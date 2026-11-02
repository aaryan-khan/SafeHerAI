import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Avatar,
  Banner,
  Button,
  Card,
  EmptyState,
  Logo,
  Screen,
  Skeleton,
  StatusPill,
  Text,
  TextField,
  theme,
} from '@/ui';

/**
 * DEVELOPMENT ONLY: shows every design-system component in one place, so the look
 * can be checked on a real phone. In a production build this screen redirects home.
 */
export default function GalleryScreen() {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  function demoLoading() {
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  }

  return (
    <Screen>
      <Animated.View entering={FadeInDown.duration(theme.motion.slow)} style={styles.section}>
        <Logo />
        <Text variant="body" color="textMuted">
          Design system gallery. Development builds only.
        </Text>
        <Button title="Back" variant="ghost" icon="arrow_back" onPress={() => router.back()} />
      </Animated.View>

      <Section title="Typography">
        <Text variant="display">Display 34</Text>
        <Text variant="title">Title 28</Text>
        <Text variant="heading">Heading 22</Text>
        <Text variant="subheading">Subheading 18</Text>
        <Text variant="body">Body 16: readable text for longer explanations.</Text>
        <Text variant="label" color="textMuted">
          Label 14 · muted
        </Text>
        <Text variant="caption" color="textSubtle">
          Caption 13 · subtle
        </Text>
        <Text variant="overline" color="primary">
          OVERLINE 12
        </Text>
      </Section>

      <Section title="Colours">
        <View style={styles.swatches}>
          {(['primary', 'accent', 'success', 'warning', 'info', 'danger', 'surface', 'surfaceRaised'] as const).map(
            (key) => (
              <View key={key} style={styles.swatchItem}>
                <View style={[styles.swatch, { backgroundColor: theme.colors[key] }]} />
                <Text variant="caption" color="textMuted">
                  {key}
                </Text>
              </View>
            ),
          )}
        </View>
        <Text variant="caption" color="textSubtle">
          Red marks errors. The red-to-orange gradient is for emergencies only.
        </Text>
      </Section>

      <Section title="Buttons">
        <Button title="Primary action" icon="shield" onPress={demoLoading} loading={loading} />
        <Button title="Secondary" variant="secondary" icon="person" onPress={() => {}} />
        <Button title="Ghost" variant="ghost" onPress={() => {}} />
        <Button title="Disabled" onPress={() => {}} disabled />
        <Button title="Emergency (SOS only)" variant="danger" icon="sos" onPress={() => {}} />
      </Section>

      <Section title="Text fields">
        <TextField label="Display name" icon="person" value={name} onChangeText={setName} hint="Shown in the app." />
        <TextField label="Email" icon="mail" value="priya@example.com" success editable={false} />
        <TextField label="Password" icon="lock" password value="secret-password" onChangeText={() => {}} />
        <TextField label="With error" icon="mail" value="not-an-email" error="Please enter a valid email address." />
      </Section>

      <Section title="Status pills">
        <View style={styles.wrap}>
          <StatusPill label="Verified" tone="success" />
          <StatusPill label="Unverified" tone="warning" />
          <StatusPill label="Live" tone="info" live />
          <StatusPill label="Offline" tone="neutral" />
          <StatusPill label="AI insight" tone="ai" />
          <StatusPill label="Alert failed" tone="danger" />
        </View>
      </Section>

      <Section title="Cards">
        <Card>
          <View style={styles.row}>
            <Avatar name="Priya Sharma" />
            <View style={styles.flex}>
              <Text variant="subheading">Priya Sharma</Text>
              <Text variant="label" color="textMuted">
                Default card with avatar
              </Text>
            </View>
          </View>
        </Card>
        <Card variant="glass">
          <Text variant="bodyStrong">Glass card</Text>
          <Text variant="label" color="textMuted">
            Translucent, for content over gradients. Used sparingly.
          </Text>
        </Card>
        <Card variant="ai">
          <StatusPill label="AI insight" tone="ai" />
          <Text variant="bodyStrong">AI card</Text>
          <Text variant="label" color="textMuted">
            Only for AI-generated content, always with its data source and uncertainty.
          </Text>
        </Card>
      </Section>

      <Section title="Banners">
        <Banner tone="success" message="Profile saved." />
        <Banner tone="info" message="You have been logged out." />
        <Banner tone="warning" title="Low data" message="Few reports exist for this area." />
        <Banner tone="error" message="Can't reach the SafeHerAI server." />
      </Section>

      <Section title="Loading skeleton">
        <Card>
          <Skeleton width="60%" height={20} />
          <Skeleton height={14} />
          <Skeleton width="80%" height={14} />
        </Card>
      </Section>

      <Section title="Empty and error states">
        <Card>
          <EmptyState icon="map" title="No reports yet" message="Reports near you will appear here." />
        </Card>
        <Card>
          <EmptyState
            icon="wifi_off"
            tone="error"
            title="Can't load this"
            message="Check your connection and try again."
            actionLabel="Try again"
            onAction={() => {}}
          />
        </Card>
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="overline" color="textSubtle">
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  swatchItem: { alignItems: 'center', gap: 4, width: 72 },
  swatch: { width: 48, height: 48, borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.border },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  flex: { flex: 1 },
});
