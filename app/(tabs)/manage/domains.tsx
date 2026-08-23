import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DomainItem, DomainKind, DomainType } from '@/api/types';
import { GroupPicker } from '@/components/GroupPicker';
import { useDomainMutations, useDomains } from '@/hooks/usePihole';
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
import { formatDate } from '@/utils/format';
import { confirmDestructive } from '@/utils/confirm';
import { haptics } from '@/utils/haptics';

interface DraftDomain {
  original?: DomainItem;
  domain: string;
  type: DomainType;
  kind: DomainKind;
  comment: string;
  groups: number[];
  enabled: boolean;
}

export default function DomainsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ type?: DomainType }>();

  const [type, setType] = React.useState<DomainType>(params.type === 'deny' ? 'deny' : 'allow');
  const [kind, setKind] = React.useState<'all' | DomainKind>('all');
  const [search, setSearch] = React.useState('');
  const [draft, setDraft] = React.useState<DraftDomain | null>(null);

  const { data, isLoading, error, refetch, isRefetching } = useDomains();
  const { add, update, remove } = useDomainMutations();

  const items = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.domains ?? [])
      .filter((item) => item.type === type)
      .filter((item) => (kind === 'all' ? true : item.kind === kind))
      .filter((item) =>
        term
          ? item.domain.toLowerCase().includes(term) || (item.comment ?? '').toLowerCase().includes(term)
          : true,
      )
      .sort((a, b) => b.date_modified - a.date_modified);
  }, [data, kind, search, type]);

  const openNew = () => {
    haptics.light();
    setDraft({ domain: '', type, kind: 'exact', comment: '', groups: [0], enabled: true });
  };

  const openEdit = (item: DomainItem) => {
    setDraft({
      original: item,
      domain: item.domain,
      type: item.type,
      kind: item.kind,
      comment: item.comment ?? '',
      groups: item.groups ?? [0],
      enabled: item.enabled,
    });
  };

  const save = () => {
    if (!draft) return;
    const value = draft.domain.trim();
    if (!value) {
      Alert.alert('Enter a domain', 'Type the domain or, for regex filters, the pattern to match.');
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
          original: draft.original,
          changes: {
            type: draft.type,
            kind: draft.kind,
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
          domain: value,
          type: draft.type,
          kind: draft.kind,
          comment: draft.comment.trim() || null,
          groups: draft.groups,
          enabled: draft.enabled,
        },
        handlers,
      );
    }
  };

  const del = async (item: DomainItem) => {
    const ok = await confirmDestructive({
      title: `Remove ${item.domain}?`,
      message: 'The rule is deleted immediately.',
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    remove.mutate(item, {
      onSuccess: () => haptics.success(),
      onError: (mutationError) => Alert.alert('Could not remove', mutationError.message),
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: type === 'allow' ? 'Allowlist' : 'Denylist',
          headerRight: () => (
            <Pressable onPress={openNew} hitSlop={10}>
              <Icon name="plus" size={20} color={theme.colors.accent} />
            </Pressable>
          ),
        }}
      />
      <View style={{ flex: 1, backgroundColor: theme.colors.groupedBackground }}>
        <ConnectionGate>
          <View style={styles.toolbar}>
            <Segmented
              value={type}
              onChange={setType}
              options={[
                { value: 'allow', label: 'Allowlist' },
                { value: 'deny', label: 'Denylist' },
              ]}
            />
            <View style={{ height: 10 }} />
            <Segmented
              value={kind}
              onChange={setKind}
              options={[
                { value: 'all', label: 'All' },
                { value: 'exact', label: 'Exact' },
                { value: 'regex', label: 'Regex' },
              ]}
            />
            <View style={{ height: 10 }} />
            <SearchField value={search} onChangeText={setSearch} placeholder="Search rules" />
          </View>

          {isLoading && !data ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => String(item.id)}
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingHorizontal: 16 }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => openEdit(item)}
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
                    <Text variant="subhead" weight="500" mono={item.kind === 'regex'} numberOfLines={2}>
                      {item.domain}
                    </Text>
                    <View style={styles.metaRow}>
                      <Badge
                        label={item.kind === 'regex' ? 'REGEX' : 'EXACT'}
                        color={item.kind === 'regex' ? theme.colors.warning : theme.colors.secondaryLabel}
                      />
                      {!item.enabled ? <Badge label="DISABLED" color={theme.colors.tertiaryLabel} /> : null}
                      <Text variant="caption2" tone="tertiary">
                        added {formatDate(item.date_added)}
                      </Text>
                    </View>
                    {item.comment ? (
                      <Text variant="caption1" tone="secondary" numberOfLines={2} style={{ marginTop: 4 }}>
                        {item.comment}
                      </Text>
                    ) : null}
                  </View>
                  <Icon name="chevron" size={14} color={theme.colors.tertiaryLabel} />
                </Pressable>
              )}
              ListEmptyComponent={
                <EmptyState
                  icon={type === 'allow' ? 'allow' : 'block'}
                  title={search ? 'Nothing matches' : `No ${type === 'allow' ? 'allow' : 'deny'} rules yet`}
                  message={
                    search
                      ? 'Try a different search term.'
                      : 'Add a domain to always let it through, or a regex to match a whole family of hosts.'
                  }
                  actionTitle={search ? undefined : 'Add a rule'}
                  onAction={search ? undefined : openNew}
                />
              }
            />
          )}
        </ConnectionGate>
      </View>

      <Sheet
        visible={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.original ? 'Edit rule' : 'New rule'}
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
              label={draft.kind === 'regex' ? 'Regular expression' : 'Domain'}
              placeholder={draft.kind === 'regex' ? '(^|\\.)ads?\\.example\\.com$' : 'ads.example.com'}
              value={draft.domain}
              onChangeText={(value) => setDraft({ ...draft, domain: value })}
              editable={!draft.original}
              autoCapitalize="none"
              autoCorrect={false}
              hint={draft.original ? 'The domain itself cannot be changed — remove and re-add instead.' : undefined}
              style={draft.kind === 'regex' ? { fontFamily: theme.monoFont } : undefined}
            />

            <View style={{ height: 16 }} />
            <Text variant="footnote" tone="secondary" style={{ marginBottom: 8, marginLeft: 2 }}>
              List
            </Text>
            <Segmented
              value={draft.type}
              onChange={(value) => setDraft({ ...draft, type: value })}
              options={[
                { value: 'allow', label: 'Allow' },
                { value: 'deny', label: 'Deny' },
              ]}
            />

            <View style={{ height: 16 }} />
            <Text variant="footnote" tone="secondary" style={{ marginBottom: 8, marginLeft: 2 }}>
              Match
            </Text>
            <Segmented
              value={draft.kind}
              onChange={(value) => setDraft({ ...draft, kind: value })}
              options={[
                { value: 'exact', label: 'Exact' },
                { value: 'regex', label: 'Regex' },
              ]}
            />

            <View style={{ height: 16 }} />
            <Field
              label="Comment"
              placeholder="Why this rule exists"
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
              <Button
                title="Remove rule"
                variant="destructive"
                fullWidth
                icon="trash"
                style={{ marginTop: 20 }}
                loading={remove.isPending}
                onPress={async () => {
                  const item = draft.original!;
                  setDraft(null);
                  await del(item);
                }}
              />
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
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
});
