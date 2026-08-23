import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { PiholeApiError, PiholeNetworkError } from '@/api/client';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export function EmptyState({
  icon = 'sparkles',
  title,
  message,
  actionTitle,
  onAction,
}: {
  icon?: IconName;
  title: string;
  message?: string;
  actionTitle?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.center, { paddingVertical: theme.spacing.xxxl }]}>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: theme.colors.tertiaryFill, borderRadius: theme.radii.pill },
        ]}
      >
        <Icon name={icon} size={26} color={theme.colors.tertiaryLabel} />
      </View>
      <Text variant="headline" center style={{ marginTop: theme.spacing.lg }}>
        {title}
      </Text>
      {message ? (
        <Text variant="subhead" tone="secondary" center style={{ marginTop: 6, maxWidth: 300 }}>
          {message}
        </Text>
      ) : null}
      {actionTitle && onAction ? (
        <Button title={actionTitle} variant="tinted" onPress={onAction} style={{ marginTop: theme.spacing.lg }} />
      ) : null}
    </View>
  );
}

export function LoadingState({ label }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.center, { paddingVertical: theme.spacing.xxxl }]}>
      <ActivityIndicator color={theme.colors.secondaryLabel} />
      {label ? (
        <Text variant="footnote" tone="secondary" style={{ marginTop: theme.spacing.md }}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

/** Renders API/network failures in plain language with a retry affordance. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const theme = useTheme();
  const { title, message } = describeError(error);

  return (
    <View style={[styles.center, { paddingVertical: theme.spacing.xxl }]}>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: theme.colors.accentMuted, borderRadius: theme.radii.pill },
        ]}
      >
        <Icon name="warning" size={24} color={theme.colors.danger} />
      </View>
      <Text variant="headline" center style={{ marginTop: theme.spacing.lg }}>
        {title}
      </Text>
      <Text variant="subhead" tone="secondary" center style={{ marginTop: 6, maxWidth: 320 }}>
        {message}
      </Text>
      {onRetry ? (
        <Button title="Try again" variant="tinted" icon="refresh" onPress={onRetry} style={{ marginTop: theme.spacing.lg }} />
      ) : null}
    </View>
  );
}

export function describeError(error: unknown): { title: string; message: string } {
  if (error instanceof PiholeNetworkError) {
    return { title: 'Cannot reach the Pi-hole', message: error.message };
  }
  if (error instanceof PiholeApiError) {
    if (error.isUnauthorized) {
      return {
        title: 'Session expired',
        message: 'The password was rejected or the session timed out. Update the credentials in Settings › Servers.',
      };
    }
    if (error.isRateLimited) {
      return { title: 'Too many requests', message: 'The Pi-hole is rate-limiting logins. Wait a moment and retry.' };
    }
    if (error.status === 404) {
      return {
        title: 'Not available',
        message: 'This endpoint is not offered by the connected Pi-hole. It needs Pi-hole v6 or newer.',
      };
    }
    return { title: 'Request failed', message: error.hint ? `${error.message} (${error.hint})` : error.message };
  }
  if (error instanceof Error) return { title: 'Something went wrong', message: error.message };
  return { title: 'Something went wrong', message: 'An unexpected error occurred.' };
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  iconCircle: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
});
