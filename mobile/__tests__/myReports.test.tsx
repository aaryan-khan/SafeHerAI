import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ApiError } from '@/api/client';
import type { OwnIncident } from '@/api/incidents';
import { useAuth } from '@/auth/AuthContext';
import MyReportsScreen from '@/app/my-reports';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('@/auth/AuthContext', () => ({ useAuth: jest.fn() }));

function report(overrides: Partial<OwnIncident> = {}): OwnIncident {
  return {
    id: 'r1',
    category: 'STALKING',
    description: 'Someone followed me from the bus stop',
    descriptionApproved: false,
    latitude: 19.076543,
    longitude: 72.877777,
    occurredAt: new Date().toISOString(),
    verificationStatus: 'UNVERIFIED',
    moderationStatus: 'VISIBLE',
    createdAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    ...overrides,
  };
}

function withServer(myIncidents: jest.Mock, deleteIncident = jest.fn().mockResolvedValue(undefined)) {
  (useAuth as jest.Mock).mockReturnValue({ myIncidents, deleteIncident });
  return { myIncidents, deleteIncident };
}

/** Plays the user's answer to the "Delete this report?" dialog. */
function answerDialog(choice: 'Delete' | 'Cancel') {
  const [, , buttons] = (Alert.alert as jest.Mock).mock.calls[0];
  buttons.find((b: { text: string }) => b.text === choice).onPress?.();
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('MyReportsScreen', () => {
  it('shows each report with where it is in moderation', async () => {
    withServer(
      jest.fn().mockResolvedValue([
        report(),
        report({ id: 'r2', category: 'POOR_LIGHTING', description: 'Lights off', descriptionApproved: true, verificationStatus: 'VERIFIED' }),
        report({ id: 'r3', category: 'OTHER', description: null, moderationStatus: 'HIDDEN' }),
      ]),
    );
    await render(<MyReportsScreen />);

    expect(await screen.findByText('Followed or stalked')).toBeOnTheScreen();
    expect(screen.getAllByText('Sent 2 h ago')).toHaveLength(3);
    expect(screen.getByText(/Waiting for a moderator/)).toBeOnTheScreen();
    expect(screen.getByText('Others can see this text.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Hidden by a moderator')).toBeOnTheScreen();
    expect(screen.getByLabelText('Verified')).toBeOnTheScreen();
    expect(screen.getAllByLabelText('On the map')).toHaveLength(2);
  });

  it('explains the empty list and offers to report', async () => {
    withServer(jest.fn().mockResolvedValue([]));
    await render(<MyReportsScreen />);
    expect(await screen.findByText('No reports yet')).toBeOnTheScreen();
  });

  it('deletes only after the user confirms', async () => {
    const { deleteIncident } = withServer(jest.fn().mockResolvedValue([report()]));
    await render(<MyReportsScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Delete report' }));

    answerDialog('Cancel');
    expect(deleteIncident).not.toHaveBeenCalled();

    (Alert.alert as jest.Mock).mockClear();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete report' }));
    await act(async () => answerDialog('Delete'));

    expect(deleteIncident).toHaveBeenCalledWith('r1');
    expect(await screen.findByText('No reports yet')).toBeOnTheScreen();
  });

  it('can try again after a failed load', async () => {
    const { myIncidents } = withServer(jest.fn().mockRejectedValueOnce(new ApiError('timeout')));
    await render(<MyReportsScreen />);
    expect(await screen.findByText("Couldn't load your reports")).toBeOnTheScreen();

    myIncidents.mockResolvedValueOnce([report()]);
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Followed or stalked')).toBeOnTheScreen();
  });
});
