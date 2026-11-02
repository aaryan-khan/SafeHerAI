import { router } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ApiError, describeApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { BackButton, Banner, Button, Icon, PasswordMeter, Screen, Text, TextField, theme } from '@/ui';
import { PASSWORD_MIN, hasErrors, validateRegister, type FieldErrors } from '@/validation/authForms';

type Field = 'email' | 'password' | 'displayName';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
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
    const found = validateRegister({ email, password, displayName });
    setErrors(found);
    if (hasErrors(found)) return;

    setSubmitting(true);
    try {
      await register(email, password, displayName);
      // On success the navigator switches to the home screen automatically.
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
        // The server found a problem the app's checks missed: show it next to the field.
        setErrors(error.fieldErrors as FieldErrors<Field>);
        setFormError('Please check the highlighted fields.');
      } else {
        setFormError(describeApiError(error));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <BackButton />
      <Animated.View entering={FadeInDown.duration(theme.motion.slow)} style={styles.header}>
        <Text variant="title" accessibilityRole="header">
          Create your account
        </Text>
        <Text variant="body" color="textMuted">
          It takes less than a minute.
        </Text>
      </Animated.View>

      {formError ? <Banner tone="error" message={formError} /> : null}

      <Animated.View entering={FadeInDown.duration(theme.motion.slow).delay(80)} style={styles.form}>
        <TextField
          label="Display name"
          icon="person"
          hint="Shown in the app. You don't need to use your real name."
          value={displayName}
          onChangeText={edit('displayName', setDisplayName)}
          error={errors.displayName}
          autoComplete="nickname"
          maxLength={50}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <TextField
          ref={emailRef}
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
        <View style={styles.passwordGroup}>
          <TextField
            ref={passwordRef}
            label="Password"
            icon="lock"
            password
            hint={`At least ${PASSWORD_MIN} characters. A short sentence is easy to remember.`}
            value={password}
            onChangeText={edit('password', setPassword)}
            error={errors.password}
            autoComplete="new-password"
            textContentType="newPassword"
            maxLength={64}
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />
          <PasswordMeter password={password} />
        </View>

        <View style={styles.privacy}>
          <Icon name="shield_lock" size={18} color={theme.colors.success} />
          <Text variant="caption" color="textMuted" style={styles.flex}>
            Your password is stored only as a secure hash, and your email isn't shown to other users.
          </Text>
        </View>

        <Button title="Create account" icon="person_add" onPress={onSubmit} loading={submitting} />
      </Animated.View>

      <View style={styles.footer}>
        <Text variant="label" color="textMuted">
          Already have an account?
        </Text>
        <Button title="Log in" variant="ghost" onPress={() => router.replace('/login')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: theme.spacing.xs, marginTop: theme.spacing.md, marginBottom: theme.spacing.xs },
  form: { gap: theme.spacing.md },
  passwordGroup: { gap: theme.spacing.sm },
  privacy: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' },
  flex: { flex: 1 },
  footer: { alignItems: 'center', marginTop: theme.spacing.md },
});
