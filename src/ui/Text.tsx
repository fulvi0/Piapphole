import React from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme';

type Variant = keyof ReturnType<typeof useTheme>['type'];
type Tone = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'danger' | 'success' | 'warning' | 'inverse';

export interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
  weight?: TextStyle['fontWeight'];
  mono?: boolean;
  color?: string;
  center?: boolean;
}

export function Text({
  variant = 'body',
  tone = 'primary',
  weight,
  mono,
  color,
  center,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();
  const toneColor = (() => {
    if (color) return color;
    switch (tone) {
      case 'secondary':
        return theme.colors.secondaryLabel;
      case 'tertiary':
        return theme.colors.tertiaryLabel;
      case 'accent':
        return theme.colors.accent;
      case 'danger':
        return theme.colors.danger;
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'inverse':
        return theme.dark ? '#000000' : '#FFFFFF';
      default:
        return theme.colors.label;
    }
  })();

  return (
    <RNText
      {...rest}
      style={[
        theme.type[variant],
        { color: toneColor },
        mono && { fontFamily: theme.monoFont, letterSpacing: 0 },
        weight ? { fontWeight: weight } : null,
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
}
