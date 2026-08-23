import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'tinted' | 'plain' | 'destructive';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  loading,
  disabled,
  fullWidth,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const { background, foreground, border } = (() => {
    switch (variant) {
      case 'secondary':
        return { background: theme.colors.secondaryFill, foreground: theme.colors.label, border: 'transparent' };
      case 'tinted':
        return { background: theme.colors.accentMuted, foreground: theme.colors.accent, border: 'transparent' };
      case 'plain':
        return { background: 'transparent', foreground: theme.colors.accent, border: 'transparent' };
      case 'destructive':
        return { background: theme.colors.danger, foreground: '#FFFFFF', border: 'transparent' };
      default:
        return { background: theme.colors.accent, foreground: '#FFFFFF', border: 'transparent' };
    }
  })();

  const paddingVertical = size === 'large' ? 15 : size === 'small' ? 7 : 11;
  const paddingHorizontal = size === 'large' ? 22 : size === 'small' ? 12 : 18;
  const textVariant = size === 'small' ? 'subhead' : 'headline';

  return (
    <Pressable
      onPress={() => {
        if (isDisabled) return;
        haptics.light();
        onPress?.();
      }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: background,
          borderColor: border,
          borderRadius: size === 'small' ? theme.radii.sm : theme.radii.md,
          paddingVertical,
          paddingHorizontal,
          opacity: isDisabled ? 0.45 : pressed ? 0.82 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={foreground} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} size={size === 'small' ? 15 : 17} color={foreground} /> : null}
          <Text variant={textVariant} color={foreground} weight="600">
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  content: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
