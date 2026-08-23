import { Stack } from 'expo-router';
import React from 'react';

import type { VersionBranchInfo } from '@/api/types';
import { useFtlInfo, useHostInfo, useSensors, useSystemInfo, useVersionInfo } from '@/hooks/usePihole';
import { useTheme } from '@/theme';
import {
  Badge,
  ConnectionGate,
  ErrorState,
  ListRow,
  ListSection,
  LoadingState,
  Screen,
  Text,
} from '@/ui';
import { formatDuration, formatKilobytes, formatNumber } from '@/utils/format';

function VersionRow({ name, info }: { name: string; info?: VersionBranchInfo }) {
  const theme = useTheme();
  const local = info?.local?.version ?? 'unknown';
  const remote = info?.remote?.version;
  const outdated = Boolean(remote && local !== 'unknown' && remote !== local);

  return (
    <ListRow
      title={name}
      subtitle={info?.local?.branch ? `branch ${info.local.branch}` : undefined}
      detail={local}
      chevron={false}
      right={outdated ? <Badge label={`→ ${remote}`} color={theme.colors.info} /> : undefined}
    />
  );
}

export default function DetailsScreen() {
  const theme = useTheme();
  const host = useHostInfo();
  const version = useVersionInfo();
  const system = useSystemInfo();
  const ftl = useFtlInfo();
  const sensors = useSensors();

  const refresh = async () => {
    await Promise.all([host.refetch(), version.refetch(), system.refetch(), ftl.refetch(), sensors.refetch()]);
  };

  const uname = host.data?.host.uname;
  const ram = system.data?.system.memory.ram;
  const swap = system.data?.system.memory.swap;

  return (
    <>
      <Stack.Screen options={{ title: 'Host & versions' }} />
      <Screen onRefresh={refresh}>
        <ConnectionGate>
          {host.isLoading && !host.data ? (
            <LoadingState />
          ) : host.error ? (
            <ErrorState error={host.error} onRetry={() => void host.refetch()} />
          ) : (
            <>
              <ListSection title="Versions">
                <VersionRow name="Pi-hole core" info={version.data?.version.core} />
                <VersionRow name="Web interface" info={version.data?.version.web} />
                <VersionRow name="FTL" info={version.data?.version.ftl} />
              </ListSection>

              <ListSection title="Host">
                <ListRow title="Hostname" detail={uname?.nodename ?? '—'} chevron={false} />
                <ListRow title="Model" detail={host.data?.host.model ?? 'unknown'} chevron={false} numberOfLines={2} />
                <ListRow title="Kernel" detail={uname?.release ?? '—'} chevron={false} numberOfLines={2} />
                <ListRow title="Architecture" detail={uname?.machine ?? '—'} chevron={false} />
                <ListRow title="System" detail={uname?.sysname ?? '—'} chevron={false} />
              </ListSection>

              <ListSection title="Resources">
                <ListRow title="Uptime" detail={formatDuration(system.data?.system.uptime)} chevron={false} />
                <ListRow title="CPU cores" detail={formatNumber(system.data?.system.cpu.nprocs)} chevron={false} />
                <ListRow
                  title="Load average"
                  detail={(system.data?.system.cpu.load.raw ?? []).map((value) => value.toFixed(2)).join('  ') || '—'}
                  chevron={false}
                />
                <ListRow
                  title="RAM"
                  detail={ram ? `${formatKilobytes(ram.used)} / ${formatKilobytes(ram.total)}` : '—'}
                  chevron={false}
                />
                <ListRow
                  title="Swap"
                  detail={swap ? `${formatKilobytes(swap.used)} / ${formatKilobytes(swap.total)}` : '—'}
                  chevron={false}
                />
                <ListRow title="Processes" detail={formatNumber(system.data?.system.procs)} chevron={false} />
              </ListSection>

              <ListSection title="FTL database">
                <ListRow
                  title="Gravity domains"
                  detail={formatNumber(ftl.data?.ftl.database.gravity)}
                  chevron={false}
                />
                <ListRow
                  title="Anti-gravity domains"
                  detail={formatNumber(ftl.data?.ftl.database.antigravity)}
                  chevron={false}
                />
                <ListRow title="Groups" detail={formatNumber(ftl.data?.ftl.database.groups)} chevron={false} />
                <ListRow title="Lists" detail={formatNumber(ftl.data?.ftl.database.lists)} chevron={false} />
                <ListRow title="Clients" detail={formatNumber(ftl.data?.ftl.database.clients)} chevron={false} />
                <ListRow
                  title="Allowed domains"
                  detail={`${formatNumber(ftl.data?.ftl.database.domains.allowed.enabled)} of ${formatNumber(
                    ftl.data?.ftl.database.domains.allowed.total,
                  )}`}
                  chevron={false}
                />
                <ListRow
                  title="Denied domains"
                  detail={`${formatNumber(ftl.data?.ftl.database.domains.denied.enabled)} of ${formatNumber(
                    ftl.data?.ftl.database.domains.denied.total,
                  )}`}
                  chevron={false}
                />
              </ListSection>

              {(sensors.data?.sensors.list.length ?? 0) > 0 ? (
                <ListSection title="Sensors">
                  {(sensors.data?.sensors.list ?? []).flatMap((group) =>
                    group.temps.map((reading) => (
                      <ListRow
                        key={`${group.path}-${reading.sensor}`}
                        title={reading.name || group.name || reading.sensor}
                        subtitle={group.name && reading.name ? group.name : undefined}
                        detail={`${reading.value.toFixed(1)}°${sensors.data?.sensors.unit ?? 'C'}`}
                        chevron={false}
                        iconColor={
                          reading.crit && reading.value >= reading.crit ? theme.colors.danger : theme.colors.success
                        }
                        icon="temperature"
                      />
                    )),
                  )}
                </ListSection>
              ) : null}

              <Text variant="caption1" tone="tertiary" center style={{ marginTop: 20 }}>
                Reported by the Pi-hole `/info` endpoints.
              </Text>
            </>
          )}
        </ConnectionGate>
      </Screen>
    </>
  );
}
