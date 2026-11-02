import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ApiError, describeApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { BackButton, Banner, Button, Screen, Text, TextField, theme } from '@/ui';
import { DISPLAY_NAME_MAX, validateDisplayName } from '@/validation/authForms';

export default function EditProfileScreen() {
  const { state, updateDisplayName } = useAuth();
  const current = state.status === 'signedIn' ? state.user.displayName : '';
  const [name, setName] = useState(current);
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const unchanged = name.trim() === current;

  async function onSave() {
    setFormError(null);
    const problem = validateDisplayName(name);
    setError(problem);
    if (problem) return;

    setSaving(true);
    try {
      await updateDisplayName(name);
      router.back();
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors.displayName) {
        setError(e.fieldErrors.displayName);
      } else {
        setFormError(describeApiError(e));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <BackButton />
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header">
          Edit display name
        </Text>
        <Text variant="body" color="textMuted">
          This is how your name appears in SafeHerAI. You don't need to use your real name.
        </Text>
      </View>

      {formError ? <Banner tone="error" message={formError} /> : null}

      <TextField
        label="Display name"
        icon="person"
        value={name}
        onChangeText={(value) => {
          setName(value);
          if (error) setError(undefined);
        }}
        error={error}
        hint={`${name.trim().length}/${DISPLAY_NAME_MAX} characters`}
        maxLength={DISPLAY_NAME_MAX}
        autoComplete="nickname"
        returnKeyType="done"
        onSubmitEditing={onSave}
      />

      <Button title="Save" icon="check" onPress={onSave} loading={saving} disabled={unchanged} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: theme.spacing.xs, marginTop: theme.spacing.md },
});
