import { StyleSheet, View } from 'react-native';
import { passwordStrength } from '@/validation/authForms';
import { Text } from './Text';
import { colors, spacing } from './theme';

const levelColors = [colors.danger, colors.warning, colors.info, colors.success];

/** Four bars that fill up as the password gets longer, with a plain-language label. */
export function PasswordMeter({ password }: { password: string }) {
  if (!password) return null;
  const { level, label } = passwordStrength(password);
  const color = levelColors[level];

  return (
    <View style={styles.row} accessible accessibilityLabel={`Password length: ${label}`}>
      <View style={styles.bars}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.bar, { backgroundColor: i <= level ? color : colors.surfaceRaised }]} />
        ))}
      </View>
      <Text variant="caption" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bars: { flex: 1, flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
});
