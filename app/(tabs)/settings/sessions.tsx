import { Stack } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';

import { useDeleteApiSession, useSessions } from '@/hooks/usePihole';
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
  Text,
} from '@/ui';
import { confirmDestructive } from '@/utils/confirm';
import { formatDateTime, formatRelative } from '@/utils/format';
import { haptics } from '@/utils/haptics';

/** Lists the API sessions the Pi-hole itself is tracking, and can revoke them. */
export default function SessionsScreen() {
  const theme = useTheme();
  const { data, isLoading, error, refetch } = useSessions();
  const deleteSession = useDeleteApiSession();

  const revoke = async (id: number, isCurrent: boolean) => {
    const ok = await confirmDestructive({
      title: 'Revoke this session?',
      message: isCurrent
        ? 'This is the session Piapphole is using. It will sign in again automatically.'
        : 'The client using this session will have to sign in again.',
      confirmLabel: 'Revoke',
    });
    if (!ok) return;
    deleteSession.mutate(id, {
      onSuccess: () => haptics.success(),
      onError: (mutationError) => Alert.alert('Could not revoke', mutationError.message),
    });
  };

  const sessions = (data?.sessions ?? []).slice().sort((a, b) => b.last_active - a.last_active);

  return (
    <>
      <Stack.Screen options={{ title: 'Active sessions' }} />
      <Screen onRefresh={refetch}>
        <ConnectionGate>
          {isLoading && !data ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : sessions.length === 0 ? (
            <EmptyState icon="key" title="No sessions" message="Nothing is currently signed in to this Pi-hole." />
          ) : (
            <>
              <ListSection footer="Long-press a session to revoke it.">
                {sessions.map((session) => (
                  <ListRow
                    key={session.id}
                    title={session.remote_addr}
                    subtitle={[
                      session.user_agent ?? 'unknown client',
                      `active ${formatRelative(session.last_active)}`,
                      `expires ${formatDateTime(session.valid_until)}`,
                    ].join(' · ')}
                    icon={session.current_session ? 'shield' : 'key'}
                    iconColor={session.current_session ? theme.colors.accent : theme.colors.secondaryLabel}
                    numberOfLines={3}
                    right={
                      session.current_session ? (
                        <Badge label="THIS APP" color={theme.colors.accent} />
                      ) : session.app ? (
                        <Badge label="APP PW" color={theme.colors.info} />
                      ) : session.cli ? (
                        <Badge label="CLI" color={theme.colors.secondaryLabel} />
                      ) : undefined
                    }
                    chevron={false}
                    onLongPress={() => void revoke(session.id, session.current_session)}
                  />
                ))}
              </ListSection>
              <Text variant="caption1" tone="tertiary" center style={{ marginTop: 16 }}>
                Sessions expire automatically after 30 minutes of inactivity by default.
              </Text>
            </>
          )}
        </ConnectionGate>
      </Screen>
    </>
  );
}
