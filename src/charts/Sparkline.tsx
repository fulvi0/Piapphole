import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

export interface SparklineProps {
  values: number[];
  color: string;
  width?: number;
  height?: number;
  filled?: boolean;
}

/** Tiny inline trend line for stat tiles and list rows. */
export function Sparkline({ values, color, width = 72, height = 24, filled = true }: SparklineProps) {
  if (values.length < 2) return <View style={{ width, height }} />;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);
  const toY = (value: number) => height - ((value - min) / span) * height;

  const line = values.map((value, index) => `${index === 0 ? 'M' : 'L'}${index * stepX},${toY(value)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  const id = `spark-${color.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.35} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {filled ? <Path d={area} fill={`url(#${id})`} /> : null}
      <Path d={line} stroke={color} strokeWidth={1.6} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}
