import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { Text } from './Text';

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  elevated?: boolean;
}

export function Card({ children, style, padded = true, elevated = false }: CardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: elevated ? theme.colors.cardElevated : theme.colors.card,
          borderRadius: theme.radii.lg,
          padding: padded ? theme.spacing.lg : 0,
          overflow: 'hidden',
        },
        theme.dark ? null : theme.shadow.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionHeader({
  title,
  action,
  subtitle,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.header, { marginTop: theme.spacing.xl, marginBottom: theme.spacing.sm }]}>
      <View style={styles.headerText}>
        <Text variant="footnote" tone="secondary" style={styles.uppercase}>
          {title.toUpperCase()}
        </Text>
        {subtitle ? (
          <Text variant="caption1" tone="tertiary" style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  headerText: { flex: 1 },
  uppercase: { letterSpacing: 0.6 },
});
