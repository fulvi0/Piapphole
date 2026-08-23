import { Stack } from 'expo-router';
import React from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AdList, ListType } from '@/api/types';
import { GroupPicker } from '@/components/GroupPicker';
import { useListMutations, useLists } from '@/hooks/usePihole';
import { useTheme } from '@/theme';
import {
  Badge,
  Button,
  ConnectionGate,
  EmptyState,
  ErrorState,
  Field,
  Icon,
  ListRow,
  ListSection,
  LoadingState,
  SearchField,
  Segmented,
  Sheet,
  Text,
} from '@/ui';
import { confirmDestructive } from '@/utils/confirm';
import { formatNumber, formatRelative, truncateMiddle } from '@/utils/format';
import { haptics } from '@/utils/haptics';

interface DraftList {
  original?: AdList;
  address: string;
  type: ListType;
  comment: string;
  groups: number[];
  enabled: boolean;
}

/** Pi-hole reports adlist health as a small integer; translate it for humans. */
function describeStatus(status: number, theme: ReturnType<typeof useTheme>) {
  switch (status) {
    case 1:
      return { label: 'DOWNLOADED', color: theme.colors.success };
    case 2:
      return { label: 'CACHED', color: theme.colors.info };
    case 3:
      return { label: 'DOWNLOAD FAILED', color: theme.colors.danger };
    case 4:
      return { label: 'UNAVAILABLE', color: theme.colors.warning };
    default:
      return { label: 'NOT RUN YET', color: theme.colors.tertiaryLabel };
  }
}

export default function ListsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = React.useState<'all' | ListType>('all');
  const [search, setSearch] = React.useState('');
  const [draft, setDraft] = React.useState<DraftList | null>(null);

  const { data, isLoading, error, refetch, isRefetching } = useLists();
  const { add, update, remove } = useListMutations();

  const items = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.lists ?? [])
      .filter((item) => (filter === 'all' ? true : item.type === filter))
      .filter((item) =>
        term ? item.address.toLowerCase().includes(term) || (item.comment ?? '').toLowerCase().includes(term) : true,
      );
  }, [data, filter, search]);

  const totals = React.useMemo(() => {
    const lists = data?.lists ?? [];
    return {
      domains: lists.reduce((sum, item) => sum + (item.enabled ? item.number : 0), 0),
      failing: lists.filter((item) => item.status === 3 || item.status === 4).length,
    };
  }, [data]);

  const save = () => {
    if (!draft) return;
    const address = draft.address.trim();
    if (!address) {
      Alert.alert('Enter an address', 'Paste the URL of the list you want to subscribe to.');
      return;
    }
    const handlers = {
      onSuccess: () => {
        haptics.success();
        setDraft(null);
      },
      onError: (mutationError: Error) => {
        haptics.error();
        Alert.alert('Could not save', mutationError.message);
      },
    };

    if (draft.original) {
      update.mutate(
        {
          address: draft.original.address,
          changes: {
            type: draft.type,
            comment: draft.comment.trim() || null,
            groups: draft.groups,
            enabled: draft.enabled,
          },
        },
        handlers,
      );
    } else {
      add.mutate(
        {
          address,
          type: draft.type,
          comment: draft.comment.trim() || null,
          groups: draft.groups,
          enabled: draft.enabled,
        },
        handlers,
      );
    }
  };

  const del = async (item: AdList) => {
    const ok = await confirmDestructive({
      title: 'Unsubscribe from this list?',
      message: `${item.address}\n\nRun gravity afterwards to drop its domains.`,
      confirmLabel: 'Unsubscribe',
    });
    if (!ok) return;
    remove.mutate(
      { address: item.address, type: item.type },
      {
        onSuccess: () => haptics.success(),
        onError: (mutationError) => Alert.alert('Could not remove', mutationError.message),
      },
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Subscribed lists',
          headerRight: () => (
            <Pressable
              onPress={() => {
                haptics.light();
                setDraft({ address: '', type: 'block', comment: '', groups: [0], enabled: true });
              }}
              hitSlop={10}
            >
              <Icon name="plus" size={20} color={theme.colors.accent} />
            </Pressable>
          ),
        }}
      />
      <View style={{ flex: 1, backgroundColor: theme.colors.groupedBackground }}>
        <ConnectionGate>
          <View style={styles.toolbar}>
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'block', label: 'Blocklists' },
                { value: 'allow', label: 'Allowlists' },
              ]}
            />
            <View style={{ height: 10 }} />
            <SearchField value={search} onChangeText={setSearch} placeholder="Search lists" />
            <View style={styles.summaryRow}>
              <Text variant="caption1" tone="secondary">
                {formatNumber(totals.domains)} domains from enabled lists
              </Text>
              {totals.failing > 0 ? (
                <Badge label={`${totals.failing} FAILING`} color={theme.colors.danger} />
              ) : null}
            </View>
          </View>

          {isLoading && !data ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => `${item.type}:${item.id}`}
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingHorizontal: 16 }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => {
                const status = describeStatus(item.status, theme);
                return (
                  <Pressable
                    onPress={() =>
                      setDraft({
                        original: item,
                        address: item.address,
                        type: item.type,
                        comment: item.comment ?? '',
                        groups: item.groups ?? [0],
                        enabled: item.enabled,
                      })
                    }
                    onLongPress={() => void del(item)}
                    style={({ pressed }) => [
                      styles.card,
                      {
                        backgroundColor: pressed ? theme.colors.cardPressed : theme.colors.card,
                        borderRadius: theme.radii.md,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text variant="subhead" weight="500" numberOfLines={2}>
                        {item.comment || truncateMiddle(item.address, 54)}
                      </Text>
                      {item.comment ? (
                        <Text variant="caption2" tone="tertiary" numberOfLines={1} style={{ marginTop: 2 }}>
                          {truncateMiddle(item.address, 54)}
                        </Text>
                      ) : null}
                      <View style={styles.metaRow}>
                        <Badge
                          label={item.type === 'block' ? 'BLOCK' : 'ALLOW'}
                          color={item.type === 'block' ? theme.colors.blocked : theme.colors.success}
                        />
                        <Badge label={status.label} color={status.color} />
                        {!item.enabled ? <Badge label="DISABLED" color={theme.colors.tertiaryLabel} /> : null}
                      </View>
                      <Text variant="caption2" tone="tertiary" style={{ marginTop: 6 }}>
                        {formatNumber(item.number)} domains
                        {item.invalid_domains > 0 ? ` · ${formatNumber(item.invalid_domains)} invalid` : ''}
                        {` · updated ${formatRelative(item.date_updated)}`}
                      </Text>
                    </View>
                    <Icon name="chevron" size={14} color={theme.colors.tertiaryLabel} />
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <EmptyState
                  icon="list"
                  title={search ? 'Nothing matches' : 'No lists subscribed'}
                  message={
                    search
                      ? 'Try a different search term.'
                      : 'Subscribe to a blocklist URL to start filtering, then run gravity.'
                  }
                />
              }
            />
          )}
        </ConnectionGate>
      </View>

      <Sheet
        visible={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.original ? 'Edit list' : 'Subscribe to a list'}
        action={
          <Button
            title="Save"
            variant="plain"
            size="small"
            loading={add.isPending || update.isPending}
            onPress={save}
          />
        }
      >
        {draft ? (
          <>
            <Field
              label="List URL"
              placeholder="https://example.com/hosts.txt"
              value={draft.address}
              onChangeText={(value) => setDraft({ ...draft, address: value })}
              editable={!draft.original}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              hint={draft.original ? 'The address cannot be changed — remove and re-add instead.' : undefined}
            />

            <View style={{ height: 16 }} />
            <Text variant="footnote" tone="secondary" style={{ marginBottom: 8, marginLeft: 2 }}>
              Type
            </Text>
            <Segmented
              value={draft.type}
              onChange={(value) => setDraft({ ...draft, type: value })}
              options={[
                { value: 'block', label: 'Blocklist' },
                { value: 'allow', label: 'Allowlist' },
              ]}
            />

            <View style={{ height: 16 }} />
            <Field
              label="Comment"
              placeholder="Where this list came from"
              value={draft.comment}
              onChangeText={(value) => setDraft({ ...draft, comment: value })}
            />

            <View style={{ height: 16 }} />
            <GroupPicker value={draft.groups} onChange={(groups) => setDraft({ ...draft, groups })} />

            <ListSection>
              <ListRow
                title="Enabled"
                switchValue={draft.enabled}
                onSwitchChange={(value) => setDraft({ ...draft, enabled: value })}
                chevron={false}
              />
            </ListSection>

            {draft.original ? (
              <>
                <ListSection title="Details">
                  <ListRow title="Valid domains" detail={formatNumber(draft.original.number)} chevron={false} />
                  <ListRow
                    title="Invalid domains"
                    detail={formatNumber(draft.original.invalid_domains)}
                    chevron={false}
                  />
                  <ListRow title="ABP entries" detail={formatNumber(draft.original.abp_entries)} chevron={false} />
                  <ListRow
                    title="Last downloaded"
                    detail={formatRelative(draft.original.date_updated)}
                    chevron={false}
                  />
                </ListSection>
                <Button
                  title="Unsubscribe"
                  variant="destructive"
                  fullWidth
                  icon="trash"
                  style={{ marginTop: 20 }}
                  onPress={async () => {
                    const item = draft.original!;
                    setDraft(null);
                    await del(item);
                  }}
                />
              </>
            ) : null}
            <View style={{ height: 20 }} />
          </>
        ) : null}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  toolbar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
});
