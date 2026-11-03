import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ApiError } from '@/api/client';
import { checkHealth } from '@/api/health';
import { useAuth } from '@/auth/AuthContext';
import HomeScreen from '@/app/(tabs)/home';
import ProfileScreen from '@/app/(tabs)/profile';
import EditProfileScreen from '@/app/edit-profile';
import { SAFETY_TIPS, greetingFor, tipForDate } from '@/content/safetyTips';
import { validateDisplayName } from '@/validation/authForms';

jest.mock('@/auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/api/health', () => ({ checkHealth: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));

const USER = {
  id: 'u1',
  email: 'priya@example.com',
  displayName: 'Priya Sharma',
  role: 'USER',
  createdAt: '2026-10-28T10:00:00Z',
};

function fakeAuth(overrides: Record<string, unknown> = {}) {
  const auth = {
    state: { status: 'signedIn', user: USER },
    logout: jest.fn().mockResolvedValue(undefined),
    reloadProfile: jest.fn().mockResolvedValue(undefined),
    updateDisplayName: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  (useAuth as jest.Mock).mockReturnValue(auth);
  return auth;
}

beforeEach(() => {
  jest.clearAllMocks();
  (checkHealth as jest.Mock).mockResolvedValue({ kind: 'up' });
});

describe('HomeScreen', () => {
  it('greets the user and shows the real server status', async () => {
    fakeAuth();
    await render(<HomeScreen />);

    expect(screen.getByText('Priya Sharma')).toBeOnTheScreen();
    expect(await screen.findByLabelText('Connected')).toBeOnTheScreen();
    expect(screen.getByLabelText('Signed in')).toBeOnTheScreen();
  });

  it('says honestly when the server cannot be reached, and can retry', async () => {
    (checkHealth as jest.Mock).mockResolvedValue({ kind: 'unreachable' });
    fakeAuth();
    await render(<HomeScreen />);

    const retry = await screen.findByRole('button', { name: 'Server unreachable. Tap to retry' });
    (checkHealth as jest.Mock).mockResolvedValue({ kind: 'up' });
    await fireEvent.press(retry);
    expect(await screen.findByLabelText('Connected')).toBeOnTheScreen();
  });

  it('marks unbuilt features as coming soon, and they cannot be tapped', async () => {
    fakeAuth();
    await render(<HomeScreen />);
    await screen.findByLabelText('Connected');

    expect(screen.getByLabelText('Report incident, coming soon')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Report incident/ })).toBeNull();
    expect(screen.getByText(/In an emergency in India, call/)).toHaveTextContent(/112/);
  });

  it('opens the safety map', async () => {
    fakeAuth();
    await render(<HomeScreen />);
    await screen.findByLabelText('Connected');

    expect(screen.queryByLabelText('Safety map, coming soon')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: /Safety map/ }));
    expect(router.push).toHaveBeenCalledWith('/map');
  });
});

describe('ProfileScreen', () => {
  it('shows the account details', async () => {
    fakeAuth();
    await render(<ProfileScreen />);

    expect(screen.getByText('priya@example.com')).toBeOnTheScreen();
    expect(screen.getByLabelText('Standard account')).toBeOnTheScreen();
  });

  it('opens Edit display name', async () => {
    fakeAuth();
    await render(<ProfileScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /Edit display name/ }));
    expect(router.push).toHaveBeenCalledWith('/edit-profile');
  });

  it('logs out', async () => {
    const auth = fakeAuth();
    await render(<ProfileScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Log out' }));
    expect(auth.logout).toHaveBeenCalled();
  });

  it('shows an error if refreshing fails', async () => {
    fakeAuth({ reloadProfile: jest.fn().mockRejectedValue(new ApiError('network')) });
    await render(<ProfileScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /Refresh profile/ }));
    expect(await screen.findByText(/Can't reach the SafeHerAI server/)).toBeOnTheScreen();
  });
});

describe('EditProfileScreen', () => {
  it('starts with the current name and Save disabled until it changes', async () => {
    fakeAuth();
    await render(<EditProfileScreen />);

    expect(screen.getByLabelText('Display name').props.value).toBe('Priya Sharma');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('saves a valid new name and goes back', async () => {
    const auth = fakeAuth();
    await render(<EditProfileScreen />);
    await fireEvent.changeText(screen.getByLabelText('Display name'), 'Priya S.');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(auth.updateDisplayName).toHaveBeenCalledWith('Priya S.');
    expect(router.back).toHaveBeenCalled();
  });

  it('blocks names with HTML characters without calling the server', async () => {
    const auth = fakeAuth();
    await render(<EditProfileScreen />);
    await fireEvent.changeText(screen.getByLabelText('Display name'), '<b>Priya</b>');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText("Use only letters, numbers, spaces and . ' _ -")).toBeOnTheScreen();
    expect(auth.updateDisplayName).not.toHaveBeenCalled();
  });

  it('stays on the screen and explains when saving fails', async () => {
    fakeAuth({ updateDisplayName: jest.fn().mockRejectedValue(new ApiError('timeout')) });
    await render(<EditProfileScreen />);
    await fireEvent.changeText(screen.getByLabelText('Display name'), 'Priya S.');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText(/took too long/)).toBeOnTheScreen();
    expect(router.back).not.toHaveBeenCalled();
  });
});

describe('home content helpers', () => {
  it('greets by time of day', () => {
    expect(greetingFor(new Date(2026, 0, 1, 8))).toBe('Good morning');
    expect(greetingFor(new Date(2026, 0, 1, 14))).toBe('Good afternoon');
    expect(greetingFor(new Date(2026, 0, 1, 21))).toBe('Good evening');
    expect(greetingFor(new Date(2026, 0, 1, 2))).toBe('Good evening');
  });

  it('shows the same tip all day and a different one the next day', () => {
    const morning = tipForDate(new Date(2026, 5, 10, 7));
    expect(tipForDate(new Date(2026, 5, 10, 22))).toBe(morning);
    expect(tipForDate(new Date(2026, 5, 11, 7))).not.toBe(morning);
    expect(SAFETY_TIPS).toContain(morning);
  });

  it('validateDisplayName uses the same rules as registration', () => {
    expect(validateDisplayName('Priya S.')).toBeUndefined();
    expect(validateDisplayName('   ')).toBe('Please enter a display name.');
    expect(validateDisplayName('x'.repeat(51))).toContain('at most 50');
  });
});
