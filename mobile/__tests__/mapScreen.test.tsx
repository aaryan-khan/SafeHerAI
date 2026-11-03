import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { ApiError } from '@/api/client';
import type { Incident, IncidentPage } from '@/api/incidents';
import { useAuth } from '@/auth/AuthContext';
import MapScreen from '@/app/(tabs)/map';

/**
 * The real map is native code that can't run in tests. This stand-in records the props
 * the screen gives it, so tests can play the part of the map ("finished loading", "marker tapped").
 * What the map actually LOOKS like can only be checked on the phone.
 */
jest.mock('@maplibre/maplibre-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const fake: Record<string, any> = { bounds: [72.8, 19.0, 72.9, 19.1], flyTo: jest.fn() };
  return {
    fake,
    Map: React.forwardRef((props: any, ref: any) => {
      fake.map = props;
      React.useImperativeHandle(ref, () => ({ getBounds: async () => fake.bounds }));
      return React.createElement(View, { testID: 'map' }, props.children);
    }),
    Camera: React.forwardRef((_props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({ flyTo: fake.flyTo }));
      return null;
    }),
    GeoJSONSource: (props: any) => {
      fake.source = props;
      return React.createElement(View, null, props.children);
    },
    Layer: () => null,
    NativeUserLocation: () => React.createElement(View, { testID: 'user-location' }),
  };
});
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));
jest.mock('@/auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

const { fake } = jest.requireMock('@maplibre/maplibre-react-native') as { fake: Record<string, any> };
const location = Location as jest.Mocked<typeof Location>;

function incident(overrides: Partial<Incident> = {}): Incident {
  return {
    id: 'i1',
    category: 'POOR_LIGHTING',
    description: 'DEMO: made-up report for testing the map. Not a real incident.',
    latitude: 19.05,
    longitude: 72.85,
    occurredAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    verificationStatus: 'VERIFIED',
    isDemo: true,
    ...overrides,
  };
}

function withServer(incidentsInArea: jest.Mock) {
  (useAuth as jest.Mock).mockReturnValue({ incidentsInArea });
  return incidentsInArea;
}

/** Pretend the map has finished drawing, which triggers the first load. */
async function mapLoaded() {
  await act(async () => {
    await fake.map.onDidFinishLoadingMap();
  });
}

function permission(granted: boolean, canAskAgain = true) {
  location.getForegroundPermissionsAsync.mockResolvedValue({ granted, canAskAgain } as never);
}

beforeEach(() => {
  jest.clearAllMocks();
  fake.bounds = [72.8, 19.0, 72.9, 19.1];
  permission(false);
});

describe('MapScreen: reports', () => {
  it('loads reports for the visible area and labels demo data clearly', async () => {
    const server = withServer(
      jest.fn().mockResolvedValue({ items: [incident(), incident({ id: 'i2', isDemo: true })], truncated: false }),
    );
    await render(<MapScreen />);
    await mapLoaded();

    expect(server).toHaveBeenCalledWith({ minLon: 72.8, minLat: 19.0, maxLon: 72.9, maxLat: 19.1 });
    expect(screen.getByText('2 reports in this area')).toBeOnTheScreen();
    expect(screen.getByLabelText('Demo data')).toBeOnTheScreen();
    expect(screen.getByText(/made-up DEMO reports/)).toBeOnTheScreen();
    expect(screen.getByText(/Fewer reports doesn't mean an area is safe/)).toBeOnTheScreen();
    expect(fake.source.data.features).toHaveLength(2);
  });

  it('shows no demo warning when there is no demo data', async () => {
    withServer(jest.fn().mockResolvedValue({ items: [incident({ isDemo: false })], truncated: false }));
    await render(<MapScreen />);
    await mapLoaded();

    expect(screen.getByText('1 report in this area')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Demo data')).toBeNull();
  });

  it('asks the user to zoom in instead of calling the server for a huge area', async () => {
    const server = withServer(jest.fn());
    fake.bounds = [68, 8, 97, 37];
    await render(<MapScreen />);
    await mapLoaded();

    expect(screen.getByText('Zoom in to see reports')).toBeOnTheScreen();
    expect(server).not.toHaveBeenCalled();
  });

  it('explains a failed load and can retry', async () => {
    const server = withServer(jest.fn().mockRejectedValueOnce(new ApiError('network')));
    await render(<MapScreen />);
    await mapLoaded();

    const retry = screen.getByRole('button', { name: /Can't reach the SafeHerAI server.*Tap to retry/ });
    server.mockResolvedValueOnce({ items: [], truncated: false });
    await fireEvent.press(retry);
    expect(await screen.findByText('No reports in this area')).toBeOnTheScreen();
  });

  it('ignores an old answer that arrives after a newer one', async () => {
    let answerFirst: (page: IncidentPage) => void = () => {};
    const server = withServer(
      jest
        .fn()
        .mockReturnValueOnce(new Promise((resolve) => (answerFirst = resolve)))
        .mockResolvedValueOnce({ items: [incident({ id: 'new', isDemo: false })], truncated: false }),
    );
    await render(<MapScreen />);
    await act(async () => {
      fake.map.onDidFinishLoadingMap(); // first request: still waiting
    });
    await mapLoaded(); // second request: answered
    await act(async () => answerFirst({ items: [incident({ id: 'old-1' }), incident({ id: 'old-2' })], truncated: false }));

    expect(server).toHaveBeenCalledTimes(2);
    expect(screen.getByText('1 report in this area')).toBeOnTheScreen();
    expect(fake.source.data.features.map((f: { id: string }) => f.id)).toEqual(['new']);
  });

  it('shows details when a marker is tapped, and hides them again', async () => {
    withServer(jest.fn().mockResolvedValue({ items: [incident({ verificationStatus: 'UNVERIFIED' })], truncated: false }));
    await render(<MapScreen />);
    await mapLoaded();

    const stopPropagation = jest.fn();
    await act(async () => fake.source.onPress({ stopPropagation, nativeEvent: { features: [{ properties: { id: 'i1' } }] } }));

    expect(stopPropagation).toHaveBeenCalled();
    expect(screen.getByText('Poor lighting')).toBeOnTheScreen();
    expect(screen.getByText('2 h ago')).toBeOnTheScreen();
    expect(screen.getByLabelText('Unverified')).toBeOnTheScreen();
    expect(screen.getByLabelText('DEMO')).toBeOnTheScreen();
    expect(screen.getByText('Not yet checked by a moderator.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Close details' }));
    expect(screen.queryByText('Poor lighting')).toBeNull();
    expect(screen.getByText(/call/)).toHaveTextContent(/112/);
  });
});

describe('MapScreen: location', () => {
  it('asks for location only when the user taps the button, then centres the map', async () => {
    withServer(jest.fn().mockResolvedValue({ items: [], truncated: false }));
    location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true } as never);
    location.getLastKnownPositionAsync.mockResolvedValue({ coords: { latitude: 19.1, longitude: 72.9 } } as never);
    await render(<MapScreen />);
    await mapLoaded();

    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(screen.queryByTestId('user-location')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Show my location on the map' }));

    expect(location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(fake.flyTo).toHaveBeenCalledWith(expect.objectContaining({ center: [72.9, 19.1] }));
    expect(screen.getByTestId('user-location')).toBeOnTheScreen();
  });

  it('keeps working when location is refused for good, and points to Settings', async () => {
    withServer(jest.fn().mockResolvedValue({ items: [], truncated: false }));
    permission(false, false);
    await render(<MapScreen />);
    await mapLoaded();

    await fireEvent.press(screen.getByRole('button', { name: 'Show my location on the map' }));

    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(screen.getByText(/Location permission is off/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeOnTheScreen();
    expect(screen.getByText('No reports in this area')).toBeOnTheScreen();
  });
});
