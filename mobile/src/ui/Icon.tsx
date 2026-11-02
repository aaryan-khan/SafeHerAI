import { SymbolView, type AndroidSymbol } from 'expo-symbols';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { colors } from './theme';

export type IconName = AndroidSymbol;

type IconProps = {
  /** A Material Symbols name, e.g. "shield", "lock", "visibility". Browse: fonts.google.com/icons */
  name: IconName;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
};

/**
 * App icons, drawn from Google's Material Symbols font that ships with expo-symbols
 * (works offline, no extra package). Icons are decorative: the surrounding control
 * provides the screen-reader label.
 */
export function Icon({ name, size = 22, color = colors.text, style }: IconProps) {
  return (
    <SymbolView
      name={{ android: name, web: name }}
      size={size}
      tintColor={color}
      style={style}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
