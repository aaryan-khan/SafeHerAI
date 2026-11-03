import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { checkHealth, type HealthResult } from '@/api/health';
import { useAuth } from '@/auth/AuthContext';
import { API_URL } from '@/config/env';
import { greetingFor, tipForDate } from '@/content/safetyTips';
import { Avatar, Card, Icon, Screen, Skeleton, StatusPill, Text, theme, type IconName } from '@/ui';

/** Features that are planned but not built yet. Shown clearly as "Coming soon" and not tappable. */
const UPCOMING: { icon: IconName; title: string }[] = [
  { icon: 'report', title: 'Report incident' },
  { icon: 'group', title: 'Trusted contacts' },
  { icon: 'directions_walk', title: 'Safe Walk' },
];

const enter = (index: number) => FadeInDown.duration(theme.motion.slow).delay(70 * index);

export default function HomeScreen() {
  const { state } = useAuth();
  const [server, setServer] = useState<HealthResult | null>(null);

  const checkServer = useCallback(async () => {
    setServer(null);
    setServer(await checkHealth(API_URL));
  }, []);

  useEffect(() => {
    checkServer();
  }, [checkServer]);

  if (state.status !== 'signedIn') {
    return null; // the navigator is about to switch away
  }
  const { user } = state;
  const now = new Date();

  return (
    <Screen edges={['top']}>
      <Animated.View entering={enter(0)} style={styles.header}>
        <View style={styles.flex}>
          <Text variant="label" color="textMuted">
            {greetingFor(now)}
          </Text>
          <Text variant="title" accessibilityRole="header" numberOfLines={1}>
            {user.displayName}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/profile')}
          accessibilityRole="button"
          accessibilityLabel="Open your profile">
          <Avatar name={user.displayName} size={48} />
        </Pressable>
      </Animated.View>

      <Animated.View entering={enter(1)}>
        <Card variant="glass">
          <Text variant="overline" color="textSubtle">
            STATUS
          </Text>
          <View style={styles.statusRow}>
            <Icon name="verified_user" size={20} color={theme.colors.success} />
            <Text variant="body" style={styles.flex}>
              Account
            </Text>
            <StatusPill label="Signed in" tone="success" />
          </View>
          <View style={styles.statusRow}>
            <Icon name="dns" size={20} color={theme.colors.textMuted} />
            <Text variant="body" style={styles.flex}>
              SafeHerAI server
            </Text>
            {server === null ? (
              <Skeleton width={96} height={24} radius={theme.radii.pill} />
            ) : server.kind === 'up' ? (
              <StatusPill label="Connected" tone="success" />
            ) : (
              <Pressable onPress={checkServer} accessibilityRole="button" accessibilityLabel="Server unreachable. Tap to retry">
                <StatusPill label="Unreachable · retry" tone="danger" />
              </Pressable>
            )}
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={enter(2)}>
        <Pressable
          onPress={() => router.push('/map')}
          accessibilityRole="button"
          accessibilityLabel="Safety map. See community reports around you"
          style={({ pressed }) => [styles.mapCard, pressed && styles.pressed]}>
          <View style={styles.mapIcon}>
            <Icon name="map" size={26} color={theme.colors.primary} />
          </View>
          <View style={styles.flex}>
            <Text variant="bodyStrong">Safety map</Text>
            <Text variant="label" color="textMuted">
              See community reports around you
            </Text>
          </View>
          <Icon name="chevron_right" size={24} color={theme.colors.textSubtle} />
        </Pressable>
      </Animated.View>

      <Animated.View entering={enter(3)} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="subheading">Coming to SafeHerAI</Text>
          <StatusPill label="In development" tone="ai" />
        </View>
        <View style={styles.grid}>
          {UPCOMING.map((item) => (
            <View key={item.title} style={styles.tile} accessible accessibilityLabel={`${item.title}, coming soon`}>
              <View style={styles.tileIcon}>
                <Icon name={item.icon} size={24} color={theme.palette.violetLight} />
              </View>
              <Text variant="bodyStrong">{item.title}</Text>
              <Text variant="caption" color="textSubtle">
                Coming soon
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={enter(4)}>
        <Card>
          <View style={styles.statusRow}>
            <Icon name="lightbulb" size={20} color={theme.colors.warning} />
            <Text variant="overline" color="textSubtle">
              SAFETY TIP OF THE DAY
            </Text>
          </View>
          <Text variant="body">{tipForDate(now)}</Text>
        </Card>
      </Animated.View>

      <Animated.View entering={enter(5)} style={styles.emergency} accessible>
        <Icon name="call" size={20} color={theme.colors.emergencyOrange} />
        <Text variant="label" color="textMuted" style={styles.flex}>
          SafeHerAI is not an emergency service. In an emergency in India, call{' '}
          <Text variant="label" color="text" style={styles.bold}>
            112
          </Text>
          .
        </Text>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginTop: theme.spacing.xs },
  flex: { flex: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: 32 },
  section: { gap: theme.spacing.sm },
  mapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 255, 0.35)',
  },
  mapIcon: {
    width: 52,
    height: 52,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
  },
  pressed: { opacity: 0.85 },
  // flexWrap: with large text sizes the pill moves to its own line instead of being cut off.
  sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: 4,
    padding: theme.spacing.md,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    opacity: 0.85,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
    marginBottom: theme.spacing.xs,
  },
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
});
