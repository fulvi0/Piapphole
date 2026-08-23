import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useAppSettings } from '@/store/settings';
import { darkColors, lightColors, radii, shadow, spacing, type as typeScale, monoFont } from './tokens';
import type { ThemeColors } from './tokens';

export interface Theme {
  colors: ThemeColors;
  dark: boolean;
  spacing: typeof spacing;
  radii: typeof radii;
  type: typeof typeScale;
  shadow: typeof shadow;
  monoFont: string;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const { settings } = useAppSettings();
  const dark = settings.appearance === 'system' ? systemScheme === 'dark' : settings.appearance === 'dark';

  const value = useMemo<Theme>(
    () => ({
      colors: dark ? darkColors : lightColors,
      dark,
      spacing,
      radii,
      type: typeScale,
      shadow,
      monoFont: monoFont ?? 'monospace',
    }),
    [dark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside <ThemeProvider>');
  return theme;
}

export * from './tokens';
