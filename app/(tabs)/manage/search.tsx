import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { useDomainSearch } from '@/hooks/usePihole';
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
  SearchField,
  Text,
} from '@/ui';
import { formatNumber, truncateMiddle } from '@/utils/format';

/** Answers "why is this domain blocked?" by searching gravity and the rule lists. */
export default function SearchScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ domain?: string }>();
  const [term, setTerm] = React.useState(params.domain ?? '');
  const [debounced, setDebounced] = React.useState(term);

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(term), 400);
    return () => clearTimeout(id);
  }, [term]);

  const { data, isLoading, error, refetch } = useDomainSearch(debounced);
  const results = data?.search;

  return (
    <>
      <Stack.Screen options={{ title: 'Search lists' }} />
      <Screen onRefresh={refetch}>
        <ConnectionGate>
          <View style={{ marginTop: 8 }}>
            <SearchField
              value={term}
              onChangeText={setTerm}
              placeholder="doubleclick.net"
              autoFocus={!params.domain}
            />
          </View>

          {debounced.trim().length < 2 ? (
            <EmptyState
              icon="search"
              title="Look up a domain"
              message="See which subscribed list or rule causes a domain to be blocked or allowed."
            />
          ) : isLoading ? (
            <LoadingState label="Searching gravity…" />
          ) : error ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : results ? (
            <>
              <View style={styles.summary}>
                <Badge
                  label={`${formatNumber(results.results.gravity.block)} blocklist hits`}
                  color={theme.colors.blocked}
                  size="medium"
                />
                <Badge
                  label={`${formatNumber(results.results.gravity.allow)} allowlist hits`}
                  color={theme.colors.success}
                  size="medium"
                />
                <Badge
                  label={`${formatNumber(results.results.domains.exact + results.results.domains.regex)} own rules`}
                  color={theme.colors.forwarded}
                  size="medium"
                />
              </View>

              {results.domains.length > 0 ? (
                <ListSection title="Your own rules">
                  {results.domains.map((entry) => (
                    <ListRow
                      key={`domain-${entry.id}`}
                      title={entry.domain}
                      subtitle={entry.comment ?? undefined}
                      monoTitle={entry.kind === 'regex'}
                      icon={entry.type === 'allow' ? 'allow' : 'block'}
                      iconColor={entry.type === 'allow' ? theme.colors.success : theme.colors.danger}
                      detail={`${entry.type} · ${entry.kind}`}
                      chevron={false}
                      numberOfLines={2}
                    />
                  ))}
                </ListSection>
              ) : null}

              {results.gravity.length > 0 ? (
                <ListSection title="Subscribed lists">
                  {results.gravity.map((entry, index) => (
                    <ListRow
                      key={`gravity-${entry.id}-${index}`}
                      title={entry.domain}
                      subtitle={truncateMiddle(entry.address, 52)}
                      icon="list"
                      iconColor={entry.type === 'allow' ? theme.colors.success : theme.colors.blocked}
                      detail={entry.enabled ? undefined : 'disabled'}
                      chevron={false}
                      numberOfLines={2}
                    />
                  ))}
                </ListSection>
              ) : null}

              {results.domains.length === 0 && results.gravity.length === 0 ? (
                <EmptyState
                  icon="check"
                  title="Not on any list"
                  message={`${debounced.trim()} is not blocked by gravity or by one of your own rules.`}
                />
              ) : null}

              <Text variant="caption1" tone="tertiary" center style={{ marginTop: 20 }}>
                Showing up to {results.parameters.N} matches
                {results.parameters.partial ? ' (partial matching enabled)' : ''}.
              </Text>
            </>
          ) : null}
        </ConnectionGate>
      </Screen>
    </>
  );
}

const styles = {
  summary: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, marginTop: 16 },
};
