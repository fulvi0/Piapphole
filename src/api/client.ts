import type {
  ActionResponse,
  AdList,
  ApiErrorBody,
  BlockingResponse,
  ClientHistoryResponse,
  ClientItem,
  ClientSuggestionsResponse,
  ClientsResponse,
  ConfigResponse,
  DatabaseInfo,
  DatabaseSummary,
  DhcpLeasesResponse,
  DomainItem,
  DomainKind,
  DomainType,
  DomainsResponse,
  FtlInfo,
  GatewayResponse,
  GroupItem,
  GroupsResponse,
  HistoryResponse,
  HostInfo,
  InterfacesResponse,
  ListType,
  ListsResponse,
  LogResponse,
  MessagesCountResponse,
  MessagesResponse,
  MetricsResponse,
  NetworkDevicesResponse,
  PaddResponse,
  QueriesResponse,
  QueryFilters,
  QueryTypesResponse,
  RecentBlockedResponse,
  RoutesResponse,
  SearchResponse,
  SensorsInfo,
  SessionResponse,
  SessionsResponse,
  StatsSummary,
  SuggestionsResponse,
  SystemInfo,
  TopClientsResponse,
  TopDomainsResponse,
  UpstreamsResponse,
  VersionInfo,
} from './types';

export class PiholeApiError extends Error {
  readonly status: number;
  readonly key: string;
  readonly hint: string | null;

  constructor(status: number, key: string, message: string, hint: string | null = null) {
    super(message);
    this.name = 'PiholeApiError';
    this.status = status;
    this.key = key;
    this.hint = hint;
  }

  /** The session expired or the credentials are no longer accepted. */
  get isUnauthorized() {
    return this.status === 401;
  }

  get isRateLimited() {
    return this.status === 429;
  }
}

export class PiholeNetworkError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'PiholeNetworkError';
  }
}

export interface PiholeCredentials {
  /** Base origin, e.g. `http://192.168.1.10` or `https://pi.hole:443`. */
  baseUrl: string;
  /** Web-interface password or an application password. */
  password?: string;
  /** Current TOTP code, only needed while 2FA is enabled. */
  totp?: string;
}

type Json = Record<string, unknown>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: Json | unknown[];
  /** Skip the automatic re-login + retry on a 401. */
  noRetry?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT = 15_000;

/**
 * Normalises whatever the user typed into a usable API origin.
 * Accepts `192.168.1.5`, `pi.hole`, `http://pi.hole/admin`, `https://x:8443/api`.
 *
 * Parsing is done with a plain regex rather than `URL` because React Native's
 * `URL` is a regex approximation itself and behaves differently across
 * platforms — this keeps the result identical everywhere.
 */
export function normaliseBaseUrl(input: string): string {
  let value = input.trim();
  if (!value) return '';
  value = value.replace(/\s+/g, '');
  if (!/^https?:\/\//i.test(value)) value = `http://${value}`;

  const match = value.match(/^(https?):\/\/([^/?#]+)([^?#]*)/i);
  if (!match) return value.replace(/\/+$/, '');

  const protocol = match[1].toLowerCase();
  const authority = match[2].toLowerCase();
  // Strip well-known suffixes so users can paste their dashboard URL verbatim.
  const path = match[3].replace(/\/+$/, '').replace(/\/(api|admin)$/i, '');
  return `${protocol}://${authority}${path}`;
}

/** Host portion of a normalised base URL, without port — used for default names. */
export function hostnameOf(baseUrl: string): string {
  const match = normaliseBaseUrl(baseUrl).match(/^https?:\/\/(?:[^@/]*@)?([^:/?#]+)/i);
  return match ? match[1] : baseUrl;
}

export function apiRoot(baseUrl: string): string {
  return `${normaliseBaseUrl(baseUrl).replace(/\/+$/, '')}/api`;
}

/**
 * A stateful client for one Pi-hole server.
 *
 * It owns the session (SID + CSRF token), transparently re-authenticates when
 * the session expires, and exposes a typed method per API endpoint group.
 */
export class PiholeClient {
  baseUrl: string;
  private password?: string;
  private totp?: string;
  private sid: string | null = null;
  private csrf: string | null = null;
  private validUntil = 0;
  private loginPromise: Promise<void> | null = null;

  onSessionChange?: (sid: string | null) => void;

  constructor(credentials: PiholeCredentials) {
    this.baseUrl = normaliseBaseUrl(credentials.baseUrl);
    this.password = credentials.password;
    this.totp = credentials.totp;
  }

  get root() {
    return apiRoot(this.baseUrl);
  }

  get hasSession() {
    return Boolean(this.sid) && Date.now() < this.validUntil;
  }

  setPassword(password?: string) {
    this.password = password;
    this.invalidateSession();
  }

  setTotp(totp?: string) {
    this.totp = totp;
  }

  adoptSession(sid: string | null, csrf: string | null = null, validitySeconds = 0) {
    this.sid = sid;
    this.csrf = csrf;
    this.validUntil = sid ? Date.now() + validitySeconds * 1000 : 0;
  }

  invalidateSession() {
    this.sid = null;
    this.csrf = null;
    this.validUntil = 0;
    this.onSessionChange?.(null);
  }

  /* ── Transport ─────────────────────────────────────────────────────────── */

  private buildUrl(path: string, query?: RequestOptions['query']) {
    const base = `${this.root}${path}`;
    if (!query) return base;
    const parts: string[] = [];
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
    return parts.length > 0 ? `${base}?${parts.join('&')}` : base;
  }

  private async raw<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', query, body, signal, timeoutMs = DEFAULT_TIMEOUT } = options;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort);

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.sid) headers['X-FTL-SID'] = this.sid;
    if (this.csrf) headers['X-FTL-CSRF'] = this.csrf;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    let response: Response;
    try {
      response = await fetch(this.buildUrl(path, query), {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      const aborted = (error as Error)?.name === 'AbortError';
      throw new PiholeNetworkError(
        aborted
          ? 'The Pi-hole did not answer in time. Check the address and that you are on the same network.'
          : 'Could not reach the Pi-hole. Check the address, port and your network connection.',
        error,
      );
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }

    if (response.status === 204) return undefined as T;

    const text = await response.text();
    let payload: unknown = undefined;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = undefined;
      }
    }

    if (!response.ok) {
      const err = (payload as ApiErrorBody | undefined)?.error;
      throw new PiholeApiError(
        response.status,
        err?.key ?? String(response.status),
        err?.message ?? `Request failed with status ${response.status}`,
        err?.hint ?? null,
      );
    }

    return (payload ?? ({} as T)) as T;
  }

  /** Performs a request, logging in first (or again) when the session is not usable. */
  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (!this.hasSession && this.password) await this.ensureSession();
    try {
      return await this.raw<T>(path, options);
    } catch (error) {
      if (error instanceof PiholeApiError && error.isUnauthorized && !options.noRetry && this.password) {
        this.invalidateSession();
        await this.ensureSession();
        return this.raw<T>(path, { ...options, noRetry: true });
      }
      throw error;
    }
  }

  /* ── Authentication ────────────────────────────────────────────────────── */

  /** Logs in when needed; concurrent callers share a single in-flight login. */
  async ensureSession(): Promise<void> {
    if (this.hasSession) return;
    if (!this.loginPromise) {
      this.loginPromise = this.login()
        .then(() => undefined)
        .finally(() => {
          this.loginPromise = null;
        });
    }
    await this.loginPromise;
  }

  async login(): Promise<SessionResponse['session']> {
    const body: Json = {};
    if (this.password) body.password = this.password;
    if (this.totp) body.totp = this.totp;

    const result = await this.raw<SessionResponse>('/auth', { method: 'POST', body, noRetry: true });
    const session = result.session;
    if (!session?.valid || !session.sid) {
      throw new PiholeApiError(401, 'unauthorized', session?.message ?? 'Login failed');
    }
    this.sid = session.sid;
    this.csrf = session.csrf ?? null;
    this.validUntil = Date.now() + Math.max(0, session.validity - 15) * 1000;
    this.onSessionChange?.(session.sid);
    // A TOTP token is single-use; drop it so a later refresh does not reuse it.
    this.totp = undefined;
    return session;
  }

  /** `GET /auth` — tells whether this Pi-hole needs a password at all. */
  checkAuth() {
    return this.raw<SessionResponse>('/auth', { noRetry: true });
  }

  async logout(): Promise<void> {
    if (!this.sid) return;
    try {
      await this.raw<void>('/auth', { method: 'DELETE', noRetry: true });
    } catch {
      // A dead session is exactly what we wanted anyway.
    } finally {
      this.invalidateSession();
    }
  }

  listSessions() {
    return this.request<SessionsResponse>('/auth/sessions');
  }

  deleteSession(id: number) {
    return this.request<void>(`/auth/session/${id}`, { method: 'DELETE' });
  }

  createAppPassword() {
    return this.request<{ app: { password: string; hash: string } }>('/auth/app');
  }

  /* ── Metrics ───────────────────────────────────────────────────────────── */

  summary() {
    return this.request<StatsSummary>('/stats/summary');
  }

  padd() {
    return this.request<PaddResponse>('/padd');
  }

  history() {
    return this.request<HistoryResponse>('/history');
  }

  historyClients(count = 10) {
    return this.request<ClientHistoryResponse>('/history/clients', { query: { N: count } });
  }

  databaseHistory(from: number, until: number) {
    return this.request<HistoryResponse>('/history/database', { query: { from, until } });
  }

  databaseSummary(from: number, until: number) {
    return this.request<DatabaseSummary>('/stats/database/summary', { query: { from, until } });
  }

  upstreams() {
    return this.request<UpstreamsResponse>('/stats/upstreams');
  }

  topDomains(blocked = false, count = 10) {
    return this.request<TopDomainsResponse>('/stats/top_domains', { query: { blocked, count } });
  }

  topClients(blocked = false, count = 10) {
    return this.request<TopClientsResponse>('/stats/top_clients', { query: { blocked, count } });
  }

  queryTypes() {
    return this.request<QueryTypesResponse>('/stats/query_types');
  }

  recentBlocked(count = 10) {
    return this.request<RecentBlockedResponse>('/stats/recent_blocked', { query: { count } });
  }

  /* ── Query log ─────────────────────────────────────────────────────────── */

  queries(filters: QueryFilters = {}) {
    return this.request<QueriesResponse>('/queries', {
      query: filters as Record<string, string | number | boolean | undefined>,
    });
  }

  querySuggestions() {
    return this.request<SuggestionsResponse>('/queries/suggestions');
  }

  /* ── DNS control ───────────────────────────────────────────────────────── */

  blocking() {
    return this.request<BlockingResponse>('/dns/blocking');
  }

  setBlocking(enabled: boolean, timerSeconds: number | null = null) {
    return this.request<BlockingResponse>('/dns/blocking', {
      method: 'POST',
      body: { blocking: enabled, timer: timerSeconds },
    });
  }

  /* ── Domains ───────────────────────────────────────────────────────────── */

  domains(type?: DomainType, kind?: DomainKind) {
    const path = type ? (kind ? `/domains/${type}/${kind}` : `/domains/${type}`) : '/domains';
    return this.request<DomainsResponse>(path);
  }

  addDomain(input: {
    domain: string | string[];
    type: DomainType;
    kind: DomainKind;
    comment?: string | null;
    groups?: number[];
    enabled?: boolean;
  }) {
    const { type, kind, ...body } = input;
    return this.request<DomainsResponse>(`/domains/${type}/${kind}`, { method: 'POST', body: body as Json });
  }

  updateDomain(
    original: Pick<DomainItem, 'domain' | 'type' | 'kind'>,
    changes: { type?: DomainType; kind?: DomainKind; comment?: string | null; groups?: number[]; enabled?: boolean },
  ) {
    return this.request<DomainsResponse>(
      `/domains/${original.type}/${original.kind}/${encodeURIComponent(original.domain)}`,
      {
        method: 'PUT',
        body: {
          type: changes.type ?? original.type,
          kind: changes.kind ?? original.kind,
          comment: changes.comment,
          groups: changes.groups,
          enabled: changes.enabled,
        } as Json,
      },
    );
  }

  deleteDomain(item: Pick<DomainItem, 'domain' | 'type' | 'kind'>) {
    return this.request<void>(`/domains/${item.type}/${item.kind}/${encodeURIComponent(item.domain)}`, {
      method: 'DELETE',
    });
  }

  batchDeleteDomains(items: Pick<DomainItem, 'domain' | 'type' | 'kind'>[]) {
    return this.request<void>('/domains:batchDelete', { method: 'POST', body: items });
  }

  /* ── Groups ────────────────────────────────────────────────────────────── */

  groups() {
    return this.request<GroupsResponse>('/groups');
  }

  addGroup(input: { name: string | string[]; comment?: string | null; enabled?: boolean }) {
    return this.request<GroupsResponse>('/groups', { method: 'POST', body: input as Json });
  }

  updateGroup(name: string, changes: { name?: string; comment?: string | null; enabled?: boolean }) {
    return this.request<GroupsResponse>(`/groups/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body: { name: changes.name ?? name, comment: changes.comment, enabled: changes.enabled } as Json,
    });
  }

  deleteGroup(name: string) {
    return this.request<void>(`/groups/${encodeURIComponent(name)}`, { method: 'DELETE' });
  }

  /* ── Clients ───────────────────────────────────────────────────────────── */

  clients() {
    return this.request<ClientsResponse>('/clients');
  }

  clientSuggestions() {
    return this.request<ClientSuggestionsResponse>('/clients/_suggestions');
  }

  addClient(input: { client: string | string[]; comment?: string | null; groups?: number[] }) {
    return this.request<ClientsResponse>('/clients', { method: 'POST', body: input as Json });
  }

  updateClient(client: string, changes: { comment?: string | null; groups?: number[] }) {
    return this.request<ClientsResponse>(`/clients/${encodeURIComponent(client)}`, {
      method: 'PUT',
      body: changes as Json,
    });
  }

  deleteClient(client: string) {
    return this.request<void>(`/clients/${encodeURIComponent(client)}`, { method: 'DELETE' });
  }

  /* ── Adlists ───────────────────────────────────────────────────────────── */

  lists(type?: ListType) {
    return this.request<ListsResponse>('/lists', { query: { type } });
  }

  addList(input: { address: string | string[]; type: ListType; comment?: string | null; groups?: number[]; enabled?: boolean }) {
    return this.request<ListsResponse>('/lists', { method: 'POST', body: input as Json });
  }

  updateList(
    address: string,
    changes: { type: ListType; comment?: string | null; groups?: number[]; enabled?: boolean },
  ) {
    return this.request<ListsResponse>(`/lists/${encodeURIComponent(address)}`, {
      method: 'PUT',
      query: { type: changes.type },
      body: changes as Json,
    });
  }

  deleteList(address: string, type: ListType) {
    return this.request<void>(`/lists/${encodeURIComponent(address)}`, { method: 'DELETE', query: { type } });
  }

  /* ── Search ────────────────────────────────────────────────────────────── */

  search(domain: string, options: { N?: number; partial?: boolean } = {}) {
    return this.request<SearchResponse>(`/search/${encodeURIComponent(domain)}`, {
      query: { N: options.N ?? 20, partial: options.partial },
    });
  }

  /* ── Info & diagnostics ────────────────────────────────────────────────── */

  systemInfo() {
    return this.request<SystemInfo>('/info/system');
  }

  hostInfo() {
    return this.request<HostInfo>('/info/host');
  }

  ftlInfo() {
    return this.request<FtlInfo>('/info/ftl');
  }

  versionInfo() {
    return this.request<VersionInfo>('/info/version');
  }

  sensors() {
    return this.request<SensorsInfo>('/info/sensors');
  }

  databaseInfo() {
    return this.request<DatabaseInfo>('/info/database');
  }

  messages() {
    return this.request<MessagesResponse>('/info/messages');
  }

  messagesCount() {
    return this.request<MessagesCountResponse>('/info/messages/count');
  }

  deleteMessage(id: number) {
    return this.request<void>(`/info/messages/${id}`, { method: 'DELETE' });
  }

  metrics() {
    return this.request<MetricsResponse>('/info/metrics');
  }

  log(kind: 'dnsmasq' | 'ftl' | 'webserver', nextID?: number) {
    return this.request<LogResponse>(`/logs/${kind}`, { query: { nextID } });
  }

  /* ── Network ───────────────────────────────────────────────────────────── */

  networkDevices(maxDevices = 100, maxAddresses = 5) {
    return this.request<NetworkDevicesResponse>('/network/devices', {
      query: { max_devices: maxDevices, max_addresses: maxAddresses },
    });
  }

  deleteNetworkDevice(id: number) {
    return this.request<void>(`/network/devices/${id}`, { method: 'DELETE' });
  }

  gateway(detailed = true) {
    return this.request<GatewayResponse>('/network/gateway', { query: { detailed } });
  }

  routes() {
    return this.request<RoutesResponse>('/network/routes');
  }

  interfaces() {
    return this.request<InterfacesResponse>('/network/interfaces');
  }

  /* ── DHCP ──────────────────────────────────────────────────────────────── */

  dhcpLeases() {
    return this.request<DhcpLeasesResponse>('/dhcp/leases');
  }

  deleteDhcpLease(ip: string) {
    return this.request<void>(`/dhcp/leases/${encodeURIComponent(ip)}`, { method: 'DELETE' });
  }

  /* ── Actions ───────────────────────────────────────────────────────────── */

  runGravity() {
    // Gravity streams plain text progress rather than JSON, so read it raw.
    return this.streamText('/action/gravity');
  }

  restartDns() {
    return this.request<ActionResponse>('/action/restartdns', { method: 'POST' });
  }

  flushLogs() {
    return this.request<ActionResponse>('/action/flush/logs', { method: 'POST' });
  }

  flushArp() {
    return this.request<ActionResponse>('/action/flush/arp', { method: 'POST' });
  }

  flushNetwork() {
    return this.request<ActionResponse>('/action/flush/network', { method: 'POST' });
  }

  /* ── Configuration ─────────────────────────────────────────────────────── */

  config(detailed = false) {
    return this.request<ConfigResponse>('/config', { query: { detailed } });
  }

  configElement(element: string) {
    return this.request<ConfigResponse>(`/config/${element}`);
  }

  setConfig(patch: Json) {
    return this.request<ConfigResponse>('/config', { method: 'PATCH', body: { config: patch } });
  }

  /* ── Helpers ───────────────────────────────────────────────────────────── */

  /** POSTs to an endpoint that answers with a plain-text stream and returns the full body. */
  async streamText(path: string, timeoutMs = 180_000): Promise<string> {
    if (!this.hasSession && this.password) await this.ensureSession();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const headers: Record<string, string> = { Accept: 'text/plain' };
    if (this.sid) headers['X-FTL-SID'] = this.sid;
    if (this.csrf) headers['X-FTL-CSRF'] = this.csrf;
    try {
      const response = await fetch(this.buildUrl(path), { method: 'POST', headers, signal: controller.signal });
      const text = await response.text();
      if (!response.ok) {
        throw new PiholeApiError(response.status, 'action_failed', text.slice(0, 400) || 'Action failed');
      }
      return text;
    } catch (error) {
      if (error instanceof PiholeApiError) throw error;
      throw new PiholeNetworkError('The action could not be completed.', error);
    } finally {
      clearTimeout(timer);
    }
  }
}

export type { AdList, ClientItem, DomainItem, GroupItem };
