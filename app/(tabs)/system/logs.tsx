import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useLogs } from '@/hooks/usePihole';
import {
  ConnectionGate,
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenSurface,
  Segmented,
  Text,
} from '@/ui';
import { formatTime } from '@/utils/format';

type LogKind = 'dnsmasq' | 'ftl' | 'webserver';

export default function LogsScreen() {
  const [kind, setKind] = React.useState<LogKind>('dnsmasq');
  const { data, isLoading, error, refetch } = useLogs(kind);

  return (
    <>
      <Stack.Screen options={{ title: 'Logs', headerLargeTitle: false }} />
      <ScreenSurface>
        <ConnectionGate>
          <View style={styles.toolbar}>
            <Segmented
              value={kind}
              onChange={setKind}
              options={[
                { value: 'dnsmasq', label: 'dnsmasq' },
                { value: 'ftl', label: 'FTL' },
                { value: 'webserver', label: 'Web' },
              ]}
            />
          </View>

          {isLoading && !data ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : (data?.log.length ?? 0) === 0 ? (
            <EmptyState icon="logs" title="Log is empty" message="Nothing has been written to this log yet." />
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.logBody}
              horizontal={false}
            >
              <Text variant="caption2" tone="tertiary" style={{ marginBottom: 8 }}>
                {data?.file}
              </Text>
              {(data?.log ?? []).map((line, index) => (
                <View key={`${line.timestamp}-${index}`} style={styles.line}>
                  <Text variant="caption2" tone="tertiary" mono>
                    {formatTime(line.timestamp)}
                  </Text>
                  <Text variant="caption1" mono style={{ flex: 1 }} selectable>
                    {line.message}
                  </Text>
                </View>
              ))}
              <View style={{ height: 100 }} />
            </ScrollView>
          )}
        </ConnectionGate>
      </ScreenSurface>
    </>
  );
}

const styles = StyleSheet.create({
  toolbar: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  logBody: { paddingHorizontal: 16, paddingTop: 8 },
  line: { flexDirection: 'row', gap: 8, paddingVertical: 3 },
});
