import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { colors, gradients, layout, motion, radii, shadows, spacing } from './theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  /** Read by screen readers after the title, e.g. "Opens the registration form". */
  accessibilityHint?: string;
  testID?: string;
};

/**
 * The app's button. Shrinks slightly and gives a light vibration when pressed
 * (no shrinking if the phone's "reduce motion" setting is on).
 * - primary: violet gradient, the main action on a screen (use one per screen)
 * - secondary: outlined, for other actions
 * - ghost: text only, for low-emphasis actions
 * - danger: red-to-orange gradient, reserved for emergency actions (SOS)
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const inactive = loading || disabled;

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      // Haptics are a nice extra; ignore phones without a vibration motor.
    });
    onPress();
  }

  const textColor = variant === 'secondary' || variant === 'ghost' ? colors.text : colors.textOnPrimary;

  const content = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={20} color={textColor} /> : null}
          <Text variant="bodyStrong" style={{ color: textColor }}>
            {title}
          </Text>
        </>
      )}
    </View>
  );

  return (
    <Animated.View style={[animatedStyle, inactive && styles.inactive]}>
      <Pressable
        testID={testID}
        onPress={handlePress}
        disabled={inactive}
        onPressIn={() => {
          if (!reduceMotion) scale.value = withTiming(motion.pressScale, { duration: motion.fast });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: motion.fast });
        }}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: inactive, busy: loading }}
        style={[styles.base, variantStyles[variant]]}>
        {variant === 'primary' || variant === 'danger' ? (
          <LinearGradient
            colors={variant === 'primary' ? gradients.primary : gradients.emergency}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, styles.gradient]}
          />
        ) : null}
        {content}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gradient: { borderRadius: radii.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, minHeight: layout.minTouchTarget },
  inactive: { opacity: 0.55 },
});

const variantStyles = StyleSheet.create({
  primary: { ...shadows.glow },
  secondary: { backgroundColor: colors.surfaceGlass, borderWidth: 1, borderColor: colors.borderStrong },
  ghost: { backgroundColor: 'transparent' },
  danger: {},
});
