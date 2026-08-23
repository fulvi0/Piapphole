import React from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, UIManager, View } from 'react-native';

import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';
import { Text } from './Text';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** iOS segmented control with the sliding selection pill. */
export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: theme.colors.tertiaryFill, borderRadius: theme.radii.sm, padding: 2 },
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (selected) return;
              haptics.select();
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              onChange(option.value);
            }}
            style={[
              styles.segment,
              {
                borderRadius: theme.radii.sm - 2,
                backgroundColor: selected ? (theme.dark ? theme.colors.cardElevated : '#FFFFFF') : 'transparent',
              },
              selected && !theme.dark ? theme.shadow.card : null,
            ]}
          >
            <Text variant="subhead" weight={selected ? '600' : '400'} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row' },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 7 },
});
