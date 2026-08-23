import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop, Line as SvgLine } from 'react-native-svg';

import { useTheme } from '@/theme';
import { Text } from '@/ui/Text';
import { withAlpha } from '@/ui/Badge';

export interface AreaSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

export interface AreaChartProps {
  series: AreaSeries[];
  height?: number;
  /** Draw the series stacked on top of each other rather than overlapping. */
  stacked?: boolean;
  labels?: { left?: string; right?: string };
  showLegend?: boolean;
}

/**
 * Lightweight stacked area chart drawn with SVG paths — no chart library, so it
 * stays fast inside a scroll view and matches the app's palette exactly.
 */
export function AreaChart({ series, height = 160, stacked = true, labels, showLegend = true }: AreaChartProps) {
  const theme = useTheme();
  const [width, setWidth] = React.useState(0);

  const pointCount = Math.max(...series.map((s) => s.values.length), 0);
  const stacks = React.useMemo(() => {
    if (!stacked) return series.map((s) => ({ ...s, upper: s.values, lower: s.values.map(() => 0) }));
    const running = new Array(pointCount).fill(0);
    return series.map((s) => {
      const lower = [...running];
      const upper = s.values.map((value, index) => {
        running[index] = (running[index] ?? 0) + (value ?? 0);
        return running[index];
      });
      return { ...s, upper, lower };
    });
  }, [series, stacked, pointCount]);

  const max = React.useMemo(() => {
    const peak = Math.max(1, ...stacks.flatMap((s) => s.upper));
    return peak;
  }, [stacks]);

  const scaleX = (index: number) => (pointCount <= 1 ? 0 : (index / (pointCount - 1)) * width);
  const scaleY = (value: number) => height - (value / max) * height;

  const buildPath = (upper: number[], lower: number[]) => {
    if (!width || upper.length === 0) return '';
    const top = upper.map((value, index) => `${index === 0 ? 'M' : 'L'}${scaleX(index)},${scaleY(value)}`).join(' ');
    const bottom = lower
      .map((value, index) => ({ value, index }))
      .reverse()
      .map(({ value, index }) => `L${scaleX(index)},${scaleY(value)}`)
      .join(' ');
    return `${top} ${bottom} Z`;
  };

  const buildLine = (values: number[]) => {
    if (!width || values.length === 0) return '';
    return values.map((value, index) => `${index === 0 ? 'M' : 'L'}${scaleX(index)},${scaleY(value)}`).join(' ');
  };

  return (
    <View>
      <View style={{ height }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Defs>
              {stacks.map((s) => (
                <LinearGradient key={`grad-${s.key}`} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={s.color} stopOpacity={theme.dark ? 0.55 : 0.42} />
                  <Stop offset="1" stopColor={s.color} stopOpacity={0.04} />
                </LinearGradient>
              ))}
            </Defs>
            {[0.25, 0.5, 0.75].map((fraction) => (
              <SvgLine
                key={fraction}
                x1={0}
                x2={width}
                y1={height * fraction}
                y2={height * fraction}
                stroke={theme.colors.chartGrid}
                strokeWidth={StyleSheet.hairlineWidth * 2}
              />
            ))}
            {stacks.map((s) => (
              <Path key={`area-${s.key}`} d={buildPath(s.upper, s.lower)} fill={`url(#grad-${s.key})`} />
            ))}
            {stacks.map((s) => (
              <Path
                key={`line-${s.key}`}
                d={buildLine(s.upper)}
                stroke={s.color}
                strokeWidth={1.75}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
          </Svg>
        ) : null}
      </View>

      {labels ? (
        <View style={styles.axis}>
          <Text variant="caption2" tone="tertiary">
            {labels.left ?? ''}
          </Text>
          <Text variant="caption2" tone="tertiary">
            {labels.right ?? ''}
          </Text>
        </View>
      ) : null}

      {showLegend ? (
        <View style={styles.legend}>
          {series.map((s) => (
            <View key={s.key} style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: s.color, borderColor: withAlpha(s.color, 0.4) }]} />
              <Text variant="caption1" tone="secondary">
                {s.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 9, height: 9, borderRadius: 3, borderWidth: StyleSheet.hairlineWidth },
});
