import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, View } from 'react-native';

import type { DomainType, QueryEntry } from '@/api/types';
import { useDomainMutations } from '@/hooks/usePihole';
import { useTheme } from '@/theme';
import { Badge, ListRow, ListSection, Sheet, Text } from '@/ui';
import { formatDateTime, formatMilliseconds } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { colorForOutcome, labelForStatus, outcomeForStatus } from '@/utils/queryStatus';

export interface QueryDetailSheetProps {
  entry: QueryEntry | null;
  onClose: () => void;
  onFilterDomain?: (domain: string) => void;
  onFilterClient?: (client: string) => void;
}

/** Full detail for a single query plus the actions people actually want here. */
export function QueryDetailSheet({ entry, onClose, onFilterDomain, onFilterClient }: QueryDetailSheetProps) {
  const theme = useTheme();
  const router = useRouter();
  const { add } = useDomainMutations();

  if (!entry) return null;

  const outcome = outcomeForStatus(entry.status);
  const tint = colorForOutcome(outcome, theme.colors);

  const addToList = (type: DomainType) => {
    add.mutate(
      { domain: entry.domain, type, kind: 'exact', comment: 'Added from Piapphole' },
      {
        onSuccess: () => {
          haptics.success();
          onClose();
          Alert.alert(
            type === 'allow' ? 'Added to allowlist' : 'Added to denylist',
            `${entry.domain} is now on the ${type === 'allow' ? 'allow' : 'deny'} list.`,
          );
        },
        onError: (error) => {
          haptics.error();
          Alert.alert('Could not add domain', error.message);
        },
      },
    );
  };

  const copy = async (value: string, label: string) => {
    await Clipboard.setStringAsync(value);
    haptics.success();
    Alert.alert('Copied', `${label} copied to the clipboard.`);
  };

  return (
    <Sheet visible onClose={onClose} title={entry.domain} subtitle={formatDateTime(entry.time)}>
      <View style={{ alignItems: 'center', marginBottom: 4 }}>
        <Badge label={labelForStatus(entry.status)} color={tint} filled size="medium" />
      </View>

      <ListSection title="Query">
        <ListRow title="Domain" detail={entry.domain} chevron={false} numberOfLines={2} />
        {entry.cname ? <ListRow title="Blocked CNAME" detail={entry.cname} chevron={false} /> : null}
        <ListRow title="Type" detail={entry.type} chevron={false} />
        <ListRow title="Client" detail={entry.client.name ? `${entry.client.name} (${entry.client.ip})` : entry.client.ip} chevron={false} numberOfLines={2} />
        {entry.upstream ? <ListRow title="Upstream" detail={entry.upstream} chevron={false} /> : null}
        <ListRow title="Reply" detail={entry.reply.type ?? 'unknown'} chevron={false} />
        <ListRow title="Response time" detail={formatMilliseconds(entry.reply.time)} chevron={false} />
        {entry.dnssec ? <ListRow title="DNSSEC" detail={entry.dnssec} chevron={false} /> : null}
        {entry.ede && entry.ede.code !== 0 ? (
          <ListRow title="Extended error" detail={entry.ede.text ?? `code ${entry.ede.code}`} chevron={false} numberOfLines={3} />
        ) : null}
      </ListSection>

      <ListSection title="Actions">
        <ListRow
          title="Add to allowlist"
          icon="allow"
          iconColor={theme.colors.success}
          chevron={false}
          disabled={add.isPending}
          onPress={() => addToList('allow')}
        />
        <ListRow
          title="Add to denylist"
          icon="block"
          iconColor={theme.colors.danger}
          chevron={false}
          disabled={add.isPending}
          onPress={() => addToList('deny')}
        />
        {onFilterDomain ? (
          <ListRow
            title="Show only this domain"
            icon="filter"
            chevron={false}
            onPress={() => {
              onFilterDomain(entry.domain);
              onClose();
            }}
          />
        ) : null}
        {onFilterClient ? (
          <ListRow
            title="Show only this client"
            icon="client"
            chevron={false}
            onPress={() => {
              onFilterClient(entry.client.ip);
              onClose();
            }}
          />
        ) : null}
        <ListRow
          title="Look up in lists"
          icon="search"
          chevron={false}
          onPress={() => {
            onClose();
            router.push({ pathname: '/manage/search', params: { domain: entry.domain } });
          }}
        />
        <ListRow
          title="Copy domain"
          icon="copy"
          chevron={false}
          onPress={() => void copy(entry.domain, 'Domain')}
        />
      </ListSection>

      <Text variant="caption2" tone="tertiary" center style={{ marginTop: 14 }}>
        Query #{entry.id}
      </Text>
      <View style={{ height: 12 }} />
    </Sheet>
  );
}
