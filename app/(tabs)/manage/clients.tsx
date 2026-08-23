import { Stack } from 'expo-router';
import React from 'react';
import { Alert, Pressable, View } from 'react-native';

import type { ClientItem } from '@/api/types';
import { GroupPicker } from '@/components/GroupPicker';
import { useClientMutations, useClientSuggestions, useClients, useGroups } from '@/hooks/usePihole';
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
  Screen,
  SearchField,
  Sheet,
  Text,
} from '@/ui';
import { confirmDestructive } from '@/utils/confirm';
import { formatRelative } from '@/utils/format';
import { haptics } from '@/utils/haptics';

interface DraftClient {
  original?: ClientItem;
  client: string;
  comment: string;
  groups: number[];
}

export default function ClientsScreen() {
  const theme = useTheme();
  const [draft, setDraft] = React.useState<DraftClient | null>(null);
  const [search, setSearch] = React.useState('');
  const [suggestionsOpen, setSuggestionsOpen] = React.useState(false);

  const { data, isLoading, error, refetch } = useClients();
  const groups = useGroups();
  const suggestions = useClientSuggestions();
  const { add, update, remove } = useClientMutations();

  const clients = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.clients ?? []).filter((item) =>
      term ? item.client.toLowerCase().includes(term) || (item.comment ?? '').toLowerCase().includes(term) : true,
    );
  }, [data, search]);

  const groupNames = React.useMemo(() => {
    const map = new Map<number, string>();
    for (const group of groups.data?.groups ?? []) map.set(group.id, group.name);
    return map;
  }, [groups.data]);

  const save = () => {
    if (!draft) return;
    const client = draft.client.trim();
    if (!client) {
      Alert.alert('Enter a client', 'Use an IP address, MAC address, hostname or interface name.');
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
        { client: draft.original.client, changes: { comment: draft.comment.trim() || null, groups: draft.groups } },
        handlers,
      );
    } else {
      add.mutate({ client, comment: draft.comment.trim() || null, groups: draft.groups }, handlers);
    }
  };

  const del = async (client: ClientItem) => {
    const ok = await confirmDestructive({
      title: `Remove ${client.client}?`,
      message: 'The device keeps using the Default group afterwards.',
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    remove.mutate(client.client, {
      onSuccess: () => haptics.success(),
      onError: (mutationError) => Alert.alert('Could not remove', mutationError.message),
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Clients',
          headerRight: () => (
            <Pressable
              onPress={() => {
                haptics.light();
                setDraft({ client: '', comment: '', groups: [0] });
              }}
              hitSlop={10}
            >
              <Icon name="plus" size={20} color={theme.colors.accent} />
            </Pressable>
          ),
        }}
      />
      <Screen onRefresh={refetch}>
        <ConnectionGate>
          <View style={{ marginTop: 8 }}>
            <SearchField value={search} onChangeText={setSearch} placeholder="Search clients" />
          </View>

          {isLoading && !data ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : clients.length === 0 ? (
            <EmptyState
              icon="client"
              title={search ? 'Nothing matches' : 'No clients configured'}
              message={
                search
                  ? 'Try a different search term.'
                  : 'Every device uses the Default group until you assign it here.'
              }
              actionTitle={search ? undefined : 'Add from the network'}
              onAction={search ? undefined : () => setSuggestionsOpen(true)}
            />
          ) : (
            <ListSection footer="Long-press a client to remove it.">
              {clients.map((client) => (
                <ListRow
                  key={client.id}
                  title={client.name ? `${client.name}` : client.client}
                  subtitle={
                    [client.name ? client.client : null, client.comment]
                      .filter(Boolean)
                      .join(' · ') || undefined
                  }
                  icon="client"
                  iconColor={theme.colors.cached}
                  detail={(client.groups ?? [])
                    .map((id) => groupNames.get(id) ?? `#${id}`)
                    .join(', ')}
                  onPress={() =>
                    setDraft({
                      original: client,
                      client: client.client,
                      comment: client.comment ?? '',
                      groups: client.groups ?? [0],
                    })
                  }
                  onLongPress={() => void del(client)}
                />
              ))}
            </ListSection>
          )}

          <ListSection title="Discover">
            <ListRow
              title="Devices seen on the network"
              subtitle="Pick from clients your Pi-hole already knows"
              icon="network"
              onPress={() => setSuggestionsOpen(true)}
            />
          </ListSection>
        </ConnectionGate>
      </Screen>

      <Sheet
        visible={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.original ? 'Edit client' : 'New client'}
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
              label="Client"
              placeholder="192.168.1.42, aa:bb:cc:dd:ee:ff, laptop.lan"
              value={draft.client}
              onChangeText={(value) => setDraft({ ...draft, client: value })}
              editable={!draft.original}
              autoCapitalize="none"
              autoCorrect={false}
              hint="IP address, MAC address, hostname or interface (prefix interfaces with a colon, e.g. :eth0)."
            />
            <View style={{ height: 16 }} />
            <Field
              label="Comment"
              placeholder="Living-room TV"
              value={draft.comment}
              onChangeText={(value) => setDraft({ ...draft, comment: value })}
            />
            <View style={{ height: 16 }} />
            <GroupPicker value={draft.groups} onChange={(nextGroups) => setDraft({ ...draft, groups: nextGroups })} />
            {draft.original ? (
              <Button
                title="Remove client"
                variant="destructive"
                fullWidth
                icon="trash"
                style={{ marginTop: 20 }}
                onPress={async () => {
                  const client = draft.original!;
                  setDraft(null);
                  await del(client);
                }}
              />
            ) : null}
            <View style={{ height: 20 }} />
          </>
        ) : null}
      </Sheet>

      <Sheet
        visible={suggestionsOpen}
        onClose={() => setSuggestionsOpen(false)}
        title="Devices on your network"
        subtitle="Tap one to add it as a client"
      >
        {suggestions.isLoading ? (
          <LoadingState />
        ) : (suggestions.data?.clients.length ?? 0) === 0 ? (
          <EmptyState icon="network" title="Nothing discovered yet" message="Pi-hole has not seen any new devices." />
        ) : (
          <ListSection>
            {(suggestions.data?.clients ?? []).slice(0, 60).map((suggestion, index) => {
              const address = suggestion.addresses?.split(',')[0] ?? suggestion.hwaddr ?? '';
              const name = suggestion.names?.split(',')[0];
              return (
                <ListRow
                  key={`${suggestion.hwaddr ?? 'unknown'}-${index}`}
                  title={name || address || 'Unknown device'}
                  subtitle={[address !== name ? address : null, suggestion.macVendor]
                    .filter(Boolean)
                    .join(' · ')}
                  icon="device"
                  right={
                    <Badge label={formatRelative(suggestion.lastQuery)} color={theme.colors.tertiaryLabel} />
                  }
                  onPress={() => {
                    setSuggestionsOpen(false);
                    setDraft({ client: address, comment: name ?? '', groups: [0] });
                  }}
                />
              );
            })}
          </ListSection>
        )}
        <Text variant="caption2" tone="tertiary" center style={{ marginTop: 14 }}>
          Suggestions come from the Pi-hole network table.
        </Text>
        <View style={{ height: 12 }} />
      </Sheet>
    </>
  );
}
