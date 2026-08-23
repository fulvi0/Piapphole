import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';
import { withAlpha } from '@/ui/Badge';
import { Text } from '@/ui/Text';
import { formatNumber } from '@/utils/format';

export interface BarListItem {
  key: string;
  label: string;
  sublabel?: string;
  value: number;
}

export interface BarListProps {
  items: BarListItem[];
  color: string;
  onPressItem?: (item: BarListItem) => void;
  emptyMessage?: string;
  valueFormatter?: (value: number) => string;
}

/** Ranked rows where the bar is the row background — Pi-hole's classic "top" tables. */
export function BarList({ items, color, onPressItem, emptyMessage = 'No data yet', valueFormatter }: BarListProps) {
  const theme = useTheme();
  const max = Math.max(1, ...items.map((item) => item.value));
  const format = valueFormatter ?? formatNumber;

  if (items.length === 0) {
    return (
      <Text variant="footnote" tone="tertiary" style={{ paddingVertical: theme.spacing.md }}>
        {emptyMessage}
      </Text>
    );
  }

  return (
    <View style={{ gap: 6 }}>
      {items.map((item) => {
        const fraction = item.value / max;
        const row = (
          <View style={styles.row}>
            <View
              style={[
                styles.bar,
                {
                  backgroundColor: withAlpha(color, theme.dark ? 0.26 : 0.16),
                  width: `${Math.max(4, fraction * 100)}%`,
                  borderRadius: theme.radii.xs,
                },
              ]}
            />
            <View style={styles.rowContent}>
              <View style={styles.rowLabel}>
                <Text variant="subhead" numberOfLines={1}>
                  {item.label}
                </Text>
                {item.sublabel ? (
                  <Text variant="caption2" tone="tertiary" numberOfLines={1}>
                    {item.sublabel}
                  </Text>
                ) : null}
              </View>
              <Text variant="subhead" weight="600" tone="secondary">
                {format(item.value)}
              </Text>
            </View>
          </View>
        );

        if (!onPressItem) return <View key={item.key}>{row}</View>;
        return (
          <Pressable
            key={item.key}
            onPress={() => {
              haptics.light();
              onPressItem(item);
            }}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            {row}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { justifyContent: 'center', minHeight: 34 },
  bar: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 12,
  },
  rowLabel: { flex: 1 },
});
