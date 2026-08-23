import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { ServerSwitcher } from '@/components/ServerSwitcher';
import { useClients, useDomains, useGroups, useLists, useRefreshAll, useSummary } from '@/hooks/usePihole';
import { useTheme } from '@/theme';
import { ConnectionGate, ListRow, ListSection, Screen, StatTile, Text } from '@/ui';
import { formatCompact, formatNumber, formatRelative } from '@/utils/format';

export default function ManageScreen() {
  const theme = useTheme();
  const router = useRouter();
  const refreshAll = useRefreshAll();

  const domains = useDomains();
  const groups = useGroups();
  const clients = useClients();
  const lists = useLists();
  const summary = useSummary();

  const allowCount = (domains.data?.domains ?? []).filter((item) => item.type === 'allow').length;
  const denyCount = (domains.data?.domains ?? []).filter((item) => item.type === 'deny').length;
  const enabledLists = (lists.data?.lists ?? []).filter((item) => item.enabled).length;

  return (
    <>
      <Stack.Screen options={{ title: 'Manage', headerRight: () => <ServerSwitcher /> }} />
      <Screen onRefresh={refreshAll}>
        <ConnectionGate>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: theme.spacing.lg }}>
            <StatTile
              label="Domains on lists"
              value={formatCompact(summary.data?.gravity.domains_being_blocked)}
              caption={`Gravity updated ${formatRelative(summary.data?.gravity.last_update)}`}
              icon="gravity"
              tint={theme.colors.blocked}
            />
            <StatTile
              label="Subscribed lists"
              value={formatNumber(lists.data?.lists.length)}
              caption={`${formatNumber(enabledLists)} enabled`}
              icon="list"
              tint={theme.colors.allowed}
              onPress={() => router.push('/manage/lists')}
            />
          </View>

          <ListSection title="Blocking rules">
            <ListRow
              title="Allowlist"
              subtitle="Domains and regex filters that always resolve"
              icon="allow"
              iconColor={theme.colors.success}
              detail={formatNumber(allowCount)}
              onPress={() => router.push({ pathname: '/manage/domains', params: { type: 'allow' } })}
            />
            <ListRow
              title="Denylist"
              subtitle="Domains and regex filters that are always blocked"
              icon="block"
              iconColor={theme.colors.danger}
              detail={formatNumber(denyCount)}
              onPress={() => router.push({ pathname: '/manage/domains', params: { type: 'deny' } })}
            />
            <ListRow
              title="Subscribed lists"
              subtitle="Blocklists and allowlists gravity pulls from"
              icon="list"
              iconColor={theme.colors.info}
              detail={formatNumber(lists.data?.lists.length)}
              onPress={() => router.push('/manage/lists')}
            />
          </ListSection>

          <ListSection title="Targeting">
            <ListRow
              title="Groups"
              subtitle="Bundle rules and apply them to selected clients"
              icon="group"
              iconColor={theme.colors.forwarded}
              detail={formatNumber(groups.data?.groups.length)}
              onPress={() => router.push('/manage/groups')}
            />
            <ListRow
              title="Clients"
              subtitle="Assign devices on your network to groups"
              icon="client"
              iconColor={theme.colors.cached}
              detail={formatNumber(clients.data?.clients.length)}
              onPress={() => router.push('/manage/clients')}
            />
          </ListSection>

          <ListSection title="Tools">
            <ListRow
              title="Search the lists"
              subtitle="Find which list a domain comes from"
              icon="search"
              iconColor={theme.colors.accent}
              onPress={() => router.push('/manage/search')}
            />
          </ListSection>

          <Text variant="caption1" tone="tertiary" center style={{ marginTop: theme.spacing.xl }}>
            Changes take effect immediately. Run gravity from System › Actions after editing subscribed lists.
          </Text>
        </ConnectionGate>
      </Screen>
    </>
  );
}
