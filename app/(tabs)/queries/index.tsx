import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { QueryEntry, QueryFilters } from '@/api/types';
import { QueryDetailSheet } from '@/components/QueryDetailSheet';
import { QueryRow } from '@/components/QueryRow';
import { useQueryLog, useQuerySuggestions } from '@/hooks/usePihole';
import { useAppSettings } from '@/store/settings';
import { useTheme } from '@/theme';
import {
  Badge,
  Button,
  ConnectionGate,
  EmptyState,
  ErrorState,
  Icon,
  ListSection,
  LoadingState,
  SearchField,
  Segmented,
  Sheet,
  Text,
} from '@/ui';
import { formatNumber } from '@/utils/format';
import { haptics } from '@/utils/haptics';

type StatusFilter = 'all' | 'blocked' | 'permitted';

const BLOCKED_STATUSES = 'GRAVITY,REGEX,DENYLIST,EXTERNAL_BLOCKED_IP,EXTERNAL_BLOCKED_NULL,EXTERNAL_BLOCKED_NXRA,EXTERNAL_BLOCKED_EDE15,GRAVITY_CNAME,REGEX_CNAME,DENYLIST_CNAME,SPECIAL_DOMAIN';
const PERMITTED_STATUSES = 'FORWARDED,CACHE,CACHE_STALE,RETRIED,RETRIED_DNSSEC';

export default function QueriesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useAppSettings();
  const params = useLocalSearchParams<{ domain?: string; client?: string }>();

  const [domain, setDomain] = React.useState(params.domain ?? '');
  const [clientFilter, setClientFilter] = React.useState(params.client ?? '');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [advanced, setAdvanced] = React.useState<{ type?: string; reply?: string; upstream?: string; dnssec?: string }>({});
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<QueryEntry | null>(null);

  // Navigating here again with new params re-seeds the filters; edits made in
  // the UI afterwards are preserved because only param *changes* apply.
  const [lastParams, setLastParams] = React.useState(`${params.domain ?? ''}|${params.client ?? ''}`);
  const incomingParams = `${params.domain ?? ''}|${params.client ?? ''}`;
  if (incomingParams !== lastParams) {
    setLastParams(incomingParams);
    if (params.domain) setDomain(params.domain);
    if (params.client) setClientFilter(params.client);
  }

  const [debouncedDomain, setDebouncedDomain] = React.useState(domain);
  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedDomain(domain), 350);
    return () => clearTimeout(id);
  }, [domain]);

  const filters = React.useMemo<QueryFilters>(() => {
    const next: QueryFilters = {};
    if (debouncedDomain.trim()) next.domain = `*${debouncedDomain.trim()}*`;
    if (clientFilter.trim()) next.client_ip = clientFilter.trim();
    if (statusFilter === 'blocked') next.status = BLOCKED_STATUSES;
    if (statusFilter === 'permitted') next.status = PERMITTED_STATUSES;
    if (advanced.type) next.type = advanced.type;
    if (advanced.reply) next.reply = advanced.reply;
    if (advanced.upstream) next.upstream = advanced.upstream;
    if (advanced.dnssec) next.dnssec = advanced.dnssec;
    return next;
  }, [advanced, clientFilter, debouncedDomain, statusFilter]);

  const log = useQueryLog(filters);
  const suggestions = useQuerySuggestions();

  const entries = React.useMemo(
    () => (log.data?.pages ?? []).flatMap((page) => page.queries),
    [log.data],
  );
  const totalFiltered = log.data?.pages[0]?.recordsFiltered ?? 0;
  const totalAll = log.data?.pages[0]?.recordsTotal ?? 0;

  const activeFilterCount =
    (debouncedDomain ? 1 : 0) +
    (clientFilter ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    Object.values(advanced).filter(Boolean).length;

  const clearFilters = () => {
    haptics.light();
    setDomain('');
    setClientFilter('');
    setStatusFilter('all');
    setAdvanced({});
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Queries',
          headerRight: () => (
            <Pressable
              onPress={() => {
                haptics.light();
                setFiltersOpen(true);
              }}
              hitSlop={10}
              style={styles.headerButton}
            >
              <Icon name="filter" size={20} color={theme.colors.accent} />
              {activeFilterCount > 0 ? (
                <View style={[styles.dot, { backgroundColor: theme.colors.accent }]} />
              ) : null}
            </Pressable>
          ),
        }}
      />
      <View style={{ flex: 1, backgroundColor: theme.colors.groupedBackground }}>
        <ConnectionGate>
          <View style={[styles.toolbar, { backgroundColor: theme.colors.groupedBackground }]}>
            <SearchField value={domain} onChangeText={setDomain} placeholder="Filter by domain" />
            <View style={{ height: 10 }} />
            <Segmented
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'blocked', label: 'Blocked' },
                { value: 'permitted', label: 'Permitted' },
              ]}
            />
            {activeFilterCount > 0 ? (
              <View style={styles.filterChips}>
                <Text variant="caption1" tone="secondary" style={{ flex: 1 }}>
                  {formatNumber(totalFiltered)} of {formatNumber(totalAll)} queries match
                </Text>
                <Button title="Clear" variant="plain" size="small" onPress={clearFilters} />
              </View>
            ) : null}
          </View>

          {log.isLoading && entries.length === 0 ? (
            <LoadingState label="Loading query log…" />
          ) : log.error && entries.length === 0 ? (
            <ErrorState error={log.error} onRetry={() => void log.refetch()} />
          ) : (
            <FlatList
              data={entries}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <QueryRow entry={item} onPress={setSelected} compact={settings.compactQueries} />
              )}
              ItemSeparatorComponent={() => (
                <View style={[styles.separator, { backgroundColor: theme.colors.separator }]} />
              )}
              contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
              onEndReachedThreshold={0.4}
              onEndReached={() => {
                if (log.hasNextPage && !log.isFetchingNextPage) void log.fetchNextPage();
              }}
              refreshing={log.isRefetching && !log.isFetchingNextPage}
              onRefresh={() => void log.refetch()}
              ListEmptyComponent={
                <EmptyState
                  icon="queries"
                  title="No queries match"
                  message="Try widening the filters, or wait for new DNS traffic to arrive."
                  actionTitle={activeFilterCount > 0 ? 'Clear filters' : undefined}
                  onAction={activeFilterCount > 0 ? clearFilters : undefined}
                />
              }
              ListFooterComponent={
                log.isFetchingNextPage ? (
                  <View style={styles.footer}>
                    <ActivityIndicator color={theme.colors.secondaryLabel} />
                  </View>
                ) : entries.length > 0 && !log.hasNextPage ? (
                  <Text variant="caption1" tone="tertiary" center style={styles.footer}>
                    End of the log · {formatNumber(entries.length)} queries shown
                  </Text>
                ) : null
              }
            />
          )}
        </ConnectionGate>
      </View>

      <QueryDetailSheet
        entry={selected}
        onClose={() => setSelected(null)}
        onFilterDomain={setDomain}
        onFilterClient={setClientFilter}
      />

      <Sheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        <SearchField value={clientFilter} onChangeText={setClientFilter} placeholder="Client IP address" />

        <FilterPicker
          title="Query type"
          options={suggestions.data?.suggestions.type ?? []}
          value={advanced.type}
          onChange={(value) => setAdvanced((prev) => ({ ...prev, type: value }))}
        />
        <FilterPicker
          title="Reply type"
          options={suggestions.data?.suggestions.reply ?? []}
          value={advanced.reply}
          onChange={(value) => setAdvanced((prev) => ({ ...prev, reply: value }))}
        />
        <FilterPicker
          title="Upstream"
          options={suggestions.data?.suggestions.upstream ?? []}
          value={advanced.upstream}
          onChange={(value) => setAdvanced((prev) => ({ ...prev, upstream: value }))}
        />
        <FilterPicker
          title="DNSSEC"
          options={suggestions.data?.suggestions.dnssec ?? []}
          value={advanced.dnssec}
          onChange={(value) => setAdvanced((prev) => ({ ...prev, dnssec: value }))}
        />

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <Button title="Clear all" variant="secondary" onPress={clearFilters} style={{ flex: 1 }} />
          <Button title="Done" onPress={() => setFiltersOpen(false)} style={{ flex: 1 }} />
        </View>
        <View style={{ height: 12 }} />
      </Sheet>
    </>
  );
}

function FilterPicker({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: string[];
  value?: string;
  onChange: (value: string | undefined) => void;
}) {
  const theme = useTheme();
  if (options.length === 0) return null;

  return (
    <ListSection title={title}>
      <View style={[styles.chips, { padding: theme.spacing.md }]}>
        {options.slice(0, 24).map((option) => {
          const selected = value === option;
          return (
            <Pressable
              key={option}
              onPress={() => {
                haptics.select();
                onChange(selected ? undefined : option);
              }}
            >
              <Badge label={option} color={selected ? theme.colors.accent : theme.colors.secondaryLabel} filled={selected} size="medium" />
            </Pressable>
          );
        })}
      </View>
    </ListSection>
  );
}

const styles = StyleSheet.create({
  toolbar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  filterChips: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 17 },
  footer: { paddingVertical: 20 },
  headerButton: { padding: 4 },
  dot: { position: 'absolute', top: 2, right: 2, width: 7, height: 7, borderRadius: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
