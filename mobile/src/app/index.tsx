import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/auth/AuthContext';
import { Banner, Button, Card, Icon, LogoMark, Screen, StatusPill, Text, theme, type IconName } from '@/ui';

/**
 * What SafeHerAI is being built to do. Shown as a roadmap, clearly marked "in development",
 * so the app never suggests that a feature works before it does.
 */
const ROADMAP: { icon: IconName; title: string; body: string }[] = [
  { icon: 'map', title: 'Community safety map', body: 'Reported incidents, clearly marked verified or unverified.' },
  { icon: 'group', title: 'Trusted contacts', body: 'Share a journey with people you choose.' },
  { icon: 'sos', title: 'Emergency tools', body: 'Designed to keep working even without internet.' },
];

/** Staggered fade-up for each block. Reanimated skips it if "reduce motion" is on. */
const enter = (index: number) => FadeInDown.duration(theme.motion.slow).delay(80 * index);

export default function WelcomeScreen() {
  const { state } = useAuth();
  const notice = state.status === 'signedOut' ? state.notice : undefined;

  return (
    <Screen>
      <Animated.View entering={enter(0)} style={styles.hero}>
        <View style={styles.logoGlow}>
          <LogoMark size={84} />
        </View>
        <Text variant="overline" color="primary">
          SAFEHERAI
        </Text>
        <Text variant="display" accessibilityRole="header">
          Move through your city with more confidence.
        </Text>
        <Text variant="body" color="textMuted">
          Community reports, trusted contacts and emergency tools in one calm, private app.
        </Text>
      </Animated.View>

      {notice ? <Banner tone="info" message={notice} /> : null}

      <Animated.View entering={enter(1)} style={styles.actions}>
        <Button title="Create account" icon="person_add" onPress={() => router.push('/register')} />
        <Button title="Log in" variant="secondary" onPress={() => router.push('/login')} />
      </Animated.View>

      <Animated.View entering={enter(2)}>
        <Card variant="glass" style={styles.roadmap}>
          <View style={styles.roadmapHeader}>
            <Text variant="overline" color="textSubtle">
              WHAT WE'RE BUILDING
            </Text>
            <StatusPill label="In development" tone="ai" />
          </View>
          {ROADMAP.map((item) => (
            <View key={item.title} style={styles.feature} accessible accessibilityLabel={`${item.title}. ${item.body}`}>
              <View style={styles.featureIcon}>
                <Icon name={item.icon} size={22} color={theme.colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text variant="bodyStrong">{item.title}</Text>
                <Text variant="label" color="textMuted">
                  {item.body}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      </Animated.View>

      <Animated.View entering={enter(3)} style={styles.emergency} accessible>
        <Icon name="call" size={20} color={theme.colors.emergencyOrange} />
        <Text variant="label" color="textMuted" style={styles.flex}>
          SafeHerAI is not an emergency service. In an emergency in India, call{' '}
          <Text variant="label" color="text" style={styles.bold}>
            112
          </Text>
          .
        </Text>
      </Animated.View>

      <View style={styles.footer}>
        <Button title="Check server connection" variant="ghost" icon="wifi" onPress={() => router.push('/connection')} />
        {__DEV__ ? (
          <Button title="UI gallery (development only)" variant="ghost" icon="palette" onPress={() => router.push('/gallery')} />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: theme.spacing.sm, marginTop: theme.spacing.lg },
  logoGlow: {
    alignSelf: 'flex-start',
    padding: theme.spacing.sm,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.primarySoft,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.glow,
  },
  actions: { gap: theme.spacing.sm, marginTop: theme.spacing.xs },
  roadmap: { gap: theme.spacing.md },
  roadmapHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.xs },
  feature: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
  },
  flex: { flex: 1 },
  emergency: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 138, 61, 0.35)',
    backgroundColor: 'rgba(255, 138, 61, 0.08)',
  },
  bold: { fontFamily: theme.fonts.bold },
  footer: { alignItems: 'center', gap: 0 },
});
