import { router } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ApiError, describeApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { BackButton, Banner, Button, Screen, Text, TextField, theme } from '@/ui';
import { hasErrors, validateLogin, type FieldErrors } from '@/validation/authForms';

type Field = 'email' | 'password';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  /** Clears a field's error as soon as the user starts fixing it. */
  function edit(field: Field, setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
    };
  }

  async function onSubmit() {
    setFormError(null);
    const found = validateLogin({ email, password });
    setErrors(found);
    if (hasErrors(found)) return;

    setSubmitting(true);
    try {
      await login(email, password);
      // On success the navigator switches to the home screen automatically.
    } catch (error) {
      setFormError(
        error instanceof ApiError && error.status === 401 ? 'Invalid email or password.' : describeApiError(error),
      );
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <BackButton />
      <Animated.View entering={FadeInDown.duration(theme.motion.slow)} style={styles.header}>
        <Text variant="title" accessibilityRole="header">
          Welcome back
        </Text>
        <Text variant="body" color="textMuted">
          Log in to continue to SafeHerAI.
        </Text>
      </Animated.View>

      {formError ? <Banner tone="error" message={formError} /> : null}

      <Animated.View entering={FadeInDown.duration(theme.motion.slow).delay(80)} style={styles.form}>
        <TextField
          label="Email"
          icon="mail"
          value={email}
          onChangeText={edit('email', setEmail)}
          error={errors.email}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          label="Password"
          icon="lock"
          password
          value={password}
          onChangeText={edit('password', setPassword)}
          error={errors.password}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />
        <View style={styles.submit}>
          <Button title="Log in" icon="login" onPress={onSubmit} loading={submitting} />
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <Text variant="label" color="textMuted">
          New to SafeHerAI?
        </Text>
        <Button title="Create an account" variant="ghost" onPress={() => router.replace('/register')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: theme.spacing.xs, marginTop: theme.spacing.md, marginBottom: theme.spacing.xs },
  form: { gap: theme.spacing.md },
  submit: { marginTop: theme.spacing.xs },
  footer: { alignItems: 'center', marginTop: theme.spacing.md },
});
