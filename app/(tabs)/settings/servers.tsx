import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { PiholeClient } from '@/api/client';
import { useServers, type PiholeServer } from '@/store/servers';
import { useTheme } from '@/theme';
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Icon,
  ListRow,
  ListSection,
  Screen,
  Sheet,
  Text,
  describeError,
} from '@/ui';
import { confirmDestructive } from '@/utils/confirm';
import { formatDate } from '@/utils/format';
import { haptics } from '@/utils/haptics';

interface DraftServer {
  server: PiholeServer;
  name: string;
  baseUrl: string;
  password: string;
  changePassword: boolean;
}

export default function ServersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { servers, activeServer, selectServer, removeServer, updateServer, getPassword } = useServers();

  const [draft, setDraft] = React.useState<DraftServer | null>(null);
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ ok: boolean; message: string } | null>(null);

  const openEdit = (server: PiholeServer) => {
    haptics.light();
    setTestResult(null);
    // The stored password stays hidden; it is only replaced when asked for.
    setDraft({ server, name: server.name, baseUrl: server.baseUrl, password: '', changePassword: false });
  };

  const save = async () => {
    if (!draft) return;
    await updateServer(draft.server.id, {
      name: draft.name.trim() || draft.server.name,
      baseUrl: draft.baseUrl.trim() || draft.server.baseUrl,
      ...(draft.changePassword ? { password: draft.password } : {}),
    });
    haptics.success();
    setDraft(null);
  };

  const test = async () => {
    if (!draft) return;
    setTesting(true);
    setTestResult(null);
    try {
      const password = draft.changePassword
        ? draft.password
        : ((await getPassword(draft.server.id)) ?? undefined);
      const client = new PiholeClient({ baseUrl: draft.baseUrl, password: password || undefined });
      if (draft.server.passwordless) await client.checkAuth();
      else await client.login();
      const summary = await client.summary();
      await client.logout();
      haptics.success();
      setTestResult({
        ok: true,
        message: `Connected. ${summary.queries.total.toLocaleString()} queries in the last 24 hours.`,
      });
    } catch (error) {
      haptics.error();
      setTestResult({ ok: false, message: describeError(error).message });
    } finally {
      setTesting(false);
    }
  };

  const remove = async (server: PiholeServer) => {
    const ok = await confirmDestructive({
      title: `Remove ${server.name}?`,
      message: 'The stored password is deleted from this device. Your Pi-hole itself is untouched.',
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    await removeServer(server.id);
    haptics.success();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Pi-hole servers',
          headerRight: () => (
            <Pressable onPress={() => router.push('/connect')} hitSlop={10}>
              <Icon name="plus" size={20} color={theme.colors.accent} />
            </Pressable>
          ),
        }}
      />
      <Screen>
        {servers.length === 0 ? (
          <EmptyState
            icon="server"
            title="No servers yet"
            message="Add a Pi-hole to start monitoring it."
            actionTitle="Add a Pi-hole"
            onAction={() => router.push('/connect')}
          />
        ) : (
          <>
            <ListSection footer="Tap a server to edit it, or long-press to remove it.">
              {servers.map((server) => (
                <ListRow
                  key={server.id}
                  title={server.name}
                  subtitle={server.baseUrl}
                  icon="server"
                  iconColor={server.id === activeServer?.id ? theme.colors.accent : theme.colors.secondaryLabel}
                  right={
                    server.id === activeServer?.id ? (
                      <Badge label="ACTIVE" color={theme.colors.accent} />
                    ) : undefined
                  }
                  numberOfLines={2}
                  onPress={() => openEdit(server)}
                  onLongPress={() => void remove(server)}
                />
              ))}
            </ListSection>

            <ListSection title="Switch">
              {servers.map((server) => (
                <ListRow
                  key={`select-${server.id}`}
                  title={`Use ${server.name}`}
                  icon="check"
                  iconColor={server.id === activeServer?.id ? theme.colors.success : theme.colors.tertiaryLabel}
                  chevron={false}
                  disabled={server.id === activeServer?.id}
                  onPress={() => {
                    selectServer(server.id);
                    haptics.success();
                  }}
                />
              ))}
            </ListSection>

            <Button
              title="Add another Pi-hole"
              variant="tinted"
              icon="plus"
              fullWidth
              style={{ marginTop: 20 }}
              onPress={() => router.push('/connect')}
            />
          </>
        )}
      </Screen>

      <Sheet
        visible={draft !== null}
        onClose={() => setDraft(null)}
        title="Edit server"
        action={<Button title="Save" variant="plain" size="small" onPress={() => void save()} />}
      >
        {draft ? (
          <>
            <Field
              label="Name"
              value={draft.name}
              onChangeText={(value) => setDraft({ ...draft, name: value })}
              placeholder="Living room Pi"
            />
            <View style={{ height: 16 }} />
            <Field
              label="Address"
              value={draft.baseUrl}
              onChangeText={(value) => setDraft({ ...draft, baseUrl: value })}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <ListSection>
              <ListRow
                title="Replace password"
                subtitle={draft.server.passwordless ? 'This Pi-hole has authentication disabled' : undefined}
                switchValue={draft.changePassword}
                onSwitchChange={(value) => setDraft({ ...draft, changePassword: value, password: '' })}
                chevron={false}
              />
            </ListSection>

            {draft.changePassword ? (
              <>
                <View style={{ height: 16 }} />
                <Field
                  label="New password"
                  value={draft.password}
                  onChangeText={(value) => setDraft({ ...draft, password: value })}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Web interface or app password"
                />
              </>
            ) : null}

            {testResult ? (
              <View style={{ marginTop: 16 }}>
                <Text variant="footnote" tone={testResult.ok ? 'success' : 'danger'}>
                  {testResult.message}
                </Text>
              </View>
            ) : null}

            <Button
              title="Test connection"
              variant="secondary"
              fullWidth
              icon="bolt"
              loading={testing}
              style={{ marginTop: 20 }}
              onPress={() => void test()}
            />

            <ListSection title="Details">
              <ListRow title="Added" detail={formatDate(draft.server.createdAt / 1000)} chevron={false} />
              <ListRow
                title="Two-factor authentication"
                detail={draft.server.totpEnabled ? 'enabled' : 'not enabled'}
                chevron={false}
              />
            </ListSection>

            <Button
              title="Remove this Pi-hole"
              variant="destructive"
              fullWidth
              icon="trash"
              style={{ marginTop: 20 }}
              onPress={async () => {
                const server = draft.server;
                setDraft(null);
                await remove(server);
              }}
            />
            <View style={{ height: 20 }} />
          </>
        ) : null}
      </Sheet>
    </>
  );
}
