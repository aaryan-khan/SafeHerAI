import { fireEvent, render, screen } from '@testing-library/react-native';
import { Avatar, Banner, Button, EmptyState, StatusPill, TextField, initialsOf } from '@/ui';

describe('Button', () => {
  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    await render(<Button title="Log in" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('cannot be tapped while loading, and tells screen readers it is busy', async () => {
    const onPress = jest.fn();
    await render(<Button title="Log in" onPress={onPress} loading />);
    const button = screen.getByRole('button', { name: 'Log in' });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeBusy();
    expect(button).toBeDisabled();
  });

  it('cannot be tapped when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button title="Save" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('TextField', () => {
  it('shows the error message', async () => {
    await render(<TextField label="Email" value="x" error="Please enter a valid email address." />);
    expect(screen.getByText('Please enter a valid email address.')).toBeOnTheScreen();
  });

  it('shows the hint when there is no error', async () => {
    await render(<TextField label="Display name" value="" hint="Shown in the app." />);
    expect(screen.getByText('Shown in the app.')).toBeOnTheScreen();
  });

  it('hides the password until "Show password" is pressed', async () => {
    await render(<TextField label="Password" value="secret-password" password />);
    const input = screen.getByLabelText('Password');
    expect(input.props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeOnTheScreen();
  });

  it('reports typing to the screen', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="Email" value="" onChangeText={onChangeText} />);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'priya@example.com');
    expect(onChangeText).toHaveBeenCalledWith('priya@example.com');
  });
});

describe('StatusPill, Banner, EmptyState', () => {
  it('StatusPill is readable by screen readers', async () => {
    await render(<StatusPill label="Unverified" tone="warning" />);
    expect(screen.getByLabelText('Unverified')).toBeOnTheScreen();
  });

  it('error Banner is announced as an alert', async () => {
    await render(<Banner tone="error" message="Can't reach the server." />);
    expect(screen.getByRole('alert')).toBeOnTheScreen();
  });

  it('EmptyState shows its action button and calls it', async () => {
    const onAction = jest.fn();
    await render(
      <EmptyState icon="wifi_off" tone="error" title="Can't load" message="Try again." actionLabel="Try again" onAction={onAction} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onAction).toHaveBeenCalled();
  });
});

describe('Avatar', () => {
  it('makes initials from any name', () => {
    expect(initialsOf('Priya Sharma')).toBe('PS');
    expect(initialsOf('priya')).toBe('P');
    expect(initialsOf('  Anjali  Rao  Kumar ')).toBe('AK');
    expect(initialsOf('प्रिया शर्मा')).toBe('पश');
    expect(initialsOf('   ')).toBe('?');
  });

  it('is labelled for screen readers', async () => {
    await render(<Avatar name="Priya Sharma" />);
    expect(screen.getByLabelText('Avatar for Priya Sharma')).toBeOnTheScreen();
  });
});
