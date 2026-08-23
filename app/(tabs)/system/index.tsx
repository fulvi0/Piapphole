import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ServerSwitcher } from '@/components/ServerSwitcher';
import {
  useDatabaseInfo,
  useFtlInfo,
  useMessages,
  useMetrics,
  useRefreshAll,
  useSensors,
  useSystemInfo,
  useVersionInfo,
} from '@/hooks/usePihole';
import { useTheme } from '@/theme';
import {
  Badge,
  Card,
  ConnectionGate,
  ErrorState,
  ListRow,
  ListSection,
  LoadingState,
  Screen,
  SectionHeader,
  StatTile,
  Text,
} from '@/ui';
import { formatBytes, formatCompact, formatDuration, formatKilobytes, formatNumber, formatPercent } from '@/utils/format';

export default function SystemScreen() {
  const theme = useTheme();
  const router = useRouter();
  const refreshAll = useRefreshAll();

  const system = useSystemInfo();
  const ftl = useFtlInfo();
  const sensors = useSensors();
  const metrics = useMetrics();
  const database = useDatabaseInfo();
  const version = useVersionInfo();
  const messages = useMessages();

  const ram = system.data?.system.memory.ram;
  const cpuLoad = system.data?.system.cpu.load.percent?.[0];
  const temperature = sensors.data?.sensors.cpu_temp;
  const hotLimit = sensors.data?.sensors.hot_limit ?? 80;
  const unit = sensors.data?.sensors.unit ?? 'C';
  const cache = metrics.data?.metrics.dns.cache;

  const updateAvailable = React.useMemo(() => {
    const v = version.data?.version;
    if (!v) return false;
    return (
      [v.core, v.web, v.ftl].some(
        (component) =>
          component?.local?.version &&
          component?.remote?.version &&
          component.local.version !== component.remote.version,
      ) ?? false
    );
  }, [version.data]);

  return (
    <>
      <Stack.Screen options={{ title: 'System', headerRight: () => <ServerSwitcher /> }} />
      <Screen onRefresh={refreshAll}>
        <ConnectionGate>
          {system.isLoading && !system.data ? (
            <LoadingState />
          ) : system.error ? (
            <ErrorState error={system.error} onRetry={() => void system.refetch()} />
          ) : (
            <>
              <View style={[styles.grid, { marginTop: theme.spacing.lg }]}>
                <StatTile
                  label="CPU load"
                  value={cpuLoad !== undefined ? formatPercent(cpuLoad, 0) : '—'}
                  caption={`${formatNumber(system.data?.system.cpu.nprocs)} cores · ${formatNumber(
                    system.data?.system.procs,
                  )} processes`}
                  icon="bolt"
                  tint={theme.colors.warning}
                  progress={(cpuLoad ?? 0) / 100}
                />
                <StatTile
                  label="Memory"
                  value={ram ? formatPercent(ram['%used'], 0) : '—'}
                  caption={ram ? `${formatKilobytes(ram.used)} of ${formatKilobytes(ram.total)}` : undefined}
                  icon="memory"
                  tint={theme.colors.forwarded}
                  progress={(ram?.['%used'] ?? 0) / 100}
                />
              </View>

              <View style={[styles.grid, { marginTop: theme.spacing.md }]}>
                <StatTile
                  label="Temperature"
                  value={temperature !== null && temperature !== undefined ? `${temperature.toFixed(1)}°${unit}` : '—'}
                  caption={`Warning above ${hotLimit}°${unit}`}
                  icon="temperature"
                  tint={
                    temperature !== null && temperature !== undefined && temperature >= hotLimit
                      ? theme.colors.danger
                      : theme.colors.success
                  }
                  progress={temperature ? Math.min(1, temperature / hotLimit) : undefined}
                />
                <StatTile
                  label="System uptime"
                  value={formatDuration(system.data?.system.uptime)}
                  caption={`FTL up ${formatDuration(ftl.data?.ftl.uptime ? ftl.data.ftl.uptime / 1000 : undefined)}`}
                  icon="clock"
                  tint={theme.colors.info}
                />
              </View>

              {(messages.data?.messages.length ?? 0) > 0 || updateAvailable ? (
                <ListSection title="Attention">
                  {(messages.data?.messages.length ?? 0) > 0 ? (
                    <ListRow
                      title="Diagnostic messages"
                      subtitle={messages.data!.messages[0].plain}
                      icon="warning"
                      iconColor={theme.colors.warning}
                      detail={String(messages.data!.messages.length)}
                      numberOfLines={2}
                      onPress={() => router.push('/system/messages')}
                    />
                  ) : null}
                  {updateAvailable ? (
                    <ListRow
                      title="Updates available"
                      subtitle="One or more Pi-hole components can be upgraded"
                      icon="sparkles"
                      iconColor={theme.colors.info}
                      onPress={() => router.push('/system/details')}
                    />
                  ) : null}
                </ListSection>
              ) : null}

              <SectionHeader title="FTL resolver" />
              <Card>
                <View style={styles.pillRow}>
                  <Badge label={`PID ${ftl.data?.ftl.pid ?? '—'}`} color={theme.colors.secondaryLabel} size="medium" />
                  <Badge
                    label={`${(ftl.data?.ftl['%cpu'] ?? 0).toFixed(1)}% CPU`}
                    color={theme.colors.warning}
                    size="medium"
                  />
                  <Badge
                    label={`${(ftl.data?.ftl['%mem'] ?? 0).toFixed(1)}% RAM`}
                    color={theme.colors.forwarded}
                    size="medium"
                  />
                  <Badge
                    label={`Privacy level ${ftl.data?.ftl.privacy_level ?? 0}`}
                    color={theme.colors.info}
                    size="medium"
                  />
                </View>
                <View style={{ height: 12 }} />
                <Text variant="caption1" tone="secondary">
                  {formatNumber(ftl.data?.ftl.clients.active)} active clients of{' '}
                  {formatNumber(ftl.data?.ftl.clients.total)} known ·{' '}
                  {formatCompact(ftl.data?.ftl.database.gravity)} gravity domains
                </Text>
              </Card>

              <SectionHeader title="DNS cache" />
              <ListSection>
                <ListRow title="Cache size" detail={formatNumber(cache?.size)} chevron={false} />
                <ListRow title="Inserted" detail={formatNumber(cache?.inserted)} chevron={false} />
                <ListRow title="Evicted" detail={formatNumber(cache?.evicted)} chevron={false} />
                <ListRow title="Expired" detail={formatNumber(cache?.expired)} chevron={false} />
                <ListRow title="Immortal" detail={formatNumber(cache?.immortal)} chevron={false} />
              </ListSection>

              <ListSection title="Long-term database">
                <ListRow
                  title="Stored queries"
                  detail={formatCompact(database.data?.database.queries.total)}
                  chevron={false}
                />
                <ListRow title="File size" detail={formatBytes(database.data?.database.filesize)} chevron={false} />
                <ListRow
                  title="SQLite version"
                  detail={database.data?.database.sqlite_version ?? '—'}
                  chevron={false}
                />
              </ListSection>

              <ListSection title="Explore">
                <ListRow
                  title="Network devices"
                  subtitle="Everything your Pi-hole has seen on the LAN"
                  icon="network"
                  onPress={() => router.push('/system/network')}
                />
                <ListRow
                  title="DHCP leases"
                  subtitle="Active leases handed out by Pi-hole"
                  icon="dhcp"
                  onPress={() => router.push('/system/dhcp')}
                />
                <ListRow
                  title="Logs"
                  subtitle="dnsmasq, FTL and web server output"
                  icon="logs"
                  onPress={() => router.push('/system/logs')}
                />
                <ListRow
                  title="Host & versions"
                  subtitle="Hardware, OS and component versions"
                  icon="info"
                  onPress={() => router.push('/system/details')}
                />
              </ListSection>

              <ListSection title="Maintenance">
                <ListRow
                  title="Actions"
                  subtitle="Update gravity, restart DNS, flush caches"
                  icon="bolt"
                  iconColor={theme.colors.accent}
                  onPress={() => router.push('/system/actions')}
                />
              </ListSection>
            </>
          )}
        </ConnectionGate>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 12 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
