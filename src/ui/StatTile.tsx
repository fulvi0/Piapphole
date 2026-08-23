import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';
import { withAlpha } from './Badge';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface StatTileProps {
  label: string;
  value: string;
  caption?: string;
  icon?: IconName;
  tint?: string;
  onPress?: () => void;
  style?: ViewStyle;
  /** 0–1; draws a progress bar under the value. */
  progress?: number;
}

/** Compact metric card used in the dashboard grid. */
export function StatTile({ label, value, caption, icon, tint, onPress, style, progress }: StatTileProps) {
  const theme = useTheme();
  const color = tint ?? theme.colors.accent;

  const body = (
    <>
      <View style={styles.head}>
        {icon ? (
          <View style={[styles.iconWrap, { backgroundColor: withAlpha(color, theme.dark ? 0.22 : 0.14) }]}>
            <Icon name={icon} size={15} color={color} />
          </View>
        ) : null}
        <Text variant="footnote" tone="secondary" numberOfLines={1} style={styles.label}>
          {label}
        </Text>
      </View>
      <Text variant="title2" weight="700" numberOfLines={1} style={{ marginTop: 6 }}>
        {value}
      </Text>
      {progress !== undefined ? (
        <View style={[styles.track, { backgroundColor: theme.colors.tertiaryFill }]}>
          <View
            style={[
              styles.fill,
              { backgroundColor: color, width: `${Math.max(0, Math.min(1, progress)) * 100}%` },
            ]}
          />
        </View>
      ) : null}
      {caption ? (
        <Text variant="caption1" tone="tertiary" numberOfLines={1} style={{ marginTop: 4 }}>
          {caption}
        </Text>
      ) : null}
    </>
  );

  const containerStyle: ViewStyle = {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    flex: 1,
    minWidth: 0,
  };

  if (!onPress) {
    return <View style={[containerStyle, theme.dark ? null : theme.shadow.card, style]}>{body}</View>;
  }

  return (
    <Pressable
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={({ pressed }) => [
        containerStyle,
        theme.dark ? null : theme.shadow.card,
        { opacity: pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  iconWrap: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1 },
  track: { height: 4, borderRadius: 2, marginTop: 10, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
});
