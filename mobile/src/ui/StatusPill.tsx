import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Text } from './Text';
import { colors } from './theme';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'ai';

const toneColors: Record<StatusTone, { fg: string; bg: string }> = {
  success: { fg: colors.success, bg: colors.successSoft },
  warning: { fg: colors.warning, bg: colors.warningSoft },
  danger: { fg: colors.danger, bg: colors.dangerSoft },
  info: { fg: colors.info, bg: colors.infoSoft },
  neutral: { fg: colors.textMuted, bg: colors.surfaceGlass },
  ai: { fg: '#C4B5FD', bg: colors.primarySoft },
};

type StatusPillProps = {
  label: string;
  tone?: StatusTone;
  /** A gently pulsing dot for things happening right now (e.g. "Live", "Sharing location"). */
  live?: boolean;
  /** Where the pill sits when it is inside a column. Default: left. */
  align?: 'start' | 'center';
};

/** A small coloured label such as "Verified", "Unverified", "Offline" or "Live". */
export function StatusPill({ label, tone = 'neutral', live = false, align = 'start' }: StatusPillProps) {
  const { fg, bg } = toneColors[tone];
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (live && !reduceMotion) {
      opacity.value = withRepeat(withTiming(0.3, { duration: 900 }), -1, true);
    }
  }, [live, reduceMotion, opacity]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View
      style={[styles.pill, { backgroundColor: bg, alignSelf: align === 'center' ? 'center' : 'flex-start' }]}
      accessible
      accessibilityLabel={label}>
      <Animated.View style={[styles.dot, { backgroundColor: fg }, dotStyle]} />
      <Text variant="label" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
