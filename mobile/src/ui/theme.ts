/**
 * SafeHerAI design tokens ("Midnight Shield").
 * Every screen takes its colours, sizes and spacing from here, so the app looks consistent
 * and a future light theme only needs a second set of values.
 *
 * Colour rules:
 * - Violet = primary actions and AI features.
 * - Pink = small highlights only.
 * - Red = errors and failures (a universal convention).
 * - The red-to-orange gradient = emergencies ONLY (SOS, alerts), so it never loses its meaning.
 */

export const palette = {
  midnight: '#0B1026',
  midnightDeep: '#070A1A',
  indigo: '#1A1F4D',
  surface: '#131B3D',
  surfaceRaised: '#1B2552',
  violet: '#7C5CFF',
  violetLight: '#A78BFA',
  purple: '#B45CFF',
  pink: '#FF7AB6',
  white: '#FFFFFF',
  green: '#34D399',
  amber: '#FBBF24',
  red: '#FF4D4F',
  orange: '#FF8A3D',
  sky: '#60A5FA',
} as const;

export const colors = {
  background: palette.midnight,
  backgroundDeep: palette.midnightDeep,
  surface: palette.surface,
  surfaceRaised: palette.surfaceRaised,
  surfaceGlass: 'rgba(255, 255, 255, 0.06)',
  border: 'rgba(255, 255, 255, 0.10)',
  borderStrong: 'rgba(255, 255, 255, 0.20)',

  text: '#F4F6FF',
  textMuted: '#A7B0D8',
  textSubtle: '#7C86B2',
  textOnPrimary: palette.white,

  primary: palette.violet,
  primarySoft: 'rgba(124, 92, 255, 0.16)',
  accent: palette.pink,
  accentSoft: 'rgba(255, 122, 182, 0.14)',

  success: palette.green,
  successSoft: 'rgba(52, 211, 153, 0.14)',
  warning: palette.amber,
  warningSoft: 'rgba(251, 191, 36, 0.14)',
  info: palette.sky,
  infoSoft: 'rgba(96, 165, 250, 0.14)',

  /** Errors and failures. Emergencies additionally use gradients.emergency. */
  danger: palette.red,
  dangerSoft: 'rgba(255, 77, 79, 0.16)',
  emergencyOrange: palette.orange,
} as const;

/** Gradient colour stops, used with expo-linear-gradient. */
export const gradients = {
  background: [palette.midnight, palette.indigo] as const,
  primary: [palette.violet, palette.purple] as const,
  ai: ['#6D5DFC', '#C084FC'] as const,
  accent: [palette.purple, palette.pink] as const,
  /** Emergencies ONLY (SOS button, alert screens). */
  emergency: [palette.red, palette.orange] as const,
};

/** 4-point spacing grid. */
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Inter font family names, as registered in fonts.ts. */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const typography = {
  display: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 41, letterSpacing: -0.6 },
  title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  subheading: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 1.2 },
} as const;

export type TypographyVariant = keyof typeof typography;

/** Soft shadows. Android uses `elevation`, iOS uses the shadow* values. */
export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  glow: {
    shadowColor: palette.violet,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
} as const;

/** Animation timings in milliseconds. Kept short so the app feels quick, never sluggish. */
export const motion = {
  fast: 120,
  normal: 220,
  slow: 360,
  pressScale: 0.97,
} as const;

/** Content never stretches wider than this, so tablets get a comfortable reading width. */
export const layout = {
  maxContentWidth: 560,
  minTouchTarget: 48,
} as const;
