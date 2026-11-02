import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { Text } from './Text';
import { palette } from './theme';

/**
 * The SafeHerAI mark: a shield with a soft heart-shaped cut-out, in the violet-to-pink gradient.
 * Drawn as SVG so it stays sharp at any size and needs no image files.
 */
export function LogoMark({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="SafeHerAI logo">
      <Defs>
        <LinearGradient id="shield" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={palette.violet} />
          <Stop offset="0.6" stopColor={palette.purple} />
          <Stop offset="1" stopColor={palette.pink} />
        </LinearGradient>
      </Defs>
      <Path d="M32 4 L54 12 V30 C54 44 44.5 54.5 32 60 C19.5 54.5 10 44 10 30 V12 Z" fill="url(#shield)" />
      <Path
        d="M32 44 C32 44 21 37.2 21 29.6 C21 25.8 23.9 23 27.4 23 C29.4 23 31 24 32 25.6 C33 24 34.6 23 36.6 23 C40.1 23 43 25.8 43 29.6 C43 37.2 32 44 32 44 Z"
        fill="#FFFFFF"
        opacity={0.95}
      />
    </Svg>
  );
}

/** Logo mark plus the "SafeHerAI" wordmark. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessible accessibilityLabel="SafeHerAI">
      <LogoMark size={size} />
      <Text variant="heading" style={{ fontSize: size * 0.6, lineHeight: size * 0.75 }}>
        SafeHer<Text variant="heading" style={{ fontSize: size * 0.6, lineHeight: size * 0.75, color: palette.violetLight }}>AI</Text>
      </Text>
    </View>
  );
}
