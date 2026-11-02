import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { colors, typography, type TypographyVariant } from './theme';

type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  color?: keyof typeof colors;
  align?: 'left' | 'center' | 'right';
};

/**
 * The only text component screens should use, so typography stays consistent.
 * Text grows with the phone's font-size setting (accessibility), up to 1.6x to keep layouts intact.
 */
export function Text({ variant = 'body', color = 'text', align, style, ...rest }: TextProps) {
  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[typography[variant], { color: colors[color] }, align ? { textAlign: align } : null, style]}
    />
  );
}
