import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { colors, layout, radii } from './theme';

/**
 * A round "back" button for screens without a navigation header.
 * If there is nowhere to go back to (e.g. the app was opened straight onto this screen),
 * it goes to the welcome screen instead.
 */
export function BackButton({ label = 'Go back' }: { label?: string }) {
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Icon name="arrow_back" size={22} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.6 },
});
