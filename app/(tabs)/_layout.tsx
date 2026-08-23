import { BlurView } from 'expo-blur';
import Tabs from 'expo-router/js-tabs';
import React from 'react';
import { Platform, StyleSheet, View, type ColorValue } from 'react-native';

import { useTheme } from '@/theme';
import { Icon, type IconName } from '@/ui';

export default function TabsLayout() {
  const theme = useTheme();

  const renderIcon = (name: IconName) =>
    function TabIcon({ color, size }: { color: ColorValue; size: number }) {
      return <Icon name={name} size={size - 2} color={String(color)} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.secondaryLabel,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500', letterSpacing: 0.04 },
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.separator,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : theme.colors.tabBar,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              tint={theme.dark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
              intensity={80}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.tabBar }]} />
          ),
      }}
    >
      <Tabs.Screen name="overview" options={{ title: 'Overview', tabBarIcon: renderIcon('dashboard') }} />
      <Tabs.Screen name="queries" options={{ title: 'Queries', tabBarIcon: renderIcon('queries') }} />
      <Tabs.Screen name="manage" options={{ title: 'Manage', tabBarIcon: renderIcon('manage') }} />
      <Tabs.Screen name="system" options={{ title: 'System', tabBarIcon: renderIcon('system') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: renderIcon('settings') }} />
    </Tabs>
  );
}
