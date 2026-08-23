import * as WebBrowser from 'expo-web-browser';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Alert, View } from 'react-native';

import { useServers } from '@/store/servers';
import { useAppSettings } from '@/store/settings';
import { useTheme } from '@/theme';
import { ListRow, ListSection, Screen, Segmented, Text } from '@/ui';

const REFRESH_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '5s', value: 5 },
  { label: '10s', value: 10 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { settings, update } = useAppSettings();
  const { servers, activeServer } = useServers();

  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />
      <Screen>
        <ListSection title="Pi-hole">
          <ListRow
            title="Servers"
            subtitle={activeServer ? `${activeServer.name} · ${activeServer.baseUrl}` : 'None configured'}
            icon="server"
            iconColor={theme.colors.accent}
            detail={String(servers.length)}
            numberOfLines={2}
            onPress={() => router.push('/settings/servers')}
          />
          <ListRow
            title="Active API sessions"
            subtitle="See and revoke sessions on the Pi-hole"
            icon="key"
            onPress={() => router.push('/settings/sessions')}
          />
        </ListSection>

        <ListSection title="Appearance">
          <ListRow
            title="Theme"
            icon={theme.dark ? 'moon' : 'sun'}
            right={
              <View style={{ width: 168 }}>
                <Segmented
                  value={settings.appearance}
                  onChange={(value) => update({ appearance: value })}
                  options={[
                    { value: 'system', label: 'Auto' },
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                  ]}
                />
              </View>
            }
            chevron={false}
          />
        </ListSection>

        <ListSection title="Live data" footer="How often the dashboard and query log poll your Pi-hole.">
          <ListRow
            title="Refresh"
            icon="refresh"
            right={
              <View style={{ width: 210 }}>
                <Segmented
                  value={String(settings.refreshInterval)}
                  onChange={(value) => update({ refreshInterval: Number(value) })}
                  options={REFRESH_OPTIONS.map((option) => ({ value: String(option.value), label: option.label }))}
                />
              </View>
            }
            chevron={false}
          />
        </ListSection>

        <ListSection title="Behaviour">
          <ListRow
            title="Haptic feedback"
            icon="bolt"
            switchValue={settings.haptics}
            onSwitchChange={(value) => update({ haptics: value })}
            chevron={false}
          />
          <ListRow
            title="Compact query rows"
            subtitle="Hide type and timing tags in the query log"
            icon="queries"
            switchValue={settings.compactQueries}
            onSwitchChange={(value) => update({ compactQueries: value })}
            chevron={false}
          />
          <ListRow
            title="Confirm before pausing"
            subtitle="Ask how long to pause instead of using one minute"
            icon="clock"
            switchValue={settings.confirmDestructive}
            onSwitchChange={(value) => update({ confirmDestructive: value })}
            chevron={false}
          />
        </ListSection>

        <ListSection title="Query log">
          <ListRow
            title="Rows per page"
            icon="list"
            right={
              <View style={{ width: 190 }}>
                <Segmented
                  value={String(settings.queryPageSize)}
                  onChange={(value) => update({ queryPageSize: Number(value) })}
                  options={[
                    { value: '50', label: '50' },
                    { value: '100', label: '100' },
                    { value: '250', label: '250' },
                    { value: '500', label: '500' },
                  ]}
                />
              </View>
            }
            chevron={false}
          />
        </ListSection>

        <ListSection title="About">
          <ListRow
            title="About Piapphole"
            icon="info"
            onPress={() => router.push('/settings/about')}
          />
          <ListRow
            title="Pi-hole API documentation"
            icon="globe"
            onPress={() => void WebBrowser.openBrowserAsync('https://docs.pi-hole.net/api/')}
          />
          <ListRow
            title="Reset app preferences"
            icon="refresh"
            destructive
            chevron={false}
            onPress={() =>
              Alert.alert('Reset preferences?', 'Servers stay configured; only app settings return to defaults.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset',
                  style: 'destructive',
                  onPress: () =>
                    update({
                      appearance: 'system',
                      refreshInterval: 10,
                      haptics: true,
                      compactQueries: false,
                      queryPageSize: 100,
                      confirmDestructive: true,
                    }),
                },
              ])
            }
          />
        </ListSection>

        <Text variant="caption1" tone="tertiary" center style={{ marginTop: 24 }}>
          Piapphole · an open-source Pi-hole client
        </Text>
      </Screen>
    </>
  );
}
