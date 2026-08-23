import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { useTheme } from '@/theme';
import { Text } from '@/ui/Text';

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}

/** Ring chart built from stroke-dashed circles — crisp at any size, no deps. */
export function DonutChart({ slices, size = 132, thickness = 16, centerLabel, centerValue }: DonutChartProps) {
  const theme = useTheme();
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  const visible = slices.filter((slice) => slice.value > 0);
  const arcs = visible.map((slice, index) => {
    const preceding = visible.slice(0, index).reduce((sum, item) => sum + item.value, 0);
    const fraction = total > 0 ? slice.value / total : 0;
    return {
      ...slice,
      dash: fraction * circumference,
      offset: total > 0 ? (preceding / total) * circumference : 0,
    };
  });

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.colors.tertiaryFill}
            strokeWidth={thickness}
            fill="none"
          />
          {arcs.map((arc) => (
            <Circle
              key={arc.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={arc.color}
              strokeWidth={thickness}
              strokeLinecap="butt"
              fill="none"
              strokeDasharray={`${Math.max(0, arc.dash - 1.5)} ${circumference}`}
              strokeDashoffset={-arc.offset}
            />
          ))}
        </G>
      </Svg>
      {centerValue || centerLabel ? (
        <View style={styles.center} pointerEvents="none">
          {centerValue ? (
            <Text variant="title3" weight="700">
              {centerValue}
            </Text>
          ) : null}
          {centerLabel ? (
            <Text variant="caption1" tone="secondary">
              {centerLabel}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
});
