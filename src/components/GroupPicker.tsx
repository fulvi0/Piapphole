import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useGroups } from '@/hooks/usePihole';
import { useTheme } from '@/theme';
import { Badge, Text } from '@/ui';
import { haptics } from '@/utils/haptics';

export interface GroupPickerProps {
  value: number[];
  onChange: (groups: number[]) => void;
  label?: string;
}

/** Multi-select chips for assigning an item to Pi-hole groups. */
export function GroupPicker({ value, onChange, label = 'Groups' }: GroupPickerProps) {
  const theme = useTheme();
  const { data } = useGroups();
  const groups = data?.groups ?? [];

  const toggle = (id: number) => {
    haptics.select();
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  };

  return (
    <View>
      <Text variant="footnote" tone="secondary" style={{ marginBottom: 8, marginLeft: 2 }}>
        {label}
      </Text>
      <View style={styles.chips}>
        {groups.length === 0 ? (
          <Text variant="footnote" tone="tertiary">
            No groups defined — the Default group applies.
          </Text>
        ) : (
          groups.map((group) => {
            const selected = value.includes(group.id);
            return (
              <Pressable key={group.id} onPress={() => toggle(group.id)}>
                <Badge
                  label={group.name}
                  size="medium"
                  filled={selected}
                  color={selected ? theme.colors.accent : theme.colors.secondaryLabel}
                />
              </Pressable>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
