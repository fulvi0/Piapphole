import { Platform } from 'react-native';

/**
 * Palette. The neutrals follow Apple's system greys so the app feels native on
 * iOS; the accents are Pi-hole's own red/teal so it still feels like Pi-hole.
 */
export const palette = {
  brand: '#D8232A',
  brandDark: '#FF453A',
  teal: '#00B99A',
  tealDark: '#30D6B8',
  blue: '#007AFF',
  blueDark: '#0A84FF',
  green: '#34C759',
  greenDark: '#30D158',
  orange: '#FF9500',
  orangeDark: '#FF9F0A',
  red: '#FF3B30',
  redDark: '#FF453A',
  purple: '#AF52DE',
  purpleDark: '#BF5AF2',
  indigo: '#5856D6',
  indigoDark: '#5E5CE6',
  yellow: '#FFCC00',
  pink: '#FF2D55',
  cyan: '#32ADE6',
} as const;

export interface ThemeColors {
  accent: string;
  accentMuted: string;
  background: string;
  groupedBackground: string;
  card: string;
  cardElevated: string;
  cardPressed: string;
  separator: string;
  separatorOpaque: string;
  label: string;
  secondaryLabel: string;
  tertiaryLabel: string;
  quaternaryLabel: string;
  fill: string;
  secondaryFill: string;
  tertiaryFill: string;
  blocked: string;
  allowed: string;
  cached: string;
  forwarded: string;
  warning: string;
  danger: string;
  success: string;
  info: string;
  chartGrid: string;
  overlay: string;
  tabBar: string;
}

export const lightColors: ThemeColors = {
  accent: palette.brand,
  accentMuted: 'rgba(216, 35, 42, 0.12)',
  background: '#FFFFFF',
  groupedBackground: '#F2F2F7',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  cardPressed: '#EDEDF2',
  separator: 'rgba(60, 60, 67, 0.18)',
  separatorOpaque: '#C6C6C8',
  label: '#000000',
  secondaryLabel: 'rgba(60, 60, 67, 0.62)',
  tertiaryLabel: 'rgba(60, 60, 67, 0.34)',
  quaternaryLabel: 'rgba(60, 60, 67, 0.20)',
  fill: 'rgba(120, 120, 128, 0.20)',
  secondaryFill: 'rgba(120, 120, 128, 0.16)',
  tertiaryFill: 'rgba(118, 118, 128, 0.12)',
  blocked: palette.brand,
  allowed: palette.teal,
  cached: palette.blue,
  forwarded: palette.indigo,
  warning: palette.orange,
  danger: palette.red,
  success: palette.green,
  info: palette.blue,
  chartGrid: 'rgba(60, 60, 67, 0.10)',
  overlay: 'rgba(0, 0, 0, 0.32)',
  tabBar: 'rgba(249, 249, 249, 0.84)',
};

export const darkColors: ThemeColors = {
  accent: palette.brandDark,
  accentMuted: 'rgba(255, 69, 58, 0.18)',
  background: '#000000',
  groupedBackground: '#000000',
  card: '#1C1C1E',
  cardElevated: '#2C2C2E',
  cardPressed: '#2C2C2E',
  separator: 'rgba(84, 84, 88, 0.60)',
  separatorOpaque: '#38383A',
  label: '#FFFFFF',
  secondaryLabel: 'rgba(235, 235, 245, 0.62)',
  tertiaryLabel: 'rgba(235, 235, 245, 0.32)',
  quaternaryLabel: 'rgba(235, 235, 245, 0.18)',
  fill: 'rgba(120, 120, 128, 0.36)',
  secondaryFill: 'rgba(120, 120, 128, 0.32)',
  tertiaryFill: 'rgba(118, 118, 128, 0.24)',
  blocked: palette.brandDark,
  allowed: palette.tealDark,
  cached: palette.blueDark,
  forwarded: palette.indigoDark,
  warning: palette.orangeDark,
  danger: palette.redDark,
  success: palette.greenDark,
  info: palette.blueDark,
  chartGrid: 'rgba(235, 235, 245, 0.12)',
  overlay: 'rgba(0, 0, 0, 0.56)',
  tabBar: 'rgba(22, 22, 24, 0.84)',
};

/** Type ramp mirroring iOS Dynamic Type defaults. */
export const type = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' as const, letterSpacing: 0.37 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, letterSpacing: 0.36 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: 0.35 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600' as const, letterSpacing: 0.38 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const, letterSpacing: -0.41 },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' as const, letterSpacing: -0.41 },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400' as const, letterSpacing: -0.32 },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400' as const, letterSpacing: -0.24 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const, letterSpacing: -0.08 },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const, letterSpacing: 0 },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: '400' as const, letterSpacing: 0.07 },
} as const;

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const shadow = {
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    default: { elevation: 2 },
  }) as object,
  floating: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
    },
    default: { elevation: 8 },
  }) as object,
};
