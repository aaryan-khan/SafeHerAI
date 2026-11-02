import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

export const colors = {
  primary: '#6a1b9a',
  text: '#1a1a1a',
  muted: '#555',
  error: '#b71c1c',
  errorBg: '#fdecea',
  ok: '#1b5e20',
  okBg: '#e8f5e9',
  border: '#bbb',
  background: '#fff',
};

type TextFieldProps = TextInputProps & { label: string; error?: string; hint?: string };

/** A labelled text box that shows its error underneath and announces it to screen readers. */
export function TextField({ label, error, hint, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor="#888"
        style={[styles.input, error ? styles.inputError : null]}
        {...inputProps}
      />
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? (
        <Text style={styles.fieldError} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  accessibilityHint?: string;
};

export function Button({ title, onPress, loading = false, variant = 'primary', accessibilityHint }: ButtonProps) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: loading, busy: loading }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonSecondary,
        (pressed || loading) && styles.buttonPressed,
      ]}>
      {loading ? (
        <ActivityIndicator color={primary ? '#fff' : colors.primary} />
      ) : (
        <Text style={[styles.buttonText, !primary && styles.buttonTextSecondary]}>{title}</Text>
      )}
    </Pressable>
  );
}

/** A coloured box for messages; errors are announced to screen readers. */
export function Banner({ message, tone }: { message: string; tone: 'error' | 'info' }) {
  return (
    <View
      style={[styles.banner, tone === 'error' ? styles.bannerError : styles.bannerInfo]}
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion="polite">
      <Text style={{ color: tone === 'error' ? colors.error : colors.ok, fontSize: 16 }}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 4 },
  label: { fontSize: 16, fontWeight: '600', color: colors.text },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 17,
    color: colors.text,
    backgroundColor: '#fff',
  },
  inputError: { borderColor: colors.error, borderWidth: 2 },
  hint: { fontSize: 14, color: colors.muted },
  fieldError: { fontSize: 14, color: colors.error },
  button: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: { backgroundColor: '#fff', borderWidth: 2, borderColor: colors.primary },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  buttonTextSecondary: { color: colors.primary },
  banner: { padding: 12, borderRadius: 10 },
  bannerError: { backgroundColor: colors.errorBg },
  bannerInfo: { backgroundColor: colors.okBg },
});
