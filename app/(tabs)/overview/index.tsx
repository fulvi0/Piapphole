import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AreaChart, BarList, DonutChart, type DonutSlice } from '@/charts';
import { BlockingControl } from '@/components/BlockingControl';
import { ServerSwitcher } from '@/components/ServerSwitcher';
import {
  useHistory,
  useMessages,
  useQueryTypes,
  useRefreshAll,
  useSummary,
  useTopClients,
  useTopDomains,
  useUpstreams,
} from '@/hooks/usePihole';
import { useTheme } from '@/theme';
import {
  Badge,
  Card,
  ConnectionGate,
  ErrorState,
  Icon,
  LoadingState,
  Screen,
  SectionHeader,
  Segmented,
  StatTile,
  Text,
} from '@/ui';
import { formatCompact, formatNumber, formatPercent, formatRelative, formatTime } from '@/utils/format';

export default function OverviewScreen() {
  const theme = useTheme();
  const router = useRouter();
  const refreshAll = useRefreshAll();

  const summary = useSummary();
  const history = useHistory();
  const queryTypes = useQueryTypes();
  const upstreams = useUpstreams();
  const messages = useMessages();

  const [topMode, setTopMode] = React.useState<'permitted' | 'blocked'>('permitted');
  const topDomains = useTopDomains(topMode === 'blocked', 8);
  const topClients = useTopClients(topMode === 'blocked', 8);

  const stats = summary.data?.queries;
  const historyPoints = React.useMemo(() => history.data?.history ?? [], [history.data]);

  const series = React.useMemo(
    () => [
      {
        key: 'cached',
        label: 'Cached',
        color: theme.colors.cached,
        values: historyPoints.map((point) => point.cached),
      },
      {
        key: 'forwarded',
        label: 'Forwarded',
        color: theme.colors.forwarded,
        values: historyPoints.map((point) => point.forwarded),
      },
      {
        key: 'blocked',
        label: 'Blocked',
        color: theme.colors.blocked,
        values: historyPoints.map((point) => point.blocked),
      },
    ],
    [historyPoints, theme.colors],
  );

  const typeSlices = React.useMemo<DonutSlice[]>(() => {
    const entries = Object.entries(queryTypes.data?.types ?? {})
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1]);
    const palette = [
      theme.colors.cached,
      theme.colors.allowed,
      theme.colors.forwarded,
      theme.colors.warning,
      theme.colors.blocked,
      theme.colors.info,
    ];
    const top = entries.slice(0, 5);
    const restTotal = entries.slice(5).reduce((sum, [, value]) => sum + value, 0);
    const slices = top.map(([key, value], index) => ({
      key,
      label: key,
      value,
      color: palette[index % palette.length],
    }));
    if (restTotal > 0) {
      slices.push({ key: 'other', label: 'Other', value: restTotal, color: theme.colors.tertiaryLabel });
    }
    return slices;
  }, [queryTypes.data, theme.colors]);

  const totalTypeQueries = typeSlices.reduce((sum, slice) => sum + slice.value, 0);

  const firstError = summary.error ?? history.error;
  const showLoading = summary.isLoading && !summary.data;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Overview',
          headerRight: () => <ServerSwitcher />,
        }}
      />
      <Screen onRefresh={refreshAll} contentContainerStyle={{ paddingTop: 4 }}>
        <ConnectionGate>
          {showLoading ? (
            <LoadingState label="Talking to your Pi-hole…" />
          ) : firstError ? (
            <ErrorState error={firstError} onRetry={() => void summary.refetch()} />
          ) : (
            <>
              <View style={{ marginTop: theme.spacing.md }}>
                <BlockingControl />
              </View>

              {(messages.data?.messages.length ?? 0) > 0 ? (
                <Card
                  style={[styles.warningCard, { borderColor: theme.colors.warning }] as never}
                >
                  <View style={styles.warningRow}>
                    <Icon name="warning" size={18} color={theme.colors.warning} />
                    <View style={{ flex: 1 }}>
                      <Text variant="subhead" weight="600">
                        {messages.data!.messages.length === 1
                          ? '1 diagnostic message'
                          : `${messages.data!.messages.length} diagnostic messages`}
                      </Text>
                      <Text variant="caption1" tone="secondary" numberOfLines={2}>
                        {messages.data!.messages[0].plain}
                      </Text>
                    </View>
                    <Text
                      variant="footnote"
                      tone="accent"
                      onPress={() => router.push('/system/messages')}
                    >
                      Review
                    </Text>
                  </View>
                </Card>
              ) : null}

              <SectionHeader title="Last 24 hours" />
              <View style={styles.grid}>
                <StatTile
                  label="Total queries"
                  value={formatCompact(stats?.total)}
                  caption={`${formatNumber(stats?.unique_domains)} unique domains`}
                  icon="globe"
                  tint={theme.colors.info}
                  onPress={() => router.push('/queries')}
                />
                <StatTile
                  label="Blocked"
                  value={formatCompact(stats?.blocked)}
                  caption={formatPercent(stats?.percent_blocked)}
                  icon="block"
                  tint={theme.colors.blocked}
                  progress={(stats?.percent_blocked ?? 0) / 100}
                  onPress={() => router.push('/queries')}
                />
              </View>
              <View style={[styles.grid, { marginTop: theme.spacing.md }]}>
                <StatTile
                  label="Domains on lists"
                  value={formatCompact(summary.data?.gravity.domains_being_blocked)}
                  caption={`Updated ${formatRelative(summary.data?.gravity.last_update)}`}
                  icon="list"
                  tint={theme.colors.allowed}
                  onPress={() => router.push('/manage/lists')}
                />
                <StatTile
                  label="Active clients"
                  value={formatNumber(summary.data?.clients.active)}
                  caption={`${formatNumber(summary.data?.clients.total)} seen in total`}
                  icon="client"
                  tint={theme.colors.forwarded}
                  onPress={() => router.push('/manage/clients')}
                />
              </View>

              <SectionHeader
                title="Query activity"
                subtitle={
                  historyPoints.length > 0
                    ? `${formatTime(historyPoints[0]?.timestamp)} – ${formatTime(
                        historyPoints[historyPoints.length - 1]?.timestamp,
                      )}`
                    : undefined
                }
              />
              <Card>
                {historyPoints.length === 0 ? (
                  <Text variant="footnote" tone="tertiary">
                    No history recorded yet.
                  </Text>
                ) : (
                  <AreaChart series={series} height={150} />
                )}
              </Card>

              <SectionHeader title="Query types" />
              <Card>
                <View style={styles.donutRow}>
                  <DonutChart
                    slices={typeSlices}
                    centerValue={formatCompact(totalTypeQueries)}
                    centerLabel="queries"
                  />
                  <View style={styles.donutLegend}>
                    {typeSlices.map((slice) => (
                      <View key={slice.key} style={styles.legendRow}>
                        <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                        <Text variant="subhead" style={{ flex: 1 }} numberOfLines={1}>
                          {slice.label}
                        </Text>
                        <Text variant="subhead" tone="secondary">
                          {totalTypeQueries > 0 ? formatPercent((slice.value / totalTypeQueries) * 100, 0) : '—'}
                        </Text>
                      </View>
                    ))}
                    {typeSlices.length === 0 ? (
                      <Text variant="footnote" tone="tertiary">
                        No queries recorded yet.
                      </Text>
                    ) : null}
                  </View>
                </View>
              </Card>

              <SectionHeader
                title="Top lists"
                action={
                  <View style={{ width: 190 }}>
                    <Segmented
                      value={topMode}
                      onChange={setTopMode}
                      options={[
                        { value: 'permitted', label: 'Permitted' },
                        { value: 'blocked', label: 'Blocked' },
                      ]}
                    />
                  </View>
                }
              />
              <Card>
                <Text variant="footnote" tone="secondary" style={styles.cardTitle}>
                  {topMode === 'blocked' ? 'Most blocked domains' : 'Most requested domains'}
                </Text>
                <BarList
                  color={topMode === 'blocked' ? theme.colors.blocked : theme.colors.info}
                  items={(topDomains.data?.domains ?? []).map((entry) => ({
                    key: entry.domain,
                    label: entry.domain,
                    value: entry.count,
                  }))}
                  onPressItem={(item) => router.push({ pathname: '/queries', params: { domain: item.label } })}
                />
              </Card>

              <Card style={{ marginTop: theme.spacing.md }}>
                <Text variant="footnote" tone="secondary" style={styles.cardTitle}>
                  {topMode === 'blocked' ? 'Clients with most blocks' : 'Most active clients'}
                </Text>
                <BarList
                  color={topMode === 'blocked' ? theme.colors.blocked : theme.colors.allowed}
                  items={(topClients.data?.clients ?? []).map((entry) => ({
                    key: entry.ip,
                    label: entry.name || entry.ip,
                    sublabel: entry.name ? entry.ip : undefined,
                    value: entry.count,
                  }))}
                  onPressItem={(item) =>
                    router.push({ pathname: '/queries', params: { client: item.sublabel ?? item.label } })
                  }
                />
              </Card>

              <SectionHeader
                title="Upstream servers"
                subtitle={
                  upstreams.data
                    ? `${formatNumber(upstreams.data.forwarded_queries)} of ${formatNumber(
                        upstreams.data.total_queries,
                      )} queries forwarded`
                    : undefined
                }
              />
              <Card>
                <BarList
                  color={theme.colors.forwarded}
                  items={(upstreams.data?.upstreams ?? []).map((entry) => ({
                    key: `${entry.ip}:${entry.port}`,
                    label: entry.name || entry.ip || 'unknown',
                    sublabel:
                      entry.statistics.response > 0
                        ? `${(entry.statistics.response * 1000).toFixed(1)} ms average response`
                        : 'served locally',
                    value: entry.count,
                  }))}
                />
              </Card>

              <View style={styles.footerNote}>
                <Badge label={`${formatNumber(stats?.frequency ?? 0)} queries/s`} color={theme.colors.secondaryLabel} />
                <Badge label={`${formatCompact(stats?.cached)} cached`} color={theme.colors.cached} />
                <Badge label={`${formatCompact(stats?.forwarded)} forwarded`} color={theme.colors.forwarded} />
              </View>
            </>
          )}
        </ConnectionGate>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 12 },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  donutLegend: { flex: 1, gap: 7 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 9, height: 9, borderRadius: 3 },
  cardTitle: { marginBottom: 10, letterSpacing: 0.4 },
  warningCard: { marginTop: 12, borderWidth: StyleSheet.hairlineWidth },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footerNote: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20, justifyContent: 'center' },
});
