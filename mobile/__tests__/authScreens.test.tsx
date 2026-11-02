import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import LoginScreen from '@/app/login';
import RegisterScreen from '@/app/register';
import WelcomeScreen from '@/app/index';
import { passwordStrength } from '@/validation/authForms';

// The screens talk to the real AuthContext and router in the app.
// Here both are replaced by simple fakes so each screen can be tested on its own.
jest.mock('@/auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));

const mockedUseAuth = useAuth as jest.Mock;

function fakeAuth(overrides: Record<string, unknown> = {}) {
  const auth = {
    state: { status: 'signedOut' },
    login: jest.fn().mockResolvedValue(undefined),
    register: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  mockedUseAuth.mockReturnValue(auth);
  return auth;
}

beforeEach(() => jest.clearAllMocks());

describe('LoginScreen', () => {
  it('shows field errors and does not call the server when fields are empty', async () => {
    const auth = fakeAuth();
    await render(<LoginScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));

    expect(screen.getByText('Please enter your email.')).toBeOnTheScreen();
    expect(screen.getByText('Please enter your password.')).toBeOnTheScreen();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('logs in with what the user typed', async () => {
    const auth = fakeAuth();
    await render(<LoginScreen />);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'priya@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'my-secret-password');
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));

    expect(auth.login).toHaveBeenCalledWith('priya@example.com', 'my-secret-password');
  });

  it('shows one clear message for a wrong password and clears the password box', async () => {
    fakeAuth({ login: jest.fn().mockRejectedValue(new ApiError('http', 401, 'Unauthorized', 'Invalid email or password.')) });
    await render(<LoginScreen />);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'priya@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'wrong-password');
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Invalid email or password.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Password').props.value).toBe('');
  });

  it('explains when the server cannot be reached', async () => {
    fakeAuth({ login: jest.fn().mockRejectedValue(new ApiError('network')) });
    await render(<LoginScreen />);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'priya@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'my-secret-password');
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText(/Can't reach the SafeHerAI server/)).toBeOnTheScreen();
  });
});

describe('RegisterScreen', () => {
  it('shows the password length meter and blocks a too-short password', async () => {
    const auth = fakeAuth();
    await render(<RegisterScreen />);
    await fireEvent.changeText(screen.getByLabelText('Display name'), 'Priya');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'priya@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'short');

    expect(screen.getByText('Too short (5/12)')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Password must be at least 12 characters.')).toBeOnTheScreen();
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('shows problems found by the server next to the right field', async () => {
    fakeAuth({
      register: jest
        .fn()
        .mockRejectedValue(new ApiError('http', 400, 'Validation failed', undefined, { email: 'must be a well-formed email address' })),
    });
    await render(<RegisterScreen />);
    await fireEvent.changeText(screen.getByLabelText('Display name'), 'Priya');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'priya@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'a-long-enough-password');
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('must be a well-formed email address')).toBeOnTheScreen();
    expect(screen.getByText('Please check the highlighted fields.')).toBeOnTheScreen();
  });
});

describe('WelcomeScreen', () => {
  it('shows the emergency number, marks future features as in development, and navigates', async () => {
    fakeAuth({ state: { status: 'signedOut', notice: 'You have been logged out.' } });
    await render(<WelcomeScreen />);

    expect(screen.getByText(/call/)).toHaveTextContent(/112/);
    expect(screen.getByLabelText('In development')).toBeOnTheScreen();
    expect(screen.getByText('You have been logged out.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    expect(router.push).toHaveBeenCalledWith('/register');
  });
});

describe('passwordStrength', () => {
  it('is based on length only and says so honestly', () => {
    expect(passwordStrength('short')).toEqual({ level: 0, label: 'Too short (5/12)' });
    expect(passwordStrength('x'.repeat(12)).label).toBe('Okay');
    expect(passwordStrength('x'.repeat(16)).label).toBe('Good');
    expect(passwordStrength('x'.repeat(20)).label).toBe('Strong');
  });
});
