import { StyleSheet, View } from 'react-native';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { colors, spacing } from './theme';

type EmptyStateProps = {
  icon: IconName;
  title: string;
  message: string;
  /** 'error' turns this into an error state (red icon). */
  tone?: 'neutral' | 'error';
  actionLabel?: string;
  onAction?: () => void;
};

/** What a screen shows when there is nothing to show yet, or when loading failed. */
export function EmptyState({ icon, title, message, tone = 'neutral', actionLabel, onAction }: EmptyStateProps) {
  const isError = tone === 'error';
  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: isError ? colors.dangerSoft : colors.primarySoft }]}>
        <Icon name={icon} size={32} color={isError ? colors.danger : colors.primary} />
      </View>
      <Text variant="subheading" align="center" accessibilityRole="header">
        {title}
      </Text>
      <Text variant="body" color="textMuted" align="center">
        {message}
      </Text>
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button title={actionLabel} onPress={onAction} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl, paddingHorizontal: spacing.md },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  action: { alignSelf: 'stretch', marginTop: spacing.sm },
});
