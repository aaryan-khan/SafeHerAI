import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { gradients } from './theme';

/** "Priya Sharma" -> "PS", "priya" -> "P", works with any language. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = Array.from(parts[0])[0] ?? '';
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** A round badge with the user's initials. No photos are stored, for privacy. */
export function Avatar({ name, size = 56 }: { name: string; size?: number }) {
  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={`Avatar for ${name}`}>
      <LinearGradient
        colors={gradients.accent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.circle, { borderRadius: size / 2 }]}>
        <Text variant="subheading" style={{ fontSize: size * 0.36, lineHeight: size * 0.44, color: '#fff' }}>
          {initialsOf(name)}
        </Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
