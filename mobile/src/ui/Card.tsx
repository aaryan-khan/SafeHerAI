import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, gradients, radii, shadows, spacing } from './theme';

type CardProps = {
  children: ReactNode;
  /**
   * - default: solid surface, for most content
   * - glass: translucent, for content over gradients (used sparingly)
   * - ai: subtle violet glow, ONLY for AI-generated content
   */
  variant?: 'default' | 'glass' | 'ai';
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Card({ children, variant = 'default', style, testID }: CardProps) {
  return (
    <View testID={testID} style={[styles.base, variantStyles[variant], style]}>
      {variant === 'ai' ? (
        <LinearGradient
          colors={[`${gradients.ai[0]}33`, `${gradients.ai[1]}14`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.radius]}
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm, borderWidth: 1, overflow: 'hidden' },
  radius: { borderRadius: radii.lg },
});

const variantStyles = StyleSheet.create({
  default: { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.card },
  glass: { backgroundColor: colors.surfaceGlass, borderColor: colors.border },
  ai: { backgroundColor: colors.surface, borderColor: 'rgba(167, 139, 250, 0.35)' },
});
