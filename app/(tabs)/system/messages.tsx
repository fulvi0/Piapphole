import { Stack } from 'expo-router';
import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { useDeleteMessage, useMessages } from '@/hooks/usePihole';
import { useTheme } from '@/theme';
import {
  Badge,
  ConnectionGate,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  Screen,
  Text,
} from '@/ui';
import { confirmDestructive } from '@/utils/confirm';
import { formatDateTime, stripHtml } from '@/utils/format';
import { haptics } from '@/utils/haptics';

/** FTL's own diagnostics — the same list the web dashboard shows in red. */
export default function MessagesScreen() {
  const theme = useTheme();
  const { data, isLoading, error, refetch } = useMessages();
  const deleteMessage = useDeleteMessage();

  const dismiss = async (id: number, plain: string) => {
    const ok = await confirmDestructive({
      title: 'Dismiss this message?',
      message: plain,
      confirmLabel: 'Dismiss',
    });
    if (!ok) return;
    deleteMessage.mutate(id, {
      onSuccess: () => haptics.success(),
      onError: (mutationError) => Alert.alert('Could not dismiss', mutationError.message),
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Diagnostics' }} />
      <Screen onRefresh={refetch}>
        <ConnectionGate>
          {isLoading && !data ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : (data?.messages.length ?? 0) === 0 ? (
            <EmptyState
              icon="check"
              title="All clear"
              message="Pi-hole has not reported any problems."
            />
          ) : (
            <View style={{ gap: 10, marginTop: 16 }}>
              {(data?.messages ?? []).map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.card,
                    { backgroundColor: theme.colors.card, borderRadius: theme.radii.md },
                    theme.dark ? null : theme.shadow.card,
                  ]}
                >
                  <View style={styles.headerRow}>
                    <Badge label={message.type} color={theme.colors.warning} />
                    <Text variant="caption2" tone="tertiary" style={{ flex: 1 }}>
                      {formatDateTime(message.timestamp)}
                    </Text>
                    <Pressable onPress={() => void dismiss(message.id, message.plain)} hitSlop={10}>
                      <Icon name="close" size={14} color={theme.colors.tertiaryLabel} />
                    </Pressable>
                  </View>
                  <Text variant="subhead" style={{ marginTop: 8 }}>
                    {stripHtml(message.html || message.plain)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ConnectionGate>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
