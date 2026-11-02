import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { colors, layout, radii, spacing } from './theme';

type ListItemProps = {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  /** Shown on the right instead of the arrow, e.g. a status pill. */
  right?: React.ReactNode;
  tone?: 'default' | 'danger';
};

/** A tappable row with an icon, used in settings-style lists. */
export function ListItem({ icon, title, subtitle, onPress, right, tone = 'default' }: ListItemProps) {
  const color = tone === 'danger' ? colors.danger : colors.primary;
  const content = (
    <>
      <View style={[styles.iconBox, { backgroundColor: tone === 'danger' ? colors.dangerSoft : colors.primarySoft }]}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <View style={styles.texts}>
        <Text variant="bodyStrong" style={tone === 'danger' ? { color: colors.danger } : undefined}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textMuted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron_right" size={22} color={colors.textSubtle} /> : null)}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.minTouchTarget + 8,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.md,
  },
  pressed: { backgroundColor: colors.surfaceGlass },
  iconBox: { width: 40, height: 40, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
});
