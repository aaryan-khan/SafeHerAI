import { useState, type ComponentRef, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { colors, fonts, layout, radii, spacing } from './theme';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  icon?: IconName;
  error?: string;
  hint?: string;
  /** Shows a green tick, e.g. when a value has been checked. */
  success?: boolean;
  /** Adds a show/hide button. Use for passwords instead of `secureTextEntry`. */
  password?: boolean;
  /** Lets a screen move focus here, e.g. "Next" on the keyboard jumps to this field. */
  ref?: Ref<ComponentRef<typeof TextInput>>;
};

/**
 * A labelled text box with an optional icon, password visibility toggle, and clear
 * error / hint / success states. Errors are announced to screen readers.
 */
export function TextField({
  label,
  icon,
  error,
  hint,
  success = false,
  password = false,
  onFocus,
  onBlur,
  ref,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={styles.field}>
      <Text variant="label" color="textMuted">
        {label}
      </Text>
      <View style={[styles.box, { borderColor }, focused && styles.boxFocused, inputProps.multiline && styles.boxMultiline]}>
        {icon ? <Icon name={icon} size={20} color={focused ? colors.primary : colors.textSubtle} /> : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={hint}
          placeholderTextColor={colors.textSubtle}
          selectionColor={colors.primary}
          secureTextEntry={password && !revealed}
          autoCorrect={password ? false : inputProps.autoCorrect}
          maxFontSizeMultiplier={1.6}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, inputProps.multiline && styles.inputMultiline]}
          {...inputProps}
        />
        {success && !error ? <Icon name="check_circle" size={20} color={colors.success} /> : null}
        {password ? (
          <Pressable
            onPress={() => setRevealed((r) => !r)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            hitSlop={12}
            style={styles.toggle}>
            <Icon name={revealed ? 'visibility_off' : 'visibility'} size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.messageRow} accessibilityLiveRegion="polite">
          <Icon name="error" size={16} color={colors.danger} />
          <Text variant="caption" style={styles.errorText}>
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text variant="caption" color="textSubtle">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  box: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    backgroundColor: colors.surfaceGlass,
  },
  boxFocused: { backgroundColor: colors.primarySoft },
  boxMultiline: { alignItems: 'flex-start', paddingTop: spacing.xs },
  input: {
    flex: 1,
    minHeight: layout.minTouchTarget,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 16,
    paddingVertical: spacing.sm,
  },
  // Several lines: a taller box, text starting at the top (Android centres it otherwise).
  inputMultiline: { minHeight: 112, textAlignVertical: 'top' },
  toggle: { minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  messageRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorText: { color: colors.danger, flex: 1 },
});
