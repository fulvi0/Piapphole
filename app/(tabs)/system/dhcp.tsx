import { Stack } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';

import { useDeleteLease, useDhcpLeases } from '@/hooks/usePihole';
import { useTheme } from '@/theme';
import {
  ConnectionGate,
  EmptyState,
  ErrorState,
  ListRow,
  ListSection,
  LoadingState,
  Screen,
  Text,
} from '@/ui';
import { confirmDestructive } from '@/utils/confirm';
import { formatDateTime, formatNumber } from '@/utils/format';
import { haptics } from '@/utils/haptics';

export default function DhcpScreen() {
  const theme = useTheme();
  const { data, isLoading, error, refetch } = useDhcpLeases();
  const deleteLease = useDeleteLease();

  const leases = (data?.leases ?? []).slice().sort((a, b) => a.ip.localeCompare(b.ip, undefined, { numeric: true }));

  const remove = async (ip: string, name: string) => {
    const ok = await confirmDestructive({
      title: `Release the lease for ${name || ip}?`,
      message: 'The device will request a new address the next time it connects.',
      confirmLabel: 'Release',
    });
    if (!ok) return;
    deleteLease.mutate(ip, {
      onSuccess: () => haptics.success(),
      onError: (mutationError) => Alert.alert('Could not release', mutationError.message),
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'DHCP leases' }} />
      <Screen onRefresh={refetch}>
        <ConnectionGate>
          {isLoading && !data ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : leases.length === 0 ? (
            <EmptyState
              icon="dhcp"
              title="No active leases"
              message="Either the Pi-hole DHCP server is off, or nothing has requested an address yet."
            />
          ) : (
            <>
              <ListSection footer="Long-press a lease to release it.">
                {leases.map((lease) => (
                  <ListRow
                    key={`${lease.ip}-${lease.hwaddr}`}
                    title={lease.name || lease.ip}
                    subtitle={`${lease.name ? `${lease.ip} · ` : ''}${lease.hwaddr}`}
                    icon="device"
                    iconColor={theme.colors.forwarded}
                    detail={lease.expires === 0 ? 'never expires' : formatDateTime(lease.expires)}
                    chevron={false}
                    numberOfLines={2}
                    onLongPress={() => void remove(lease.ip, lease.name)}
                  />
                ))}
              </ListSection>
              <Text variant="caption1" tone="tertiary" center style={{ marginTop: 16 }}>
                {formatNumber(leases.length)} active leases
              </Text>
            </>
          )}
        </ConnectionGate>
      </Screen>
    </>
  );
}
