import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { describeApiError } from '@/api/client';
import type { OwnIncident } from '@/api/incidents';
import { useAuth } from '@/auth/AuthContext';
import { CATEGORY } from '@/map/categories';
import { timeAgo } from '@/map/mapData';
import { BackButton, Banner, Button, Card, EmptyState, Icon, Screen, Skeleton, StatusPill, Text, theme } from '@/ui';

type Load = { kind: 'loading' } | { kind: 'ready'; reports: OwnIncident[] } | { kind: 'error'; message: string };

export default function MyReportsScreen() {
  const { myIncidents, deleteIncident } = useAuth();
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoad({ kind: 'loading' });
    try {
      setLoad({ kind: 'ready', reports: await myIncidents() });
    } catch (error) {
      setLoad({ kind: 'error', message: describeApiError(error) });
    }
  }, [myIncidents]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function confirmDelete(report: OwnIncident) {
    Alert.alert(
      'Delete this report?',
      "It will be removed from the map and its text erased. This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => remove(report.id) },
      ],
    );
  }

  async function remove(id: string) {
    setDeleting(id);
    setDeleteError(null);
    try {
      await deleteIncident(id);
      setLoad((current) =>
        current.kind === 'ready' ? { kind: 'ready', reports: current.reports.filter((r) => r.id !== id) } : current,
      );
    } catch (error) {
      setDeleteError(describeApiError(error));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Screen>
      <BackButton />
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header">
          My reports
        </Text>
        <Text variant="body" color="textMuted">
          Only you can see this list. Other users never see who sent a report.
        </Text>
      </View>

      {deleteError ? <Banner tone="error" message={deleteError} /> : null}

      {load.kind === 'loading' ? (
        <View style={styles.list} accessibilityLabel="Loading your reports">
          <Skeleton height={120} radius={theme.radii.lg} />
          <Skeleton height={120} radius={theme.radii.lg} />
        </View>
      ) : load.kind === 'error' ? (
        <EmptyState icon="cloud_off" tone="error" title="Couldn't load your reports" message={load.message} actionLabel="Try again" onAction={refresh} />
      ) : load.reports.length === 0 ? (
        <EmptyState
          icon="add_location_alt"
          title="No reports yet"
          message="When you report something, it appears here so you can check on it or delete it."
          actionLabel="Report an incident"
          onAction={() => router.replace('/report')}
        />
      ) : (
        <View style={styles.list}>
          {load.reports.map((report, index) => (
            <Animated.View key={report.id} entering={FadeInDown.duration(theme.motion.normal).delay(40 * index)} exiting={FadeOut}>
              <ReportCard report={report} deleting={deleting === report.id} onDelete={() => confirmDelete(report)} />
            </Animated.View>
          ))}
          <Text variant="caption" color="textSubtle" align="center">
            You can send up to 5 reports an hour. Deleted reports still count towards this limit.
          </Text>
        </View>
      )}
    </Screen>
  );
}

function ReportCard({ report, deleting, onDelete }: { report: OwnIncident; deleting: boolean; onDelete: () => void }) {
  const meta = CATEGORY[report.category];
  const hidden = report.moderationStatus === 'HIDDEN';
  const verified = report.verificationStatus === 'VERIFIED';
  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: `${meta.color}26` }]}>
          <Icon name={meta.icon} size={22} color={meta.color} />
        </View>
        <View style={styles.flex}>
          <Text variant="bodyStrong">{meta.label}</Text>
          <Text variant="caption" color="textSubtle">
            Sent {timeAgo(report.createdAt)}
          </Text>
        </View>
      </View>

      <View style={styles.pills}>
        {hidden ? (
          <StatusPill label="Hidden by a moderator" tone="danger" />
        ) : (
          <StatusPill label="On the map" tone="info" />
        )}
        <StatusPill label={verified ? 'Verified' : 'Unverified'} tone={verified ? 'success' : 'neutral'} />
      </View>

      {report.description ? (
        <View style={styles.description}>
          <Text variant="body">{report.description}</Text>
          <Text variant="caption" color={report.descriptionApproved ? 'success' : 'textSubtle'}>
            {report.descriptionApproved ? 'Others can see this text.' : 'Waiting for a moderator before others can see this text.'}
          </Text>
        </View>
      ) : null}

      <Button title="Delete report" variant="ghost" icon="delete" onPress={onDelete} loading={deleting} />
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { gap: theme.spacing.xs, marginTop: theme.spacing.md },
  list: { gap: theme.spacing.md },
  flex: { flex: 1 },
  card: { gap: theme.spacing.sm, padding: theme.spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  cardIcon: { width: 44, height: 44, borderRadius: theme.radii.md, alignItems: 'center', justifyContent: 'center' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  description: { gap: 4 },
});
