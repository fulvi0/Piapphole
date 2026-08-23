import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationLightTheme,
  Stack,
  ThemeProvider as NavigationThemeProvider,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ServersProvider } from '@/store/servers';
import { SettingsProvider, useAppSettings } from '@/store/settings';
import { ThemeProvider, useTheme } from '@/theme';
import { setHapticsEnabled } from '@/utils/haptics';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <ThemeProvider>
            <QueryClientProvider client={queryClient}>
              <ServersProvider>
                <AppShell />
              </ServersProvider>
            </QueryClientProvider>
          </ThemeProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppShell() {
  const theme = useTheme();
  const { settings } = useAppSettings();

  React.useEffect(() => {
    setHapticsEnabled(settings.haptics);
  }, [settings.haptics]);

  React.useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.groupedBackground);
  }, [theme.colors.groupedBackground]);

  const navigationTheme = React.useMemo(() => {
    const base = theme.dark ? NavigationDarkTheme : NavigationLightTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.accent,
        background: theme.colors.groupedBackground,
        card: theme.colors.card,
        text: theme.colors.label,
        border: theme.colors.separator,
      },
    };
  }, [theme]);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerLargeTitle: true,
          headerTransparent: false,
          headerShadowVisible: false,
          headerTintColor: theme.colors.accent,
          headerStyle: { backgroundColor: theme.colors.groupedBackground },
          headerTitleStyle: { color: theme.colors.label },
          headerLargeTitleStyle: { color: theme.colors.label },
          contentStyle: { backgroundColor: theme.colors.groupedBackground },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="connect"
          options={{ presentation: 'modal', title: 'Add Pi-hole', headerLargeTitle: false }}
        />
      </Stack>
    </NavigationThemeProvider>
  );
}
