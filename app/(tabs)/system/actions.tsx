import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useRunAction, type PiholeAction } from '@/hooks/usePihole';
import { useTheme } from '@/theme';
import {
  Button,
  Card,
  ConnectionGate,
  ListRow,
  ListSection,
  Screen,
  Sheet,
  Text,
} from '@/ui';
import { confirmDestructive } from '@/utils/confirm';
import { haptics } from '@/utils/haptics';

interface ActionDefinition {
  action: PiholeAction;
  title: string;
  subtitle: string;
  icon: 'gravity' | 'restart' | 'trash' | 'network' | 'cache';
  destructive?: boolean;
  confirm: string;
}

const ACTIONS: ActionDefinition[] = [
  {
    action: 'gravity',
    title: 'Update gravity',
    subtitle: 'Re-download every subscribed list and rebuild the blocking database',
    icon: 'gravity',
    confirm: 'This downloads all subscribed lists. It can take a minute or two.',
  },
  {
    action: 'restartdns',
    title: 'Restart DNS resolver',
    subtitle: 'Restart pihole-FTL — resolution pauses briefly',
    icon: 'restart',
    destructive: true,
    confirm: 'DNS resolution stops for a few seconds while FTL restarts.',
  },
  {
    action: 'flush-logs',
    title: 'Flush DNS logs',
    subtitle: 'Clear the query log and its long-term database entries',
    icon: 'trash',
    destructive: true,
    confirm: 'The query log is erased. Statistics for the flushed period are lost.',
  },
  {
    action: 'flush-arp',
    title: 'Flush ARP cache',
    subtitle: 'Forget cached MAC-to-IP mappings',
    icon: 'cache',
    destructive: true,
    confirm: 'The ARP cache is cleared and repopulated as devices talk again.',
  },
  {
    action: 'flush-network',
    title: 'Flush network table',
    subtitle: 'Remove every device Pi-hole has recorded on the network',
    icon: 'network',
    destructive: true,
    confirm: 'The whole network table is emptied, including device history.',
  },
];

export default function ActionsScreen() {
  const theme = useTheme();
  const run = useRunAction();
  const [output, setOutput] = React.useState<{ title: string; body: string } | null>(null);
  const [running, setRunning] = React.useState<PiholeAction | null>(null);

  const trigger = async (definition: ActionDefinition) => {
    const ok = await confirmDestructive({
      title: definition.title,
      message: definition.confirm,
      confirmLabel: definition.destructive ? 'Run anyway' : 'Run',
    });
    if (!ok) return;

    setRunning(definition.action);
    haptics.medium();
    run.mutate(definition.action, {
      onSuccess: (result) => {
        haptics.success();
        setRunning(null);
        setOutput({ title: definition.title, body: result.trim() || 'Done.' });
      },
      onError: (error) => {
        haptics.error();
        setRunning(null);
        setOutput({ title: `${definition.title} failed`, body: error.message });
      },
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Actions' }} />
      <Screen>
        <ConnectionGate>
          <Card style={{ marginTop: theme.spacing.lg }}>
            <Text variant="headline">Maintenance</Text>
            <Text variant="footnote" tone="secondary" style={{ marginTop: 4 }}>
              These run directly on your Pi-hole. Each one asks for confirmation first.
            </Text>
          </Card>

          <ListSection title="Available actions">
            {ACTIONS.map((definition) => (
              <ListRow
                key={definition.action}
                title={definition.title}
                subtitle={definition.subtitle}
                icon={definition.icon}
                iconColor={definition.destructive ? theme.colors.danger : theme.colors.accent}
                destructive={definition.destructive}
                numberOfLines={2}
                detail={running === definition.action ? 'running…' : undefined}
                disabled={running !== null}
                onPress={() => void trigger(definition)}
              />
            ))}
          </ListSection>

          <Text variant="caption1" tone="tertiary" center style={{ marginTop: theme.spacing.xl }}>
            Gravity output is streamed back once the run finishes.
          </Text>
        </ConnectionGate>
      </Screen>

      <Sheet
        visible={output !== null}
        onClose={() => setOutput(null)}
        title={output?.title}
        scrollable={false}
        action={<Button title="Done" variant="plain" size="small" onPress={() => setOutput(null)} />}
      >
        <ScrollView style={styles.output}>
          <Text variant="caption1" mono selectable>
            {output?.body}
          </Text>
          <View style={{ height: 20 }} />
        </ScrollView>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  output: { maxHeight: 420 },
});
