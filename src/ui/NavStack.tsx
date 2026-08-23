import { Stack } from 'expo-router';
import React from 'react';

import { useTheme } from '@/theme';

/** Shared native-stack configuration so every tab looks identical. */
export function NavStack({ children }: { children?: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerShadowVisible: false,
        headerTintColor: theme.colors.accent,
        headerStyle: { backgroundColor: theme.colors.groupedBackground },
        headerTitleStyle: { color: theme.colors.label },
        headerLargeTitleStyle: { color: theme.colors.label },
        headerLargeStyle: { backgroundColor: theme.colors.groupedBackground },
        contentStyle: { backgroundColor: theme.colors.groupedBackground },
      }}
    >
      {children}
    </Stack>
  );
}
