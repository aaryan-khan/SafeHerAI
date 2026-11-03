import { act, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import RootLayout from '@/app/_layout';
import TabsLayout from '@/app/(tabs)/_layout';

// The real root and tab layouts, with a fake login state we can switch on and off.
// The screens themselves are simple stand-ins: this test is only about which screen appears.
jest.mock('@/auth/AuthContext', () => {
  const React = require('react');
  const Ctx = React.createContext(null);
  const control: { set?: (state: unknown) => void } = {};
  return {
    control,
    AuthProvider: ({ children }: { children: React.ReactNode }) => {
      const [state, set] = React.useState({ status: 'signedOut' });
      control.set = set;
      return React.createElement(Ctx.Provider, { value: { state, retry: jest.fn() } }, children);
    },
    useAuth: () => React.useContext(Ctx),
  };
});
jest.mock('@/ui/fonts', () => ({ useAppFonts: () => true }));

const { control } = jest.requireMock('@/auth/AuthContext') as { control: { set: (state: unknown) => void } };
const USER = { id: 'u1', email: 'p@example.com', displayName: 'Priya', role: 'USER', createdAt: '2026-01-01T00:00:00Z' };

const routes = {
  _layout: RootLayout,
  index: () => <Text>WELCOME</Text>,
  login: () => <Text>LOGIN</Text>,
  register: () => <Text>REGISTER</Text>,
  connection: () => <Text>CONNECTION</Text>,
  gallery: () => <Text>GALLERY</Text>,
  'edit-profile': () => <Text>EDIT PROFILE</Text>,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/home': () => <Text>HOME</Text>,
  '(tabs)/map': () => <Text>MAP</Text>,
  '(tabs)/profile': () => <Text>PROFILE</Text>,
};

describe('navigation between logged-out and logged-in screens', () => {
  it('goes to Home after logging in, and back to Welcome after logging out', async () => {
    await renderRouter(routes, { initialUrl: '/login' });
    expect(screen.getByText('LOGIN')).toBeOnTheScreen();

    await act(async () => control.set({ status: 'signedIn', user: USER }));
    expect(screen).toHavePathname('/home');
    expect(screen.getByText('HOME')).toBeOnTheScreen();

    await act(async () => control.set({ status: 'signedOut', notice: 'You have been logged out.' }));
    expect(screen).toHavePathname('/');
    expect(screen.getByText('WELCOME')).toBeOnTheScreen();
  });

  it('never shows Home or Profile to a logged-out user', async () => {
    await renderRouter(routes, { initialUrl: '/profile' });
    expect(screen.queryByText('PROFILE')).toBeNull();
    expect(screen.getByText('WELCOME')).toBeOnTheScreen();
  });

  it('never shows the map to a logged-out user', async () => {
    await renderRouter(routes, { initialUrl: '/map' });
    expect(screen.queryByText('MAP')).toBeNull();
    expect(screen.getByText('WELCOME')).toBeOnTheScreen();
  });

  it('shows the offline screen instead of navigation when the server is unreachable', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    await act(async () => control.set({ status: 'offline' }));
    expect(screen.getByText("Can't reach the server")).toBeOnTheScreen();
  });
});
