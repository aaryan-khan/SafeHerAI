import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import ReportScreen from '@/app/report';

/** Stand-in for the native map: getCenter() says where the pin is. Looks can only be checked on the phone. */
jest.mock('@maplibre/maplibre-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const fake: Record<string, any> = { center: [72.9, 19.1], flyTo: jest.fn() };
  return {
    fake,
    Map: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({ getCenter: async () => fake.center }));
      return React.createElement(View, null, props.children);
    }),
    Camera: React.forwardRef((_props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({ jumpTo: jest.fn(), flyTo: fake.flyTo }));
      return null;
    }),
    NativeUserLocation: () => React.createElement(View, { testID: 'user-dot' }),
  };
});
jest.mock('expo-location', () => ({
  Accuracy: { High: 4 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: jest.fn(),
}));
jest.mock('@/auth/AuthContext', () => ({ useAuth: jest.fn() }));

function withServer(reportIncident: jest.Mock) {
  (useAuth as jest.Mock).mockReturnValue({ reportIncident });
  return reportIncident;
}

const location = Location as jest.Mocked<typeof Location>;
const { fake } = jest.requireMock('@maplibre/maplibre-react-native') as { fake: Record<string, any> };

beforeEach(() => {
  jest.clearAllMocks();
  location.getForegroundPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true } as never);
  (useLocalSearchParams as jest.Mock).mockReturnValue({ lat: '19.05', lon: '72.85' });
});

describe('ReportScreen', () => {
  it('reminds the user that a report is not an emergency call', async () => {
    withServer(jest.fn());
    await render(<ReportScreen />);
    expect(screen.getByText(/Sending a report does not alert the police/)).toHaveTextContent(/112/);
  });

  it('asks for a category before sending anything', async () => {
    const server = withServer(jest.fn());
    await render(<ReportScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Send report' }));

    expect(screen.getByText('Choose what happened.')).toBeOnTheScreen();
    expect(server).not.toHaveBeenCalled();
  });

  it('sends the pin position, category, time and trimmed details', async () => {
    const server = withServer(jest.fn().mockResolvedValue({ id: 'n1' }));
    await render(<ReportScreen />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Poor lighting' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'A few hours ago' }));
    await fireEvent.changeText(screen.getByLabelText('Details (optional)'), '  Lights are off after 9 pm  ');
    const before = Date.now();
    await fireEvent.press(screen.getByRole('button', { name: 'Send report' }));

    const sent = server.mock.calls[0][0];
    expect(sent).toMatchObject({ category: 'POOR_LIGHTING', description: 'Lights are off after 9 pm', latitude: 19.1, longitude: 72.9 });
    const hoursAgo = (before - new Date(sent.occurredAt).getTime()) / 3_600_000;
    expect(hoursAgo).toBeGreaterThan(2.9);
    expect(hoursAgo).toBeLessThan(3.1);

    expect(await screen.findByText('Report sent')).toBeOnTheScreen();
    expect(screen.getByText(/details will show to others after a moderator/)).toBeOnTheScreen();
    expect(screen.getByText(/Nobody has been alerted/)).toBeOnTheScreen();
  });

  it('leaves out empty details', async () => {
    const server = withServer(jest.fn().mockResolvedValue({ id: 'n1' }));
    await render(<ReportScreen />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Harassment' }));
    await fireEvent.changeText(screen.getByLabelText('Details (optional)'), '    ');
    await fireEvent.press(screen.getByRole('button', { name: 'Send report' }));

    expect(server.mock.calls[0][0]).not.toHaveProperty('description');
    expect(await screen.findByText('Report sent')).toBeOnTheScreen();
    expect(screen.queryByText(/details will show/)).toBeNull();
  });

  it("shows the server's explanation when the report limit is reached", async () => {
    withServer(
      jest.fn().mockRejectedValue(
        new ApiError('http', 429, 'Too many reports', 'You have sent a lot of reports recently. Please wait a while before sending another.'),
      ),
    );
    await render(<ReportScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Harassment' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Send report' }));

    expect(await screen.findByText(/sent a lot of reports recently/)).toBeOnTheScreen();
    expect(screen.queryByText('Report sent')).toBeNull();
  });

  it('requires details when "Other" is chosen', async () => {
    const server = withServer(jest.fn().mockResolvedValue({ id: 'n1' }));
    await render(<ReportScreen />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Other' }));
    const details = screen.getByLabelText('What happened? (required for "Other")');
    await fireEvent.changeText(details, '   ');
    await fireEvent.press(screen.getByRole('button', { name: 'Send report' }));

    expect(screen.getByText('Please describe what happened.')).toBeOnTheScreen();
    expect(server).not.toHaveBeenCalled();

    await fireEvent.changeText(details, 'A car kept slowing down next to me');
    expect(screen.queryByText('Please describe what happened.')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Send report' }));
    expect(server.mock.calls[0][0]).toMatchObject({ category: 'OTHER', description: 'A car kept slowing down next to me' });
  });

  it('stops the page scrolling while a finger is on the small map', async () => {
    withServer(jest.fn());
    await render(<ReportScreen />);
    const page = screen.getByTestId('screen-scroll');
    const map = screen.getByTestId('report-map');

    expect(page.props.scrollEnabled).toBe(true);
    await fireEvent(map, 'touchStart');
    expect(page.props.scrollEnabled).toBe(false);
    await fireEvent(map, 'touchEnd');
    expect(page.props.scrollEnabled).toBe(true);
  });

  it('moves the pin to the current location, asking permission first', async () => {
    withServer(jest.fn());
    location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true } as never);
    location.getCurrentPositionAsync.mockResolvedValue({ coords: { latitude: 19.12, longitude: 72.84, accuracy: 12.4 } } as never);
    await render(<ReportScreen />);
    expect(screen.queryByTestId('user-dot')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Use my current location' }));

    expect(location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(fake.flyTo).toHaveBeenCalledWith(expect.objectContaining({ center: [72.84, 19.12], zoom: 17 }));
    expect(screen.getByTestId('user-dot')).toBeOnTheScreen();
    expect(screen.getByText(/accurate to about 12 m/)).toBeOnTheScreen();
  });

  it('uses the last known position if a fresh one is not available', async () => {
    withServer(jest.fn());
    location.getForegroundPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true } as never);
    location.getCurrentPositionAsync.mockRejectedValue(new Error('GPS off'));
    location.getLastKnownPositionAsync.mockResolvedValue({ coords: { latitude: 19.2, longitude: 72.9, accuracy: null } } as never);
    await render(<ReportScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Use my current location' }));

    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(fake.flyTo).toHaveBeenCalledWith(expect.objectContaining({ center: [72.9, 19.2] }));
  });

  it('explains when no location can be found', async () => {
    withServer(jest.fn());
    location.getForegroundPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true } as never);
    location.getCurrentPositionAsync.mockRejectedValue(new Error('GPS off'));
    location.getLastKnownPositionAsync.mockResolvedValue(null as never);
    await render(<ReportScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Use my current location' }));

    expect(screen.getByText(/Couldn't find your location/)).toBeOnTheScreen();
    expect(fake.flyTo).not.toHaveBeenCalled();
  });

  it('points to Settings when location was refused for good, and the form still works', async () => {
    const server = withServer(jest.fn().mockResolvedValue({ id: 'n1' }));
    location.getForegroundPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false } as never);
    await render(<ReportScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Use my current location' }));

    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(screen.getByText(/Location permission is off/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'Harassment' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Send report' }));
    expect(server).toHaveBeenCalled();
  });

  it('keeps everything filled in when the connection fails', async () => {
    withServer(jest.fn().mockRejectedValue(new ApiError('network')));
    await render(<ReportScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Unsafe crowd' }));
    await fireEvent.changeText(screen.getByLabelText('Details (optional)'), 'Big crowd at the gate');
    await fireEvent.press(screen.getByRole('button', { name: 'Send report' }));

    expect(await screen.findByText(/Can't reach the SafeHerAI server/)).toBeOnTheScreen();
    expect(screen.getByLabelText('Details (optional)').props.value).toBe('Big crowd at the gate');
    expect(screen.getByRole('radio', { name: 'Unsafe crowd' })).toBeChecked();
  });
});
