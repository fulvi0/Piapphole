import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useServers } from '@/store/servers';
import { useAppSettings } from '@/store/settings';
import { useTheme } from '@/theme';

/** Entry gate: send first-run users to onboarding, everyone else to the tabs. */
export default function Index() {
  const { ready: serversReady, servers } = useServers();
  const { ready: settingsReady } = useAppSettings();
  const theme = useTheme();

  if (!serversReady || !settingsReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.groupedBackground }}>
        <ActivityIndicator color={theme.colors.secondaryLabel} />
      </View>
    );
  }

  return <Redirect href={servers.length === 0 ? '/connect' : '/(tabs)'} />;
}
