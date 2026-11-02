import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { colors, radii, spacing } from './theme';

type Tone = 'error' | 'success' | 'info' | 'warning';

const toneStyle: Record<Tone, { fg: string; bg: string; icon: IconName }> = {
  error: { fg: colors.danger, bg: colors.dangerSoft, icon: 'error' },
  success: { fg: colors.success, bg: colors.successSoft, icon: 'check_circle' },
  info: { fg: colors.info, bg: colors.infoSoft, icon: 'info' },
  warning: { fg: colors.warning, bg: colors.warningSoft, icon: 'warning' },
};

/** A message box at the top of a form or screen. Errors are announced to screen readers immediately. */
export function Banner({ message, tone = 'info', title }: { message: string; tone?: Tone; title?: string }) {
  const { fg, bg, icon } = toneStyle[tone];
  return (
    <Animated.View entering={FadeInDown.duration(220)}>
      <View
        style={[styles.box, { backgroundColor: bg, borderColor: `${fg}55` }]}
        accessible
        accessibilityRole={tone === 'error' ? 'alert' : undefined}
        accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'}>
        <Icon name={icon} size={20} color={fg} />
        <View style={styles.texts}>
          {title ? (
            <Text variant="bodyStrong" style={{ color: fg }}>
              {title}
            </Text>
          ) : null}
          <Text variant="label" color="text">
            {message}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, borderWidth: 1 },
  texts: { flex: 1, gap: 2 },
});
