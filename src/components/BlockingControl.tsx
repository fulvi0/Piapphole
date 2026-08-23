import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useBlocking, useSetBlocking } from '@/hooks/usePihole';
import { useAppSettings } from '@/store/settings';
import { useTheme } from '@/theme';
import { Badge, Icon, Sheet, Text, ListRow, ListSection, withAlpha } from '@/ui';
import { formatCountdown } from '@/utils/format';
import { haptics } from '@/utils/haptics';

const DISABLE_PRESETS = [
  { label: '10 seconds', seconds: 10 },
  { label: '30 seconds', seconds: 30 },
  { label: '1 minute', seconds: 60 },
  { label: '5 minutes', seconds: 300 },
  { label: '15 minutes', seconds: 900 },
  { label: '1 hour', seconds: 3600 },
  { label: 'Until I turn it back on', seconds: null as number | null },
];

/**
 * The dashboard's hero control: shows blocking state, the remaining timer when
 * one is running, and offers the usual "pause for N minutes" shortcuts.
 */
export function BlockingControl() {
  const theme = useTheme();
  const { settings } = useAppSettings();
  const { data, isLoading, refetch } = useBlocking();
  const setBlocking = useSetBlocking();
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [remaining, setRemaining] = React.useState<number | null>(null);
  const [lastServerTimer, setLastServerTimer] = React.useState<string | null>(null);

  // Reset the local countdown whenever the server reports a new timer state.
  const serverTimer = `${data?.blocking ?? ''}:${data?.timer ?? ''}`;
  if (serverTimer !== lastServerTimer) {
    setLastServerTimer(serverTimer);
    setRemaining(data?.timer ?? null);
  }

  React.useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) {
      void refetch();
      return;
    }
    const id = setTimeout(() => setRemaining((value) => (value === null ? null : value - 1)), 1000);
    return () => clearTimeout(id);
  }, [remaining, refetch]);

  const status = data?.blocking ?? 'unknown';
  const enabled = status === 'enabled';
  const failed = status === 'failed';
  const tint = failed ? theme.colors.warning : enabled ? theme.colors.success : theme.colors.danger;

  const apply = React.useCallback(
    (next: boolean, timer: number | null) => {
      haptics.medium();
      setBlocking.mutate(
        { enabled: next, timer },
        {
          onSuccess: () => haptics.success(),
          onError: () => haptics.error(),
        },
      );
    },
    [setBlocking],
  );

  const handlePrimaryPress = () => {
    if (enabled) {
      if (settings.confirmDestructive) setPickerOpen(true);
      else apply(false, 60);
    } else {
      apply(true, null);
    }
  };

  return (
    <>
      <Pressable
        onPress={handlePrimaryPress}
        onLongPress={() => {
          haptics.medium();
          setPickerOpen(true);
        }}
        disabled={setBlocking.isPending}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radii.lg,
            opacity: pressed ? 0.9 : 1,
          },
          theme.dark ? null : theme.shadow.card,
        ]}
      >
        <View style={[styles.orb, { backgroundColor: withAlpha(tint, theme.dark ? 0.2 : 0.13) }]}>
          {setBlocking.isPending || isLoading ? (
            <ActivityIndicator color={tint} />
          ) : (
            <Icon name={enabled ? 'shield' : 'shieldOff'} size={28} color={tint} />
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text variant="title3" weight="700">
              {failed ? 'Blocking failed' : enabled ? 'Blocking is on' : 'Blocking is off'}
            </Text>
            <Badge label={status.toUpperCase()} color={tint} />
          </View>
          <Text variant="footnote" tone="secondary" style={{ marginTop: 3 }}>
            {remaining !== null
              ? `Resumes automatically in ${formatCountdown(remaining)}`
              : enabled
                ? 'Tap to pause · hold to choose how long'
                : 'Tap to resume blocking'}
          </Text>
        </View>

        <Icon name={enabled ? 'pause' : 'play'} size={26} color={tint} />
      </Pressable>

      <Sheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={enabled ? 'Pause blocking' : 'Resume blocking'}
        subtitle={enabled ? 'Ads and trackers will get through until the timer ends.' : undefined}
      >
        {enabled ? (
          <ListSection>
            {DISABLE_PRESETS.map((preset) => (
              <ListRow
                key={preset.label}
                title={preset.label}
                icon="clock"
                chevron={false}
                onPress={() => {
                  setPickerOpen(false);
                  apply(false, preset.seconds);
                }}
              />
            ))}
          </ListSection>
        ) : (
          <ListSection>
            <ListRow
              title="Resume blocking now"
              icon="shield"
              accent
              chevron={false}
              onPress={() => {
                setPickerOpen(false);
                apply(true, null);
              }}
            />
          </ListSection>
        )}
        <View style={{ height: 12 }} />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  orb: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
});
