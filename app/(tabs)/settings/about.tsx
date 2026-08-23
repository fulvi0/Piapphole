import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { Card, Icon, ListRow, ListSection, Screen, Text } from '@/ui';

export default function AboutScreen() {
  const theme = useTheme();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <>
      <Stack.Screen options={{ title: 'About' }} />
      <Screen>
        <View style={styles.hero}>
          <View style={[styles.icon, { backgroundColor: theme.colors.accentMuted }]}>
            <Icon name="shield" size={34} color={theme.colors.accent} />
          </View>
          <Text variant="title2" weight="700" style={{ marginTop: 14 }}>
            Piapphole
          </Text>
          <Text variant="footnote" tone="secondary" style={{ marginTop: 2 }}>
            Version {version}
          </Text>
        </View>

        <Card style={{ marginTop: 24 }}>
          <Text variant="subhead">
            An open-source, native client for Pi-hole v6. Every request goes straight from your device to your own
            Pi-hole over its REST API — there is no backend, no account and no telemetry.
          </Text>
        </Card>

        <ListSection title="Privacy">
          <ListRow
            title="Credentials"
            subtitle="Stored in the device keychain via expo-secure-store"
            icon="lock"
            chevron={false}
            numberOfLines={2}
          />
          <ListRow
            title="Network traffic"
            subtitle="Only to the Pi-hole addresses you configure"
            icon="network"
            chevron={false}
            numberOfLines={2}
          />
          <ListRow
            title="Analytics"
            subtitle="None. Nothing leaves your device."
            icon="eyeOff"
            chevron={false}
            numberOfLines={2}
          />
        </ListSection>

        <ListSection title="Learn more">
          <ListRow
            title="Pi-hole API reference"
            icon="globe"
            onPress={() => void WebBrowser.openBrowserAsync('https://docs.pi-hole.net/api/')}
          />
          <ListRow
            title="Pi-hole project"
            icon="heart"
            onPress={() => void WebBrowser.openBrowserAsync('https://pi-hole.net')}
          />
          <ListRow
            title="Pi-hole discourse"
            icon="group"
            onPress={() => void WebBrowser.openBrowserAsync('https://discourse.pi-hole.net')}
          />
        </ListSection>

        <Text variant="caption1" tone="tertiary" center style={{ marginTop: 24 }}>
          Piapphole is licensed under the MIT license. Pi-hole® is a registered trademark of Pi-hole LLC; this app is
          an independent client and is not affiliated with the Pi-hole project.
        </Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: 24 },
  icon: { width: 76, height: 76, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
