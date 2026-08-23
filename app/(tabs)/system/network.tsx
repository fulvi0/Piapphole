import { Stack } from 'expo-router';
import React from 'react';
import { Alert, View } from 'react-native';

import { useGateway, useInterfaces, useNetworkDevices, useRoutes } from '@/hooks/usePihole';
import { useTheme } from '@/theme';
import {
  Badge,
  ConnectionGate,
  EmptyState,
  ErrorState,
  ListRow,
  ListSection,
  LoadingState,
  Screen,
  SearchField,
  Segmented,
  Text,
} from '@/ui';
import { formatNumber, formatRelative } from '@/utils/format';

type Tab = 'devices' | 'interfaces' | 'routes';

export default function NetworkScreen() {
  const theme = useTheme();
  const [tab, setTab] = React.useState<Tab>('devices');
  const [search, setSearch] = React.useState('');

  const devices = useNetworkDevices();
  const gateway = useGateway();
  const interfaces = useInterfaces();
  const routes = useRoutes();

  const filteredDevices = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return (devices.data?.devices ?? [])
      .filter((device) =>
        term
          ? device.hwaddr.toLowerCase().includes(term) ||
            (device.macVendor ?? '').toLowerCase().includes(term) ||
            device.ips.some(
              (ip) => ip.ip.toLowerCase().includes(term) || (ip.name ?? '').toLowerCase().includes(term),
            )
          : true,
      )
      .sort((a, b) => b.lastQuery - a.lastQuery);
  }, [devices.data, search]);

  const refresh = async () => {
    await Promise.all([devices.refetch(), gateway.refetch(), interfaces.refetch(), routes.refetch()]);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Network' }} />
      <Screen onRefresh={refresh}>
        <ConnectionGate>
          <View style={{ marginTop: 8 }}>
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: 'devices', label: 'Devices' },
                { value: 'interfaces', label: 'Interfaces' },
                { value: 'routes', label: 'Routes' },
              ]}
            />
          </View>

          {tab === 'devices' ? (
            <>
              <View style={{ marginTop: 12 }}>
                <SearchField value={search} onChangeText={setSearch} placeholder="Search by name, IP or MAC" />
              </View>

              {devices.isLoading && !devices.data ? (
                <LoadingState />
              ) : devices.error ? (
                <ErrorState error={devices.error} onRetry={() => void devices.refetch()} />
              ) : filteredDevices.length === 0 ? (
                <EmptyState icon="network" title="No devices" message="Pi-hole has not recorded any devices yet." />
              ) : (
                <ListSection footer={`${formatNumber(filteredDevices.length)} devices in the network table.`}>
                  {filteredDevices.map((device) => {
                    const primary = device.ips[0];
                    return (
                      <ListRow
                        key={device.id}
                        title={primary?.name || primary?.ip || device.hwaddr}
                        subtitle={[
                          primary?.name ? primary.ip : null,
                          device.macVendor,
                          `${formatNumber(device.numQueries)} queries`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                        icon="device"
                        iconColor={theme.colors.cached}
                        detail={formatRelative(device.lastQuery)}
                        chevron={false}
                        numberOfLines={2}
                        onLongPress={() =>
                          Alert.alert(
                            primary?.name || device.hwaddr,
                            [
                              `MAC: ${device.hwaddr}`,
                              `Interface: ${device.interface}`,
                              `First seen: ${formatRelative(device.firstSeen)}`,
                              `Addresses:\n${device.ips.map((ip) => `  ${ip.ip}${ip.name ? ` (${ip.name})` : ''}`).join('\n')}`,
                            ].join('\n'),
                          )
                        }
                      />
                    );
                  })}
                </ListSection>
              )}
            </>
          ) : null}

          {tab === 'interfaces' ? (
            <>
              <ListSection title="Default gateway">
                {(gateway.data?.gateway ?? []).length === 0 ? (
                  <ListRow title="No gateway reported" chevron={false} />
                ) : (
                  (gateway.data?.gateway ?? []).map((entry, index) => (
                    <ListRow
                      key={`${entry.family}-${index}`}
                      title={entry.address}
                      subtitle={`${entry.family} via ${entry.interface}${
                        entry.local?.length ? ` · local ${entry.local.join(', ')}` : ''
                      }`}
                      icon="wifi"
                      iconColor={theme.colors.forwarded}
                      chevron={false}
                      numberOfLines={2}
                    />
                  ))
                )}
              </ListSection>

              <ListSection title="Interfaces">
                {(interfaces.data?.interfaces ?? []).length === 0 ? (
                  <ListRow title="No interfaces reported" chevron={false} />
                ) : (
                  (interfaces.data?.interfaces ?? []).map((entry) => (
                    <ListRow
                      key={entry.name}
                      title={entry.name}
                      subtitle={(entry.addresses ?? [])
                        .map((address) => address.address)
                        .slice(0, 3)
                        .join(', ')}
                      icon="network"
                      iconColor={entry.carrier === false ? theme.colors.tertiaryLabel : theme.colors.success}
                      right={
                        entry.stats?.rx_bytes ? (
                          <Badge
                            label={`↓${entry.stats.rx_bytes.value.toFixed(1)}${entry.stats.rx_bytes.unit} ↑${
                              entry.stats.tx_bytes?.value.toFixed(1) ?? '0'
                            }${entry.stats.tx_bytes?.unit ?? ''}`}
                            color={theme.colors.secondaryLabel}
                          />
                        ) : undefined
                      }
                      chevron={false}
                      numberOfLines={2}
                    />
                  ))
                )}
              </ListSection>
            </>
          ) : null}

          {tab === 'routes' ? (
            <ListSection title="Routing table">
              {(routes.data?.routes ?? []).length === 0 ? (
                <ListRow title="No routes reported" chevron={false} />
              ) : (
                (routes.data?.routes ?? []).slice(0, 100).map((route, index) => (
                  <ListRow
                    key={index}
                    title={route.dst ?? 'default'}
                    subtitle={[
                      route.gateway ? `via ${route.gateway}` : null,
                      route.oif ? `dev ${route.oif}` : null,
                      route.protocol,
                      route.scope,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    icon="upstream"
                    iconColor={theme.colors.info}
                    detail={route.family}
                    chevron={false}
                    monoTitle
                    numberOfLines={2}
                  />
                ))
              )}
            </ListSection>
          ) : null}

          <Text variant="caption1" tone="tertiary" center style={{ marginTop: 20 }}>
            Long-press a device for its full details.
          </Text>
        </ConnectionGate>
      </Screen>
    </>
  );
}
