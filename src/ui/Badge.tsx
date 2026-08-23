import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { Text } from './Text';

export interface BadgeProps {
  label: string;
  color?: string;
  filled?: boolean;
  style?: ViewStyle;
  size?: 'small' | 'medium';
}

export function Badge({ label, color, filled, style, size = 'small' }: BadgeProps) {
  const theme = useTheme();
  const tint = color ?? theme.colors.secondaryLabel;
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: filled ? tint : withAlpha(tint, theme.dark ? 0.22 : 0.14),
          borderRadius: theme.radii.xs,
          paddingHorizontal: size === 'medium' ? 8 : 6,
          paddingVertical: size === 'medium' ? 4 : 2,
        },
        style,
      ]}
    >
      <Text variant="caption2" weight="600" color={filled ? '#FFFFFF' : tint} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Applies an alpha channel to hex or rgb colours without pulling in a library. */
export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex.slice(0, 6);
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (match) {
    const [r, g, b] = match[1].split(',').map((part) => parseFloat(part));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start' },
});
