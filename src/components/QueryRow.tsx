import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { QueryEntry } from '@/api/types';
import { useTheme } from '@/theme';
import { Text, withAlpha } from '@/ui';
import { formatMilliseconds, formatTime } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { colorForOutcome, outcomeForStatus, shortLabelForStatus } from '@/utils/queryStatus';

export interface QueryRowProps {
  entry: QueryEntry;
  onPress: (entry: QueryEntry) => void;
  compact?: boolean;
}

/** One line of the query log, colour-coded by how the query was answered. */
export const QueryRow = React.memo(function QueryRow({ entry, onPress, compact }: QueryRowProps) {
  const theme = useTheme();
  const outcome = outcomeForStatus(entry.status);
  const tint = colorForOutcome(outcome, theme.colors);

  return (
    <Pressable
      onPress={() => {
        haptics.light();
        onPress(entry);
      }}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.colors.cardPressed : theme.colors.card },
      ]}
    >
      <View style={[styles.stripe, { backgroundColor: tint }]} />
      <View style={styles.body}>
        <View style={styles.line}>
          <Text variant="subhead" weight="500" numberOfLines={1} style={styles.domain}>
            {entry.domain}
          </Text>
          <Text variant="caption1" tone="tertiary">
            {formatTime(entry.time)}
          </Text>
        </View>
        <View style={styles.line}>
          <Text variant="caption1" tone="secondary" numberOfLines={1} style={styles.client}>
            {entry.client.name || entry.client.ip}
          </Text>
          {!compact ? (
            <View style={styles.tags}>
              <View style={[styles.tag, { backgroundColor: theme.colors.tertiaryFill }]}>
                <Text variant="caption2" tone="secondary">
                  {entry.type}
                </Text>
              </View>
              <View style={[styles.tag, { backgroundColor: withAlpha(tint, theme.dark ? 0.24 : 0.14) }]}>
                <Text variant="caption2" color={tint} weight="600">
                  {shortLabelForStatus(entry.status)}
                </Text>
              </View>
              {entry.reply.time >= 0 ? (
                <Text variant="caption2" tone="tertiary">
                  {formatMilliseconds(entry.reply.time)}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text variant="caption2" color={tint} weight="600">
              {shortLabelForStatus(entry.status)}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch', minHeight: 58 },
  stripe: { width: 3 },
  body: { flex: 1, paddingHorizontal: 14, paddingVertical: 10, gap: 3 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  domain: { flex: 1 },
  client: { flexShrink: 1 },
  tags: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
});
