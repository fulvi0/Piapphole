import { Stack } from 'expo-router';
import React from 'react';
import { Alert, Pressable, View } from 'react-native';

import type { GroupItem } from '@/api/types';
import { useGroupMutations, useGroups } from '@/hooks/usePihole';
import { useTheme } from '@/theme';
import {
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
  Sheet,
  Text,
} from '@/ui';
import { confirmDestructive } from '@/utils/confirm';
import { formatDate } from '@/utils/format';
import { haptics } from '@/utils/haptics';

interface DraftGroup {
  original?: GroupItem;
  name: string;
  comment: string;
  enabled: boolean;
}

export default function GroupsScreen() {
  const theme = useTheme();
  const [draft, setDraft] = React.useState<DraftGroup | null>(null);
  const { data, isLoading, error, refetch } = useGroups();
  const { add, update, remove } = useGroupMutations();

  const groups = data?.groups ?? [];

  const save = () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      Alert.alert('Enter a name', 'Groups need a name so you can assign clients to them.');
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
          name: draft.original.name,
          changes: { name, comment: draft.comment.trim() || null, enabled: draft.enabled },
        },
        handlers,
      );
    } else {
      add.mutate({ name, comment: draft.comment.trim() || null, enabled: draft.enabled }, handlers);
    }
  };

  const del = async (group: GroupItem) => {
    if (group.id === 0) {
      Alert.alert('Default group', 'The Default group is built in and cannot be removed.');
      return;
    }
    const ok = await confirmDestructive({
      title: `Delete “${group.name}”?`,
      message: 'Rules and clients assigned to it fall back to the Default group.',
    });
    if (!ok) return;
    remove.mutate(group.name, {
      onSuccess: () => haptics.success(),
      onError: (mutationError) => Alert.alert('Could not delete', mutationError.message),
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Groups',
          headerRight: () => (
            <Pressable
              onPress={() => {
                haptics.light();
                setDraft({ name: '', comment: '', enabled: true });
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
          {isLoading && !data ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : groups.length === 0 ? (
            <EmptyState
              icon="group"
              title="No groups yet"
              message="Groups let you apply different blocking rules to different devices."
              actionTitle="Create a group"
              onAction={() => setDraft({ name: '', comment: '', enabled: true })}
            />
          ) : (
            <>
              <ListSection footer="Assign clients to a group under Manage › Clients, then attach rules and lists to it.">
                {groups.map((group) => (
                  <ListRow
                    key={group.id}
                    title={group.name}
                    subtitle={group.comment ?? `Created ${formatDate(group.date_added)}`}
                    icon="group"
                    iconColor={group.enabled ? theme.colors.forwarded : theme.colors.tertiaryLabel}
                    detail={group.enabled ? undefined : 'disabled'}
                    onPress={() =>
                      setDraft({
                        original: group,
                        name: group.name,
                        comment: group.comment ?? '',
                        enabled: group.enabled,
                      })
                    }
                    onLongPress={() => void del(group)}
                  />
                ))}
              </ListSection>
              <Text variant="caption1" tone="tertiary" center style={{ marginTop: 16 }}>
                Long-press a group to delete it.
              </Text>
            </>
          )}
        </ConnectionGate>
      </Screen>

      <Sheet
        visible={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.original ? 'Edit group' : 'New group'}
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
              label="Name"
              placeholder="Kids devices"
              value={draft.name}
              onChangeText={(value) => setDraft({ ...draft, name: value })}
              autoCapitalize="words"
            />
            <View style={{ height: 16 }} />
            <Field
              label="Comment"
              placeholder="What this group is for"
              value={draft.comment}
              onChangeText={(value) => setDraft({ ...draft, comment: value })}
            />
            <ListSection>
              <ListRow
                title="Enabled"
                switchValue={draft.enabled}
                onSwitchChange={(value) => setDraft({ ...draft, enabled: value })}
                chevron={false}
              />
            </ListSection>
            {draft.original && draft.original.id !== 0 ? (
              <Button
                title="Delete group"
                variant="destructive"
                fullWidth
                icon="trash"
                style={{ marginTop: 20 }}
                onPress={async () => {
                  const group = draft.original!;
                  setDraft(null);
                  await del(group);
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
