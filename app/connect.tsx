import { useRouter } from 'expo-router';
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { PiholeApiError, PiholeClient, hostnameOf, normaliseBaseUrl } from '@/api/client';
import { useServers } from '@/store/servers';
import { useTheme } from '@/theme';
import { Badge, Button, Card, Field, Icon, Text, describeError } from '@/ui';
import { haptics } from '@/utils/haptics';

type Phase = 'address' | 'credentials' | 'saving';

/**
 * Guided setup: probe the address first so we only ask for a password when the
 * server actually wants one, and only ask for a TOTP when 2FA is enabled.
 */
export default function ConnectScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { addServer, servers } = useServers();

  const [address, setAddress] = React.useState('');
  const [name, setName] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [totp, setTotp] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  const [phase, setPhase] = React.useState<Phase>('address');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [needsTotp, setNeedsTotp] = React.useState(false);
  const [passwordless, setPasswordless] = React.useState(false);

  const resolvedUrl = normaliseBaseUrl(address);

  const save = async (skipLogin = false) => {
    setBusy(true);
    setPhase('saving');
    setError(null);
    try {
      if (!skipLogin) {
        const client = new PiholeClient({ baseUrl: address, password, totp: totp || undefined });
        await client.login();
        await client.logout();
      }
      await addServer({
        name: name.trim() || hostnameOf(resolvedUrl),
        baseUrl: address,
        password: skipLogin ? '' : password,
        totpEnabled: needsTotp,
        passwordless: skipLogin,
      });
      haptics.success();
      router.replace('/(tabs)');
    } catch (caught) {
      haptics.error();
      setError(describeError(caught).message);
      setPhase('credentials');
    } finally {
      setBusy(false);
    }
  };

  const probe = async () => {
    if (!address.trim()) {
      setError('Enter the address of your Pi-hole.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const client = new PiholeClient({ baseUrl: address });
      const result = await client.checkAuth();
      const session = result.session;
      setNeedsTotp(Boolean(session?.totp));
      if (session?.valid) {
        // Authentication is switched off on this Pi-hole — nothing else to ask.
        setPasswordless(true);
        haptics.success();
        await save(true);
        return;
      }
      setPasswordless(false);
      setPhase('credentials');
      haptics.light();
    } catch (caught) {
      if (caught instanceof PiholeApiError && caught.isUnauthorized) {
        // A 401 here is the expected answer: the server exists and wants a password.
        setPhase('credentials');
        haptics.light();
        setError(null);
      } else {
        haptics.error();
        setError(describeError(caught).message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: theme.colors.groupedBackground }}
    >
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxxl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: theme.colors.accentMuted }]}>
            <Icon name="shield" size={30} color={theme.colors.accent} />
          </View>
          <Text variant="title1" weight="700" center style={{ marginTop: theme.spacing.lg }}>
            Connect your Pi-hole
          </Text>
          <Text variant="subhead" tone="secondary" center style={{ marginTop: 6, maxWidth: 320 }}>
            Piapphole talks to the Pi-hole v6 REST API directly from your device. Nothing is sent anywhere else.
          </Text>
        </View>

        <Card style={{ marginTop: theme.spacing.xl }}>
          <Field
            label="Address"
            icon="server"
            placeholder="192.168.1.10  ·  pi.hole  ·  https://pi.hole:8443"
            value={address}
            onChangeText={(value) => {
              setAddress(value);
              if (phase !== 'address') setPhase('address');
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            inputMode="url"
            editable={!busy}
            hint={resolvedUrl ? `API root: ${resolvedUrl}/api` : 'The host or full URL of the Pi-hole web interface.'}
            onSubmitEditing={() => void probe()}
            returnKeyType="go"
          />

          {phase !== 'address' ? (
            <>
              <View style={{ height: theme.spacing.lg }} />
              <Field
                label="Password"
                icon="lock"
                placeholder="Web interface or app password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
                hint="An application password (Settings › Web interface) is recommended — it can be revoked separately."
                right={
                  <Icon
                    name={showPassword ? 'eyeOff' : 'eye'}
                    size={17}
                    color={theme.colors.tertiaryLabel}
                  />
                }
                onSubmitEditing={() => void save()}
                returnKeyType={needsTotp ? 'next' : 'go'}
              />
              <Button
                title={showPassword ? 'Hide password' : 'Show password'}
                variant="plain"
                size="small"
                onPress={() => setShowPassword((value) => !value)}
                style={{ marginTop: 4, alignSelf: 'flex-start' }}
              />

              {needsTotp ? (
                <>
                  <View style={{ height: theme.spacing.md }} />
                  <Field
                    label="Two-factor code"
                    icon="key"
                    placeholder="123456"
                    value={totp}
                    onChangeText={setTotp}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!busy}
                    hint="This Pi-hole has 2FA enabled. The code is valid for 30 seconds."
                    onSubmitEditing={() => void save()}
                    returnKeyType="go"
                  />
                </>
              ) : null}

              <View style={{ height: theme.spacing.lg }} />
              <Field
                label="Name (optional)"
                icon="sparkles"
                placeholder="Living room Pi"
                value={name}
                onChangeText={setName}
                editable={!busy}
              />
            </>
          ) : null}

          {error ? (
            <View style={[styles.error, { backgroundColor: theme.colors.accentMuted, borderRadius: theme.radii.sm }]}>
              <Icon name="warning" size={16} color={theme.colors.danger} />
              <Text variant="footnote" tone="danger" style={{ flex: 1 }}>
                {error}
              </Text>
            </View>
          ) : null}

          <Button
            title={phase === 'address' ? 'Continue' : 'Connect'}
            fullWidth
            size="large"
            loading={busy}
            onPress={() => (phase === 'address' ? void probe() : void save(passwordless))}
            style={{ marginTop: theme.spacing.lg }}
          />
        </Card>

        {servers.length > 0 ? (
          <Button
            title="Cancel"
            variant="plain"
            fullWidth
            onPress={() => router.back()}
            style={{ marginTop: theme.spacing.md }}
          />
        ) : null}

        <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.sm }}>
          <Text variant="footnote" tone="secondary" weight="600">
            Before you start
          </Text>
          <Hint text="Requires Pi-hole v6 or newer — that is the release that introduced this REST API." />
          <Hint text="Your device must be able to reach the Pi-hole: same Wi-Fi, or a VPN back home." />
          <Hint text="Credentials are stored in the device keychain, never in plain text and never uploaded." />
        </View>

        <View style={{ marginTop: theme.spacing.xl, alignItems: 'center' }}>
          <Badge label="Open source · MIT" color={theme.colors.secondaryLabel} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Hint({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.hint}>
      <View style={{ marginTop: 2 }}>
        <Icon name="check" size={13} color={theme.colors.success} />
      </View>
      <Text variant="caption1" tone="secondary" style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: 12 },
  heroIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginTop: 16 },
  hint: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
});
