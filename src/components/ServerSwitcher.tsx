import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useServers } from '@/store/servers';
import { useTheme } from '@/theme';
import { Icon, ListRow, ListSection, Sheet, Text } from '@/ui';
import { haptics } from '@/utils/haptics';

/** Header control that shows the active Pi-hole and switches between servers. */
export function ServerSwitcher() {
  const theme = useTheme();
  const router = useRouter();
  const { servers, activeServer, selectServer } = useServers();
  const [open, setOpen] = React.useState(false);

  if (!activeServer) return null;

  return (
    <>
      <Pressable
        onPress={() => {
          haptics.light();
          setOpen(true);
        }}
        style={({ pressed }) => [styles.trigger, { opacity: pressed ? 0.6 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel="Switch Pi-hole server"
      >
        <Text variant="subhead" weight="600" tone="accent" numberOfLines={1} style={styles.triggerLabel}>
          {activeServer.name}
        </Text>
        <Icon name="chevronDown" size={11} color={theme.colors.accent} weight="bold" />
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title="Pi-hole servers">
        <ListSection>
          {servers.map((server) => (
            <ListRow
              key={server.id}
              title={server.name}
              subtitle={server.baseUrl}
              icon="server"
              iconColor={server.id === activeServer.id ? theme.colors.accent : theme.colors.secondaryLabel}
              chevron={false}
              right={
                server.id === activeServer.id ? (
                  <Icon name="check" size={16} color={theme.colors.accent} weight="bold" />
                ) : undefined
              }
              onPress={() => {
                selectServer(server.id);
                setOpen(false);
              }}
            />
          ))}
        </ListSection>
        <ListSection>
          <ListRow
            title="Add another Pi-hole"
            icon="plus"
            accent
            onPress={() => {
              setOpen(false);
              router.push('/connect');
            }}
          />
          <ListRow
            title="Manage servers"
            icon="settings"
            onPress={() => {
              setOpen(false);
              router.push('/settings/servers');
            }}
          />
        </ListSection>
        <View style={{ height: 12 }} />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 170 },
  triggerLabel: { flexShrink: 1 },
});
