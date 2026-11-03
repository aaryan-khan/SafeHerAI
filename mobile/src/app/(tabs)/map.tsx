import {
  Camera,
  GeoJSONSource,
  Layer,
  Map as MapView,
  NativeUserLocation,
  type CameraRef,
  type MapRef,
  type PressEventWithFeatures,
  type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View, type NativeSyntheticEvent } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { describeApiError } from '@/api/client';
import { areaFromBounds, isAreaTooLarge, type Incident } from '@/api/incidents';
import { useAuth } from '@/auth/AuthContext';
import { CATEGORY, CATEGORY_ORDER } from '@/map/categories';
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  MAP_STYLE_URL,
  reportCountLabel,
  timeAgo,
  toFeatureCollection,
} from '@/map/mapData';
import { EmptyState, Icon, StatusPill, Text, theme, type IconName } from '@/ui';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; truncated: boolean }
  | { kind: 'zoomIn' }
  | { kind: 'error'; message: string };

/** granted: we may show the user's position. ask: we may ask. denied: only Android Settings can change it. */
type LocationPermission = 'checking' | 'granted' | 'ask' | 'denied';

/** Wait this long after the map stops moving before loading, so one swipe = one request. */
const LOAD_DELAY_MS = 350;

export default function MapScreen() {
  const { incidentsInArea } = useAuth();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);
  const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRequest = useRef(0);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [load, setLoad] = useState<LoadState>({ kind: 'loading' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [permission, setPermission] = useState<LocationPermission>('checking');
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  const selected = incidents.find((incident) => incident.id === selectedId) ?? null;
  const hasDemo = incidents.some((incident) => incident.isDemo);
  const features = useMemo(() => toFeatureCollection(incidents), [incidents]);

  // ---------- Loading incidents for the visible area ----------

  const loadBounds = useCallback(
    async (bounds: readonly number[]) => {
      const area = areaFromBounds(bounds);
      if (isAreaTooLarge(area)) {
        setLoad({ kind: 'zoomIn' });
        return;
      }
      const request = ++latestRequest.current;
      setLoad({ kind: 'loading' });
      try {
        const page = await incidentsInArea(area);
        if (request !== latestRequest.current) return; // the user has moved on; ignore old answers
        setIncidents(page.items);
        setLoad({ kind: 'ready', truncated: page.truncated });
      } catch (error) {
        if (request !== latestRequest.current) return;
        setLoad({ kind: 'error', message: describeApiError(error) });
      }
    },
    [incidentsInArea],
  );

  const reloadVisibleArea = useCallback(async () => {
    const bounds = await mapRef.current?.getBounds();
    if (bounds) await loadBounds(bounds);
  }, [loadBounds]);

  function onRegionDidChange(event: NativeSyntheticEvent<ViewStateChangeEvent>) {
    const { bounds } = event.nativeEvent;
    if (loadTimer.current) clearTimeout(loadTimer.current);
    loadTimer.current = setTimeout(() => loadBounds(bounds), LOAD_DELAY_MS);
  }

  useEffect(
    () => () => {
      if (loadTimer.current) clearTimeout(loadTimer.current);
    },
    [],
  );

  // ---------- The user's location (only while the app is open) ----------

  const centerOnUser = useCallback(async () => {
    setLocationNote(null);
    try {
      const position =
        (await Location.getLastKnownPositionAsync({ maxAge: 60_000 })) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      cameraRef.current?.flyTo({
        center: [position.coords.longitude, position.coords.latitude],
        zoom: 14,
        duration: 900,
      });
    } catch {
      setLocationNote("Couldn't get your location. Check that location is turned on in your phone's settings.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    Location.getForegroundPermissionsAsync()
      .then((result) => {
        if (!active) return;
        if (result.granted) {
          setPermission('granted');
          centerOnUser();
        } else {
          setPermission(result.canAskAgain ? 'ask' : 'denied');
        }
      })
      .catch(() => active && setPermission('ask'));
    return () => {
      active = false;
    };
  }, [centerOnUser]);

  async function onLocationButton() {
    if (permission === 'granted') {
      await centerOnUser();
      return;
    }
    if (permission === 'denied') {
      setLocationNote('Location permission is off for SafeHerAI. You can turn it on in Settings.');
      return;
    }
    const result = await Location.requestForegroundPermissionsAsync();
    if (result.granted) {
      setPermission('granted');
      await centerOnUser();
    } else {
      setPermission(result.canAskAgain ? 'ask' : 'denied');
      setLocationNote('No problem. The map works without your location; you can move it by hand.');
    }
  }

  // ---------- Tapping markers ----------

  function onMarkerPress(event: NativeSyntheticEvent<PressEventWithFeatures>) {
    event.stopPropagation(); // don't also count as a tap on the empty map
    const id = event.nativeEvent.features[0]?.properties?.id;
    if (typeof id === 'string') setSelectedId(id);
  }

  if (mapFailed) {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top }]}>
        <EmptyState
          icon="map"
          title="The map couldn't load"
          message="The map needs an internet connection to download street data. Check your connection and try again."
          actionLabel="Try again"
          onAction={() => setMapFailed(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        mapStyle={MAP_STYLE_URL}
        touchRotate={false}
        touchPitch={false}
        compass={false}
        logo={false}
        attributionPosition={{ bottom: 8, left: 8 }}
        onPress={() => setSelectedId(null)}
        onRegionDidChange={onRegionDidChange}
        onDidFinishLoadingMap={reloadVisibleArea}
        onDidFailLoadingMap={() => setMapFailed(true)}>
        <Camera ref={cameraRef} initialViewState={{ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM }} />
        {permission === 'granted' ? <NativeUserLocation /> : null}
        <GeoJSONSource id="incidents" data={features} onPress={onMarkerPress}>
          {/* A soft ring under the selected incident. Listed first so it is drawn underneath. */}
          <Layer
            id="incident-selected"
            type="circle"
            filter={['==', ['get', 'id'], selectedId ?? '']}
            paint={{
              'circle-radius': 18,
              'circle-color': 'rgba(255, 255, 255, 0.16)',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#FFFFFF',
            }}
          />
          <Layer
            id="incident-points"
            type="circle"
            paint={{
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 5, 15, 9],
              // Each point's colour comes from its category (see src/map/categories.ts).
              'circle-color': [
                'match',
                ['get', 'category'],
                'HARASSMENT', CATEGORY.HARASSMENT.color,
                'STALKING', CATEGORY.STALKING.color,
                'POOR_LIGHTING', CATEGORY.POOR_LIGHTING.color,
                'UNSAFE_CROWD', CATEGORY.UNSAFE_CROWD.color,
                CATEGORY.OTHER.color,
              ],
              // Verified reports get a solid white ring; unverified ones a faint ring.
              'circle-stroke-width': ['case', ['get', 'verified'], 2.5, 1.5],
              'circle-stroke-color': ['case', ['get', 'verified'], '#FFFFFF', 'rgba(255, 255, 255, 0.4)'],
              'circle-opacity': ['case', ['get', 'verified'], 1, 0.8],
            }}
          />
        </GeoJSONSource>
      </MapView>

      {/* ---------- Top panel: title, status, honesty notes ---------- */}
      <View style={[styles.topPanel, { top: insets.top + theme.spacing.xs }]}>
        <View style={styles.titleRow}>
          <Text variant="subheading" accessibilityRole="header" style={styles.flex}>
            Safety map
          </Text>
          {hasDemo ? <StatusPill label="Demo data" tone="warning" /> : null}
          <Pressable
            onPress={() => setShowLegend((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={showLegend ? 'Hide legend' : 'Show legend'}
            hitSlop={8}
            style={styles.iconButtonSmall}>
            <Icon name={showLegend ? 'close' : 'info'} size={20} color={theme.colors.textMuted} />
          </Pressable>
        </View>

        <StatusLine load={load} count={incidents.length} onRetry={reloadVisibleArea} />

        {hasDemo ? (
          <Text variant="caption" color="warning">
            These are made-up DEMO reports for testing. They are not real incidents.
          </Text>
        ) : null}
        <Text variant="caption" color="textSubtle">
          Reports come from the community. Fewer reports doesn't mean an area is safe.
        </Text>

        {showLegend ? <Legend /> : null}
      </View>

      {/* ---------- Bottom: location button, then the selected incident or the 112 note ---------- */}
      <View style={styles.bottomArea} pointerEvents="box-none">
        <View style={styles.fabRow} pointerEvents="box-none">
          <RoundButton
            icon={permission === 'granted' ? 'my_location' : 'location_searching'}
            label={permission === 'granted' ? 'Center the map on my location' : 'Show my location on the map'}
            onPress={onLocationButton}
          />
        </View>

        {locationNote ? (
          <View style={styles.note} accessibilityLiveRegion="polite">
            <Text variant="caption" color="textMuted" style={styles.flex}>
              {locationNote}
            </Text>
            {permission === 'denied' ? (
              <Pressable onPress={() => Linking.openSettings()} accessibilityRole="button" hitSlop={8}>
                <Text variant="label" color="primary">
                  Settings
                </Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => setLocationNote(null)} accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={8}>
              <Icon name="close" size={18} color={theme.colors.textSubtle} />
            </Pressable>
          </View>
        ) : null}

        {selected ? (
          <IncidentCard key={selected.id} incident={selected} onClose={() => setSelectedId(null)} />
        ) : (
          <View style={styles.emergency} accessible>
            <Icon name="call" size={18} color={theme.colors.emergencyOrange} />
            <Text variant="caption" color="textMuted">
              In an emergency in India, call <Text variant="caption" color="text" style={styles.bold}>112</Text>.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function StatusLine({ load, count, onRetry }: { load: LoadState; count: number; onRetry: () => void }) {
  if (load.kind === 'error') {
    return (
      <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel={`${load.message} Tap to retry`} style={styles.statusRow}>
        <Icon name="error" size={18} color={theme.colors.danger} />
        <Text variant="label" color="danger" style={styles.flex}>
          {load.message}
        </Text>
        <Text variant="label" color="primary">
          Retry
        </Text>
      </Pressable>
    );
  }
  return (
    <View style={styles.statusRow} accessibilityLiveRegion="polite">
      {load.kind === 'loading' ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
      <Text variant="label" color="textMuted">
        {load.kind === 'loading'
          ? 'Loading reports…'
          : load.kind === 'zoomIn'
            ? 'Zoom in to see reports'
            : reportCountLabel(count, load.truncated)}
      </Text>
    </View>
  );
}

function Legend() {
  return (
    <View style={styles.legend} accessible accessibilityLabel={`Legend. ${CATEGORY_ORDER.map((c) => CATEGORY[c].label).join(', ')}. A white ring means verified.`}>
      {CATEGORY_ORDER.map((key) => (
        <View key={key} style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: CATEGORY[key].color }]} />
          <Text variant="caption" color="textMuted">
            {CATEGORY[key].label}
          </Text>
        </View>
      ))}
      <View style={styles.legendRow}>
        <View style={[styles.dot, styles.dotVerified]} />
        <Text variant="caption" color="textMuted">
          White ring = verified by a moderator
        </Text>
      </View>
    </View>
  );
}

function IncidentCard({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  const meta = CATEGORY[incident.category];
  const verified = incident.verificationStatus === 'VERIFIED';
  return (
    <Animated.View entering={FadeInDown.duration(theme.motion.normal)} exiting={FadeOutDown.duration(theme.motion.fast)} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: `${meta.color}26` }]}>
          <Icon name={meta.icon} size={22} color={meta.color} />
        </View>
        <View style={styles.flex}>
          <Text variant="bodyStrong">{meta.label}</Text>
          <Text variant="caption" color="textSubtle">
            {timeAgo(incident.occurredAt)}
          </Text>
        </View>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close details" hitSlop={10} style={styles.iconButtonSmall}>
          <Icon name="close" size={20} color={theme.colors.textMuted} />
        </Pressable>
      </View>
      <View style={styles.pills}>
        <StatusPill label={verified ? 'Verified' : 'Unverified'} tone={verified ? 'success' : 'neutral'} />
        {incident.isDemo ? <StatusPill label="DEMO" tone="warning" /> : null}
      </View>
      {incident.description ? <Text variant="body">{incident.description}</Text> : null}
      {!verified ? (
        <Text variant="caption" color="textSubtle">
          Not yet checked by a moderator.
        </Text>
      ) : null}
    </Animated.View>
  );
}

function RoundButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}>
      <Icon name={icon} size={24} color={theme.colors.text} />
    </Pressable>
  );
}

const panel = {
  backgroundColor: theme.colors.surfaceOverlay,
  borderColor: theme.colors.border,
  borderWidth: 1,
  borderRadius: theme.radii.lg,
} as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  centered: { justifyContent: 'center', padding: theme.spacing.lg },
  flex: { flex: 1 },
  bold: { fontFamily: theme.fonts.bold },
  topPanel: {
    ...panel,
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    padding: theme.spacing.md,
    gap: theme.spacing.xxs,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, minHeight: 24 },
  iconButtonSmall: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  legend: { marginTop: theme.spacing.xs, gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dotVerified: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#FFFFFF' },
  // Leaves a strip at the very bottom for the map's attribution (i) button.
  bottomArea: { position: 'absolute', left: theme.spacing.md, right: theme.spacing.md, bottom: 40, gap: theme.spacing.xs },
  fabRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  fab: {
    ...panel,
    width: theme.layout.minTouchTarget + 4,
    height: theme.layout.minTouchTarget + 4,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  fabPressed: { opacity: 0.8 },
  note: { ...panel, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.sm },
  card: { ...panel, padding: theme.spacing.md, gap: theme.spacing.xs, ...theme.shadows.card },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  cardIcon: { width: 44, height: 44, borderRadius: theme.radii.md, alignItems: 'center', justifyContent: 'center' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  emergency: {
    ...panel,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
});
