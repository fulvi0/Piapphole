import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { PiholeApiError, type PiholeClient } from '@/api/client';
import type {
  DomainItem,
  DomainKind,
  DomainType,
  ListType,
  QueryFilters,
  QueriesResponse,
} from '@/api/types';
import { useAppSettings } from '@/store/settings';
import { useServers } from '@/store/servers';

/** Every cache key is namespaced by server id so switching servers is instant. */
export const keys = {
  all: (serverId: string) => ['pihole', serverId] as const,
  summary: (id: string) => [...keys.all(id), 'summary'] as const,
  padd: (id: string) => [...keys.all(id), 'padd'] as const,
  history: (id: string) => [...keys.all(id), 'history'] as const,
  historyClients: (id: string) => [...keys.all(id), 'history-clients'] as const,
  upstreams: (id: string) => [...keys.all(id), 'upstreams'] as const,
  topDomains: (id: string, blocked: boolean) => [...keys.all(id), 'top-domains', blocked] as const,
  topClients: (id: string, blocked: boolean) => [...keys.all(id), 'top-clients', blocked] as const,
  queryTypes: (id: string) => [...keys.all(id), 'query-types'] as const,
  recentBlocked: (id: string) => [...keys.all(id), 'recent-blocked'] as const,
  blocking: (id: string) => [...keys.all(id), 'blocking'] as const,
  queries: (id: string, filters: QueryFilters) => [...keys.all(id), 'queries', filters] as const,
  suggestions: (id: string) => [...keys.all(id), 'suggestions'] as const,
  domains: (id: string) => [...keys.all(id), 'domains'] as const,
  groups: (id: string) => [...keys.all(id), 'groups'] as const,
  clients: (id: string) => [...keys.all(id), 'clients'] as const,
  clientSuggestions: (id: string) => [...keys.all(id), 'client-suggestions'] as const,
  lists: (id: string) => [...keys.all(id), 'lists'] as const,
  search: (id: string, term: string, partial: boolean) => [...keys.all(id), 'search', term, partial] as const,
  system: (id: string) => [...keys.all(id), 'system'] as const,
  host: (id: string) => [...keys.all(id), 'host'] as const,
  ftl: (id: string) => [...keys.all(id), 'ftl'] as const,
  version: (id: string) => [...keys.all(id), 'version'] as const,
  sensors: (id: string) => [...keys.all(id), 'sensors'] as const,
  database: (id: string) => [...keys.all(id), 'database'] as const,
  messages: (id: string) => [...keys.all(id), 'messages'] as const,
  metrics: (id: string) => [...keys.all(id), 'metrics'] as const,
  devices: (id: string) => [...keys.all(id), 'devices'] as const,
  gateway: (id: string) => [...keys.all(id), 'gateway'] as const,
  routes: (id: string) => [...keys.all(id), 'routes'] as const,
  interfaces: (id: string) => [...keys.all(id), 'interfaces'] as const,
  leases: (id: string) => [...keys.all(id), 'leases'] as const,
  sessions: (id: string) => [...keys.all(id), 'sessions'] as const,
  logs: (id: string, kind: string) => [...keys.all(id), 'logs', kind] as const,
};

interface Connection {
  client: PiholeClient;
  serverId: string;
}

/** Returns the live client plus the id used to namespace its cache entries. */
export function useConnection(): Connection | null {
  const { client, activeServer } = useServers();
  return useMemo(
    () => (client && activeServer ? { client, serverId: activeServer.id } : null),
    [client, activeServer],
  );
}

function useLiveInterval(multiplier = 1): number | false {
  const { settings } = useAppSettings();
  if (!settings.refreshInterval) return false;
  return settings.refreshInterval * 1000 * multiplier;
}

type QueryOpts<T> = Omit<UseQueryOptions<T, Error, T, readonly unknown[]>, 'queryKey' | 'queryFn'>;

function useApiQuery<T>(
  key: readonly unknown[] | null,
  fn: (client: PiholeClient) => Promise<T>,
  options: QueryOpts<T> = {},
) {
  const connection = useConnection();
  return useQuery<T, Error, T, readonly unknown[]>({
    queryKey: key ?? ['pihole', 'idle'],
    queryFn: () => fn(connection!.client),
    enabled: Boolean(connection) && key !== null && (options.enabled ?? true),
    retry: (failureCount, error) => {
      // A rejected password will not become correct by retrying.
      if (error instanceof PiholeApiError && (error.isUnauthorized || error.status === 400)) return false;
      return failureCount < 2;
    },
    ...options,
  });
}

/* ── Dashboard ───────────────────────────────────────────────────────────── */

export function useSummary() {
  const connection = useConnection();
  const refetchInterval = useLiveInterval();
  return useApiQuery(connection && keys.summary(connection.serverId), (c) => c.summary(), { refetchInterval });
}

export function usePadd() {
  const connection = useConnection();
  const refetchInterval = useLiveInterval();
  return useApiQuery(connection && keys.padd(connection.serverId), (c) => c.padd(), { refetchInterval });
}

export function useHistory() {
  const connection = useConnection();
  const refetchInterval = useLiveInterval(3);
  return useApiQuery(connection && keys.history(connection.serverId), (c) => c.history(), { refetchInterval });
}

export function useClientHistory(count = 8) {
  const connection = useConnection();
  const refetchInterval = useLiveInterval(6);
  return useApiQuery(connection && keys.historyClients(connection.serverId), (c) => c.historyClients(count), {
    refetchInterval,
  });
}

export function useUpstreams() {
  const connection = useConnection();
  const refetchInterval = useLiveInterval(3);
  return useApiQuery(connection && keys.upstreams(connection.serverId), (c) => c.upstreams(), { refetchInterval });
}

export function useTopDomains(blocked: boolean, count = 10) {
  const connection = useConnection();
  const refetchInterval = useLiveInterval(3);
  return useApiQuery(
    connection && keys.topDomains(connection.serverId, blocked),
    (c) => c.topDomains(blocked, count),
    { refetchInterval },
  );
}

export function useTopClients(blocked: boolean, count = 10) {
  const connection = useConnection();
  const refetchInterval = useLiveInterval(3);
  return useApiQuery(
    connection && keys.topClients(connection.serverId, blocked),
    (c) => c.topClients(blocked, count),
    { refetchInterval },
  );
}

export function useQueryTypes() {
  const connection = useConnection();
  const refetchInterval = useLiveInterval(3);
  return useApiQuery(connection && keys.queryTypes(connection.serverId), (c) => c.queryTypes(), { refetchInterval });
}

export function useRecentBlocked(count = 8) {
  const connection = useConnection();
  const refetchInterval = useLiveInterval();
  return useApiQuery(connection && keys.recentBlocked(connection.serverId), (c) => c.recentBlocked(count), {
    refetchInterval,
  });
}

/* ── Blocking control ────────────────────────────────────────────────────── */

export function useBlocking() {
  const connection = useConnection();
  const refetchInterval = useLiveInterval();
  return useApiQuery(connection && keys.blocking(connection.serverId), (c) => c.blocking(), { refetchInterval });
}

export function useSetBlocking() {
  const connection = useConnection();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ enabled, timer }: { enabled: boolean; timer: number | null }) =>
      connection!.client.setBlocking(enabled, timer),
    onSuccess: (data) => {
      if (!connection) return;
      queryClient.setQueryData(keys.blocking(connection.serverId), data);
      void queryClient.invalidateQueries({ queryKey: keys.padd(connection.serverId) });
    },
  });
}

/* ── Query log ───────────────────────────────────────────────────────────── */

export function useQueryLog(filters: QueryFilters) {
  const connection = useConnection();
  const { settings } = useAppSettings();
  const pageSize = filters.length ?? settings.queryPageSize;
  const refetchInterval = useLiveInterval();

  return useInfiniteQuery<QueriesResponse, Error>({
    queryKey: connection ? keys.queries(connection.serverId, { ...filters, length: pageSize }) : ['pihole', 'idle'],
    enabled: Boolean(connection),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      connection!.client.queries({ ...filters, length: pageSize, start: pageParam as number }),
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.queries.length, 0);
      if (lastPage.queries.length < pageSize) return undefined;
      if (loaded >= lastPage.recordsFiltered) return undefined;
      return loaded;
    },
    // Cap the retained pages: a live refetch re-requests every page it holds.
    maxPages: 5,
    refetchInterval,
    refetchOnWindowFocus: true,
    staleTime: 2000,
  });
}

export function useQuerySuggestions() {
  const connection = useConnection();
  return useApiQuery(connection && keys.suggestions(connection.serverId), (c) => c.querySuggestions(), {
    staleTime: 60_000,
  });
}

/* ── Lists, domains, groups, clients ─────────────────────────────────────── */

export function useDomains() {
  const connection = useConnection();
  return useApiQuery(connection && keys.domains(connection.serverId), (c) => c.domains());
}

export function useGroups() {
  const connection = useConnection();
  return useApiQuery(connection && keys.groups(connection.serverId), (c) => c.groups());
}

export function useClients() {
  const connection = useConnection();
  return useApiQuery(connection && keys.clients(connection.serverId), (c) => c.clients());
}

export function useClientSuggestions() {
  const connection = useConnection();
  return useApiQuery(connection && keys.clientSuggestions(connection.serverId), (c) => c.clientSuggestions(), {
    staleTime: 60_000,
  });
}

export function useLists() {
  const connection = useConnection();
  return useApiQuery(connection && keys.lists(connection.serverId), (c) => c.lists());
}

export function useDomainSearch(term: string, partial = true) {
  const connection = useConnection();
  const trimmed = term.trim();
  return useApiQuery(
    connection && trimmed.length >= 2 ? keys.search(connection.serverId, trimmed, partial) : null,
    (c) => c.search(trimmed, { partial, N: 25 }),
    { enabled: trimmed.length >= 2 },
  );
}

/** Invalidates every list-management cache after a mutation. */
export function useInvalidateManagement() {
  const connection = useConnection();
  const queryClient = useQueryClient();
  return useCallback(() => {
    if (!connection) return;
    const id = connection.serverId;
    for (const key of [keys.domains(id), keys.groups(id), keys.clients(id), keys.lists(id), keys.summary(id)]) {
      void queryClient.invalidateQueries({ queryKey: key });
    }
  }, [connection, queryClient]);
}

export function useDomainMutations() {
  const connection = useConnection();
  const invalidate = useInvalidateManagement();

  const add = useMutation({
    mutationFn: (input: {
      domain: string | string[];
      type: DomainType;
      kind: DomainKind;
      comment?: string | null;
      groups?: number[];
      enabled?: boolean;
    }) => connection!.client.addDomain(input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({
      original,
      changes,
    }: {
      original: Pick<DomainItem, 'domain' | 'type' | 'kind'>;
      changes: Parameters<PiholeClient['updateDomain']>[1];
    }) => connection!.client.updateDomain(original, changes),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (item: Pick<DomainItem, 'domain' | 'type' | 'kind'>) => connection!.client.deleteDomain(item),
    onSuccess: invalidate,
  });

  return { add, update, remove };
}

export function useGroupMutations() {
  const connection = useConnection();
  const invalidate = useInvalidateManagement();

  const add = useMutation({
    mutationFn: (input: { name: string; comment?: string | null; enabled?: boolean }) =>
      connection!.client.addGroup(input),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ name, changes }: { name: string; changes: Parameters<PiholeClient['updateGroup']>[1] }) =>
      connection!.client.updateGroup(name, changes),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (name: string) => connection!.client.deleteGroup(name),
    onSuccess: invalidate,
  });

  return { add, update, remove };
}

export function useClientMutations() {
  const connection = useConnection();
  const invalidate = useInvalidateManagement();

  const add = useMutation({
    mutationFn: (input: { client: string; comment?: string | null; groups?: number[] }) =>
      connection!.client.addClient(input),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ client, changes }: { client: string; changes: Parameters<PiholeClient['updateClient']>[1] }) =>
      connection!.client.updateClient(client, changes),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (client: string) => connection!.client.deleteClient(client),
    onSuccess: invalidate,
  });

  return { add, update, remove };
}

export function useListMutations() {
  const connection = useConnection();
  const invalidate = useInvalidateManagement();

  const add = useMutation({
    mutationFn: (input: {
      address: string;
      type: ListType;
      comment?: string | null;
      groups?: number[];
      enabled?: boolean;
    }) => connection!.client.addList(input),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ address, changes }: { address: string; changes: Parameters<PiholeClient['updateList']>[1] }) =>
      connection!.client.updateList(address, changes),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: ({ address, type }: { address: string; type: ListType }) =>
      connection!.client.deleteList(address, type),
    onSuccess: invalidate,
  });

  return { add, update, remove };
}

/* ── System & diagnostics ────────────────────────────────────────────────── */

export function useSystemInfo() {
  const connection = useConnection();
  const refetchInterval = useLiveInterval();
  return useApiQuery(connection && keys.system(connection.serverId), (c) => c.systemInfo(), { refetchInterval });
}

export function useHostInfo() {
  const connection = useConnection();
  return useApiQuery(connection && keys.host(connection.serverId), (c) => c.hostInfo(), { staleTime: 300_000 });
}

export function useFtlInfo() {
  const connection = useConnection();
  const refetchInterval = useLiveInterval(2);
  return useApiQuery(connection && keys.ftl(connection.serverId), (c) => c.ftlInfo(), { refetchInterval });
}

export function useVersionInfo() {
  const connection = useConnection();
  return useApiQuery(connection && keys.version(connection.serverId), (c) => c.versionInfo(), {
    staleTime: 300_000,
  });
}

export function useSensors() {
  const connection = useConnection();
  const refetchInterval = useLiveInterval(2);
  return useApiQuery(connection && keys.sensors(connection.serverId), (c) => c.sensors(), { refetchInterval });
}

export function useDatabaseInfo() {
  const connection = useConnection();
  return useApiQuery(connection && keys.database(connection.serverId), (c) => c.databaseInfo(), {
    staleTime: 120_000,
  });
}

export function useMessages() {
  const connection = useConnection();
  const refetchInterval = useLiveInterval(6);
  return useApiQuery(connection && keys.messages(connection.serverId), (c) => c.messages(), { refetchInterval });
}

export function useDeleteMessage() {
  const connection = useConnection();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => connection!.client.deleteMessage(id),
    onSuccess: () => {
      if (connection) void queryClient.invalidateQueries({ queryKey: keys.messages(connection.serverId) });
    },
  });
}

export function useMetrics() {
  const connection = useConnection();
  const refetchInterval = useLiveInterval(3);
  return useApiQuery(connection && keys.metrics(connection.serverId), (c) => c.metrics(), { refetchInterval });
}

export function useLogs(kind: 'dnsmasq' | 'ftl' | 'webserver') {
  const connection = useConnection();
  const refetchInterval = useLiveInterval(2);
  return useApiQuery(connection && keys.logs(connection.serverId, kind), (c) => c.log(kind), { refetchInterval });
}

/* ── Network & DHCP ──────────────────────────────────────────────────────── */

export function useNetworkDevices() {
  const connection = useConnection();
  return useApiQuery(connection && keys.devices(connection.serverId), (c) => c.networkDevices());
}

export function useGateway() {
  const connection = useConnection();
  return useApiQuery(connection && keys.gateway(connection.serverId), (c) => c.gateway());
}

export function useRoutes() {
  const connection = useConnection();
  return useApiQuery(connection && keys.routes(connection.serverId), (c) => c.routes());
}

export function useInterfaces() {
  const connection = useConnection();
  return useApiQuery(connection && keys.interfaces(connection.serverId), (c) => c.interfaces());
}

export function useDhcpLeases() {
  const connection = useConnection();
  return useApiQuery(connection && keys.leases(connection.serverId), (c) => c.dhcpLeases());
}

export function useDeleteLease() {
  const connection = useConnection();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ip: string) => connection!.client.deleteDhcpLease(ip),
    onSuccess: () => {
      if (connection) void queryClient.invalidateQueries({ queryKey: keys.leases(connection.serverId) });
    },
  });
}

export function useDeleteNetworkDevice() {
  const connection = useConnection();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => connection!.client.deleteNetworkDevice(id),
    onSuccess: () => {
      if (connection) void queryClient.invalidateQueries({ queryKey: keys.devices(connection.serverId) });
    },
  });
}

/* ── Sessions & actions ──────────────────────────────────────────────────── */

export function useSessions() {
  const connection = useConnection();
  return useApiQuery(connection && keys.sessions(connection.serverId), (c) => c.listSessions());
}

export function useDeleteApiSession() {
  const connection = useConnection();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => connection!.client.deleteSession(id),
    onSuccess: () => {
      if (connection) void queryClient.invalidateQueries({ queryKey: keys.sessions(connection.serverId) });
    },
  });
}

export type PiholeAction = 'gravity' | 'restartdns' | 'flush-logs' | 'flush-arp' | 'flush-network';

export function useRunAction() {
  const connection = useConnection();
  const queryClient = useQueryClient();
  return useMutation<string, Error, PiholeAction>({
    mutationFn: async (action) => {
      const client = connection!.client;
      switch (action) {
        case 'gravity':
          return client.runGravity();
        case 'restartdns':
          await client.restartDns();
          return 'pihole-FTL is restarting.';
        case 'flush-logs':
          await client.flushLogs();
          return 'DNS logs flushed.';
        case 'flush-arp':
          await client.flushArp();
          return 'ARP cache flushed.';
        case 'flush-network':
          await client.flushNetwork();
          return 'Network table flushed.';
      }
    },
    onSuccess: () => {
      if (connection) void queryClient.invalidateQueries({ queryKey: keys.all(connection.serverId) });
    },
  });
}

/** Pull-to-refresh helper: refetches everything cached for the active server. */
export function useRefreshAll() {
  const connection = useConnection();
  const queryClient = useQueryClient();
  return useCallback(async () => {
    if (!connection) return;
    await queryClient.refetchQueries({ queryKey: keys.all(connection.serverId), type: 'active' });
  }, [connection, queryClient]);
}
