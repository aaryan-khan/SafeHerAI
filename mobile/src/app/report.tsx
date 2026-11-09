import { Camera, Map as MapView, NativeUserLocation, type CameraRef, type MapRef } from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { ApiError, describeApiError } from '@/api/client';
import {
  DESCRIPTION_MAX,
  WHEN_OPTIONS,
  occurredAtFor,
  type IncidentCategory,
  type WhenKey,
} from '@/api/incidents';
import { useAuth } from '@/auth/AuthContext';
import { CATEGORY, CATEGORY_ORDER } from '@/map/categories';
import { DEFAULT_CENTER, MAP_STYLE_URL } from '@/map/mapData';
import { BackButton, Banner, Button, Icon, Screen, Text, TextField, theme } from '@/ui';

/** Indoors a GPS fix can take a long time; after this we fall back to the last known position. */
const LOCATE_TIMEOUT_MS = 15_000;

/** Reads ?lat=..&lon=.. (sent by the Map tab), or null if missing or not numbers. */
function startFromParams(lat?: string, lon?: string): [number, number] | null {
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!lat || !lon || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return [longitude, latitude];
}

export default function ReportScreen() {
  const params = useLocalSearchParams<{ lat?: string; lon?: string }>();
  const fromMap = startFromParams(params.lat, params.lon);
  const { reportIncident } = useAuth();
  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);

  const [category, setCategory] = useState<IncidentCategory | null>(null);
  const [when, setWhen] = useState<WhenKey>('now');
  const [description, setDescription] = useState('');
  const [categoryError, setCategoryError] = useState<string | undefined>();
  const [detailsError, setDetailsError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // While a finger is on the small map, the page must not scroll, or the map can't be moved.
  const [pageScrolls, setPageScrolls] = useState(true);
  const detailsRequired = category === 'OTHER';
  // "Use my current location"
  const [locating, setLocating] = useState(false);
  const [showUserDot, setShowUserDot] = useState(false);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [locationBlocked, setLocationBlocked] = useState(false);

  // Opened from Home (no position given): start at the user's last known position, if allowed.
  useEffect(() => {
    if (fromMap) return;
    let active = true;
    (async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted) return;
        const position = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 });
        if (active && position) {
          cameraRef.current?.jumpTo({ center: [position.coords.longitude, position.coords.latitude], zoom: 16 });
        }
      } catch {
        // No position: the map simply starts at the default place, and the user moves it.
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Moves the pin to where the phone is now. Asks for permission the first time. */
  async function goToMyLocation() {
    setLocationNote(null);
    setLocating(true);
    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted && permission.canAskAgain) {
        permission = await Location.requestForegroundPermissionsAsync();
      }
      if (!permission.granted) {
        setLocationBlocked(!permission.canAskAgain);
        setLocationNote(
          permission.canAskAgain
            ? 'Location was not allowed. You can still move the map by hand.'
            : 'Location permission is off for SafeHerAI. Turn it on in Settings, or move the map by hand.',
        );
        return;
      }
      const position =
        (await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).catch(() => null),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), LOCATE_TIMEOUT_MS)),
        ])) ?? (await Location.getLastKnownPositionAsync());
      if (!position) throw new Error('no position');

      cameraRef.current?.flyTo({ center: [position.coords.longitude, position.coords.latitude], zoom: 17, duration: 700 });
      setShowUserDot(true);
      const accuracy = position.coords.accuracy;
      setLocationNote(
        accuracy
          ? `Pin moved to your location (accurate to about ${Math.round(accuracy)} m). Move the map if it's not quite right.`
          : "Pin moved to your location. Move the map if it's not quite right.",
      );
    } catch {
      setLocationNote("Couldn't find your location. Check that location is turned on, or move the map by hand.");
    } finally {
      setLocating(false);
    }
  }

  async function onSend() {
    setFormError(null);
    if (!category) {
      setCategoryError('Choose what happened.');
      return;
    }
    if (detailsRequired && !description.trim()) {
      setDetailsError('Please describe what happened.');
      return;
    }
    setSending(true);
    try {
      const [longitude, latitude] = (await mapRef.current?.getCenter()) ?? fromMap ?? DEFAULT_CENTER;
      const text = description.trim();
      await reportIncident({
        category,
        ...(text ? { description: text } : {}),
        latitude,
        longitude,
        occurredAt: occurredAtFor(when),
      });
      setSent(true);
    } catch (error) {
      // The server explains its report limit better than our generic "too many attempts".
      const limitReached = error instanceof ApiError && error.status === 429 && error.detail;
      setFormError(limitReached ? (error.detail as string) : describeApiError(error));
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <Screen centered>
        <Animated.View entering={FadeIn.duration(theme.motion.slow)} style={styles.done}>
          <View style={styles.doneIcon}>
            <Icon name="check_circle" size={44} color={theme.colors.success} />
          </View>
          <Text variant="title" align="center" accessibilityRole="header">
            Report sent
          </Text>
          <Text variant="body" color="textMuted" align="center">
            Thank you. It is on the map now, marked Unverified.
            {description.trim() ? ' Your details will show to others after a moderator has checked them.' : ''}
          </Text>
          <Text variant="caption" color="textSubtle" align="center">
            Nobody has been alerted. In an emergency in India, call 112.
          </Text>
          <View style={styles.doneActions}>
            <Button title="Back to the map" icon="map" onPress={() => router.back()} />
            <Button title="See my reports" variant="secondary" onPress={() => router.replace('/my-reports')} />
          </View>
        </Animated.View>
      </Screen>
    );
  }

  return (
    <Screen scrollEnabled={pageScrolls}>
      <BackButton />
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header">
          Report an incident
        </Text>
        <Text variant="body" color="textMuted">
          Help others know what to watch out for. Other users never see who sent a report.
        </Text>
      </View>

      <Banner
        tone="warning"
        title="In danger right now?"
        message="Call 112. Sending a report does not alert the police or anyone else."
      />

      {/* ---------- Where ---------- */}
      <Animated.View entering={FadeInDown.duration(theme.motion.slow)} style={styles.section}>
        <Text variant="subheading">Where</Text>
        <View
          style={styles.mapBox}
          onTouchStart={() => setPageScrolls(false)}
          onTouchEnd={() => setPageScrolls(true)}
          onTouchCancel={() => setPageScrolls(true)}
          testID="report-map">
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            mapStyle={MAP_STYLE_URL}
            touchRotate={false}
            touchPitch={false}
            compass={false}
            logo={false}
            attributionPosition={{ bottom: 6, left: 6 }}
            // Safety net: if Android swallows the "finger lifted" event, scrolling still comes back.
            onRegionDidChange={() => setPageScrolls(true)}>
            <Camera ref={cameraRef} initialViewState={{ center: fromMap ?? DEFAULT_CENTER, zoom: fromMap ? 16 : 12 }} />
            {showUserDot ? <NativeUserLocation /> : null}
          </MapView>
          {/* The pin stays in the middle; the user moves the map underneath it. */}
          <View style={styles.pin} pointerEvents="none">
            <Icon name="location_on" size={44} color={theme.colors.accent} />
          </View>
        </View>
        <Button
          title="Use my current location"
          variant="secondary"
          icon="my_location"
          onPress={goToMyLocation}
          loading={locating}
        />
        {locationNote ? (
          <View style={styles.locationNote} accessibilityLiveRegion="polite">
            <Text variant="caption" color="textMuted" style={styles.flex}>
              {locationNote}
            </Text>
            {locationBlocked ? (
              <Pressable onPress={() => Linking.openSettings()} accessibilityRole="button" hitSlop={8}>
                <Text variant="label" color="primary">
                  Settings
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        <Text variant="caption" color="textMuted">
          Move the map so the pin is on the spot. Others will see this place to within about 100 metres.
        </Text>
      </Animated.View>

      {/* ---------- What ---------- */}
      <View style={styles.section}>
        <Text variant="subheading">What happened</Text>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {CATEGORY_ORDER.map((key) => {
            const meta = CATEGORY[key];
            const selected = category === key;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  setCategory(key);
                  setCategoryError(undefined);
                  setDetailsError(undefined);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={meta.label}
                style={[styles.chip, selected && { borderColor: meta.color, backgroundColor: `${meta.color}22` }]}>
                <Icon name={meta.icon} size={20} color={selected ? meta.color : theme.colors.textMuted} />
                <Text variant="label" color={selected ? 'text' : 'textMuted'}>
                  {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {categoryError ? (
          <Text variant="caption" color="danger" accessibilityLiveRegion="assertive">
            {categoryError}
          </Text>
        ) : null}
      </View>

      {/* ---------- When ---------- */}
      <View style={styles.section}>
        <Text variant="subheading">When</Text>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {WHEN_OPTIONS.map((option) => {
            const selected = when === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => setWhen(option.key)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={option.label}
                style={[styles.chip, selected && styles.chipSelected]}>
                <Text variant="label" color={selected ? 'text' : 'textMuted'}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ---------- Details ---------- */}
      <View style={styles.section}>
        <TextField
          label={detailsRequired ? 'What happened? (required for "Other")' : 'Details (optional)'}
          value={description}
          onChangeText={(value) => {
            setDescription(value);
            if (detailsError) setDetailsError(undefined);
          }}
          multiline
          maxLength={DESCRIPTION_MAX}
          error={detailsError}
          placeholder={
            detailsRequired
              ? 'Describe what happened, in a few words.'
              : 'What should others know? For example: the street lights are off after 9 pm.'
          }
          hint={`${description.trim().length}/${DESCRIPTION_MAX} characters. A moderator reads this before others can see it.`}
        />
        <Text variant="caption" color="textSubtle">
          Please don't include names, phone numbers, addresses or photos of people.
        </Text>
      </View>

      {formError ? <Banner tone="error" message={formError} /> : null}

      <View style={styles.footer}>
        <Button title="Send report" icon="send" onPress={onSend} loading={sending} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: theme.spacing.xs, marginTop: theme.spacing.md },
  section: { gap: theme.spacing.sm },
  mapBox: {
    height: 220,
    borderRadius: theme.radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  // The bottom tip of the pin icon marks the centre of the map.
  pin: { position: 'absolute', left: '50%', top: '50%', marginLeft: -22, marginTop: -40 },
  flex: { flex: 1 },
  locationNote: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    minHeight: theme.layout.minTouchTarget,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.pill,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceGlass,
  },
  chipSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
  footer: { marginTop: theme.spacing.xs, marginBottom: theme.spacing.lg },
  done: { alignItems: 'center', gap: theme.spacing.sm },
  doneIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.successSoft,
    marginBottom: theme.spacing.xs,
  },
  doneActions: { alignSelf: 'stretch', gap: theme.spacing.sm, marginTop: theme.spacing.md },
});
