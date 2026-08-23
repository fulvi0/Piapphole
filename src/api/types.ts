/**
 * TypeScript definitions for the Pi-hole v6 REST API.
 * Mirrors https://docs.pi-hole.net/api/ (FTL OpenAPI specification).
 */

export interface Took {
  took?: number;
}

export interface PiholeSession {
  valid: boolean;
  totp: boolean;
  sid: string | null;
  csrf: string | null;
  validity: number;
  message: string | null;
}

export interface SessionResponse extends Took {
  session: PiholeSession;
}

export interface ApiErrorBody {
  error: {
    key: string;
    message: string;
    hint: string | null;
  };
}

/* ── Metrics ─────────────────────────────────────────────────────────────── */

export type QueryTypeName =
  | 'A'
  | 'AAAA'
  | 'ANY'
  | 'SRV'
  | 'SOA'
  | 'PTR'
  | 'TXT'
  | 'NAPTR'
  | 'MX'
  | 'DS'
  | 'RRSIG'
  | 'DNSKEY'
  | 'NS'
  | 'SVCB'
  | 'HTTPS'
  | 'OTHER';

export type QueryStatusName =
  | 'UNKNOWN'
  | 'GRAVITY'
  | 'FORWARDED'
  | 'CACHE'
  | 'REGEX'
  | 'DENYLIST'
  | 'EXTERNAL_BLOCKED_IP'
  | 'EXTERNAL_BLOCKED_NULL'
  | 'EXTERNAL_BLOCKED_NXRA'
  | 'EXTERNAL_BLOCKED_EDE15'
  | 'GRAVITY_CNAME'
  | 'REGEX_CNAME'
  | 'DENYLIST_CNAME'
  | 'RETRIED'
  | 'RETRIED_DNSSEC'
  | 'IN_PROGRESS'
  | 'DBBUSY'
  | 'SPECIAL_DOMAIN'
  | 'CACHE_STALE';

export interface StatsSummary extends Took {
  queries: {
    total: number;
    blocked: number;
    percent_blocked: number;
    unique_domains: number;
    forwarded: number;
    cached: number;
    frequency: number;
    types: Record<string, number>;
    status: Record<string, number>;
    replies: Record<string, number>;
  };
  clients: { active: number; total: number };
  gravity: { domains_being_blocked: number; last_update: number };
}

export interface UpstreamEntry {
  ip: string | null;
  name: string | null;
  port: number;
  count: number;
  statistics: { response: number; variance: number };
}

export interface UpstreamsResponse extends Took {
  upstreams: UpstreamEntry[];
  forwarded_queries: number;
  total_queries: number;
}

export interface TopDomainsResponse extends Took {
  domains: { domain: string; count: number }[];
  total_queries: number;
  blocked_queries: number;
}

export interface TopClientsResponse extends Took {
  clients: { ip: string; name: string | null; count: number }[];
  total_queries: number;
  blocked_queries: number;
}

export interface QueryTypesResponse extends Took {
  types: Record<string, number>;
}

export interface RecentBlockedResponse extends Took {
  blocked: string[];
}

export interface HistoryPoint {
  timestamp: number;
  total: number;
  cached: number;
  blocked: number;
  forwarded: number;
}

export interface HistoryResponse extends Took {
  history: HistoryPoint[];
}

export interface ClientHistoryResponse extends Took {
  clients: Record<string, { name: string | null; total: number }>;
  history: { timestamp: number; data: Record<string, number> }[];
}

export interface DatabaseSummary extends Took {
  sum_queries: number;
  sum_blocked: number;
  percent_blocked: number;
  total_clients: number;
}

/* ── Query log ───────────────────────────────────────────────────────────── */

export interface QueryEntry {
  id: number;
  time: number;
  type: string;
  domain: string;
  cname: string | null;
  status: string | null;
  client: { ip: string; name: string | null };
  dnssec: string | null;
  reply: { type: string | null; time: number };
  list_id: number | null;
  upstream: string | null;
  ede?: { code: number; text: string | null };
}

export interface QueriesResponse extends Took {
  queries: QueryEntry[];
  cursor: number;
  recordsTotal: number;
  recordsFiltered: number;
  draw: number;
  earliest_timestamp?: number;
  earliest_timestamp_disk?: number;
}

export interface QueryFilters {
  from?: number;
  until?: number;
  length?: number;
  start?: number;
  cursor?: number;
  domain?: string;
  client_ip?: string;
  client_name?: string;
  upstream?: string;
  type?: string;
  status?: string;
  reply?: string;
  dnssec?: string;
  disk?: boolean;
}

export interface SuggestionsResponse extends Took {
  suggestions: {
    domain: string[];
    client_ip: string[];
    client_name: string[];
    upstream: string[];
    type: string[];
    status: string[];
    reply: string[];
    dnssec: string[];
  };
}

/* ── DNS control ─────────────────────────────────────────────────────────── */

export type BlockingState = 'enabled' | 'disabled' | 'failed' | 'unknown';

export interface BlockingResponse extends Took {
  blocking: BlockingState;
  timer: number | null;
}

/* ── Lists / domains / groups / clients ──────────────────────────────────── */

export type DomainType = 'allow' | 'deny';
export type DomainKind = 'exact' | 'regex';

export interface DomainItem {
  domain: string;
  unicode?: string;
  type: DomainType;
  kind: DomainKind;
  comment: string | null;
  groups: number[];
  enabled: boolean;
  id: number;
  date_added: number;
  date_modified: number;
}

export interface DomainsResponse extends Took {
  domains: DomainItem[];
  processed?: ProcessedResult | null;
}

export interface ProcessedResult {
  success: { item: string }[];
  errors: { item: string; error: string }[];
}

export type ListType = 'allow' | 'block';

export interface AdList {
  address: string;
  type: ListType;
  comment: string | null;
  groups: number[];
  enabled: boolean;
  id: number;
  date_added: number;
  date_modified: number;
  date_updated: number;
  number: number;
  invalid_domains: number;
  abp_entries: number;
  status: number;
}

export interface ListsResponse extends Took {
  lists: AdList[];
  processed?: ProcessedResult | null;
}

export interface GroupItem {
  name: string;
  comment: string | null;
  enabled: boolean;
  id: number;
  date_added: number;
  date_modified: number;
}

export interface GroupsResponse extends Took {
  groups: GroupItem[];
  processed?: ProcessedResult | null;
}

export interface ClientItem {
  client: string;
  name?: string | null;
  comment: string | null;
  groups: number[];
  id: number;
  date_added: number;
  date_modified: number;
}

export interface ClientsResponse extends Took {
  clients: ClientItem[];
  processed?: ProcessedResult | null;
}

export interface ClientSuggestion {
  hwaddr: string | null;
  macVendor: string | null;
  lastQuery: number;
  addresses: string | null;
  names: string | null;
}

export interface ClientSuggestionsResponse extends Took {
  clients: ClientSuggestion[];
}

export interface SearchResponse extends Took {
  search: {
    domains: {
      domain: string;
      comment: string | null;
      enabled: boolean;
      id: number;
      type: string;
      kind: string;
      groups: number[];
    }[];
    gravity: {
      domain: string;
      address: string;
      comment: string | null;
      enabled: boolean;
      id: number;
      type: string;
      groups: number[];
    }[];
    results: { domains: { exact: number; regex: number }; gravity: { allow: number; block: number } };
    parameters: { N: number; partial: boolean; domain: string; debug: boolean };
  };
}

/* ── Info / diagnostics ──────────────────────────────────────────────────── */

export interface SystemInfo extends Took {
  system: {
    uptime: number;
    memory: {
      ram: { total: number; free: number; used: number; available: number; '%used': number };
      swap: { total: number; used: number; free: number; '%used': number };
    };
    procs: number;
    cpu: {
      nprocs: number;
      load: { raw: number[]; percent: number[] };
      '%cpu'?: number;
    };
  };
}

export interface HostInfo extends Took {
  host: {
    uname: {
      domainname: string;
      machine: string;
      nodename: string;
      release: string;
      sysname: string;
      version: string;
    };
    model: string | null;
    dmi?: Record<string, Record<string, string | null>>;
  };
}

export interface VersionInfo extends Took {
  version: {
    core: VersionBranchInfo;
    web: VersionBranchInfo;
    ftl: VersionBranchInfo;
    docker?: { local: string | null; remote: string | null };
  };
}

export interface VersionBranchInfo {
  local: { branch: string | null; version: string | null; hash: string | null; date?: string | null };
  remote: { version: string | null; hash: string | null };
}

export interface FtlInfo extends Took {
  ftl: {
    database: {
      gravity: number;
      antigravity: number;
      groups: number;
      lists: number;
      clients: number;
      domains: { allowed: { total: number; enabled: number }; denied: { total: number; enabled: number } };
      regex: { allowed: { total: number; enabled: number }; denied: { total: number; enabled: number } };
    };
    privacy_level: number;
    clients: { total: number; active: number };
    pid: number;
    uptime: number;
    '%cpu': number;
    '%mem': number;
    allow_destructive: boolean;
    dnsmasq?: Record<string, unknown>;
  };
}

export interface SensorReading {
  name: string | null;
  value: number;
  max: number | null;
  crit: number | null;
  sensor: string;
}

export interface SensorsInfo extends Took {
  sensors: {
    list: { name: string | null; path: string; source: string; temps: SensorReading[] }[];
    cpu_temp: number | null;
    hot_limit: number;
    unit: string;
  };
}

export interface DatabaseInfo extends Took {
  database: {
    queries: { total: number; null: number };
    filesize: number;
    sqlite_version: string;
  };
}

export interface FtlMessage {
  id: number;
  timestamp: number;
  type: string;
  plain: string;
  html: string;
  url?: string | null;
}

export interface MessagesResponse extends Took {
  messages: FtlMessage[];
}

export interface MessagesCountResponse extends Took {
  count: number;
}

export interface MetricsResponse extends Took {
  metrics: {
    dns: {
      cache: {
        size: number;
        inserted: number;
        evicted: number;
        expired: number;
        immortal: number;
        content?: unknown[];
      };
      replies?: Record<string, number>;
    };
    dhcp?: Record<string, unknown>;
  };
}

export interface LogResponse extends Took {
  log: { timestamp: number; prio?: string; message: string }[];
  nextID: number;
  pid: number;
  file: string;
}

/* ── Network ─────────────────────────────────────────────────────────────── */

export interface NetworkDeviceAddress {
  ip: string;
  name: string | null;
  lastSeen: number;
  nameUpdated: number;
}

export interface NetworkDevice {
  id: number;
  hwaddr: string;
  interface: string;
  firstSeen: number;
  lastQuery: number;
  numQueries: number;
  macVendor: string | null;
  ips: NetworkDeviceAddress[];
}

export interface NetworkDevicesResponse extends Took {
  devices: NetworkDevice[];
}

export interface GatewayEntry {
  family: string;
  interface: string;
  address: string;
  local: string[];
}

export interface GatewayResponse extends Took {
  gateway: GatewayEntry[];
}

export interface RouteEntry {
  gateway?: string;
  family: string;
  table: number;
  protocol: string;
  scope: string;
  type: string;
  flags: string[];
  oif?: string;
  iif?: string;
  dst?: string;
  src?: string;
  prefsrc?: string;
  priority?: number;
  pref?: number;
}

export interface RoutesResponse extends Took {
  routes: RouteEntry[];
}

export interface InterfaceEntry {
  name: string;
  index?: number;
  family?: string;
  flags?: string[];
  addresses?: { address: string; family: string; prefixlen?: number }[];
  speed?: number | null;
  type?: string | null;
  carrier?: boolean;
  state?: string;
  stats?: {
    rx_bytes?: { value: number; unit: string };
    tx_bytes?: { value: number; unit: string };
  };
}

export interface InterfacesResponse extends Took {
  interfaces: InterfaceEntry[];
}

/* ── DHCP ────────────────────────────────────────────────────────────────── */

export interface DhcpLease {
  expires: number;
  name: string;
  hwaddr: string;
  ip: string;
  clientid: string;
}

export interface DhcpLeasesResponse extends Took {
  leases: DhcpLease[];
}

/* ── PADD ────────────────────────────────────────────────────────────────── */

export interface PaddResponse extends Took {
  recent_blocked: string | null;
  top_domain: string | null;
  top_blocked: string | null;
  top_client: string | null;
  active_clients: number;
  gravity_size: number;
  blocking: BlockingState;
  queries: { total: number; blocked: number; percent_blocked: number; query_frequency: number };
  cache: { size: number; inserted: number; evicted: number };
  iface: {
    v4: PaddInterface;
    v6: Omit<PaddInterface, 'rx_bytes' | 'tx_bytes'>;
  };
  node_name: string;
  host_model: string | null;
  config: {
    dhcp_active: boolean;
    dhcp_start: string;
    dhcp_end: string;
    dhcp_ipv6: boolean;
    dns_domain: string;
    dns_port: number;
    dns_num_upstreams: number;
    dns_dnssec: boolean;
    dns_revServer_active: boolean;
    privacy_level: number;
  };
  '%cpu': number;
  '%mem': number;
  pid: number;
  sensors: { cpu_temp: number | null; hot_limit: number; unit: string };
  system: { uptime: number; memory?: unknown };
  version?: VersionInfo['version'];
}

export interface PaddInterface {
  addr: string | null;
  rx_bytes: { value: number; unit: string };
  tx_bytes: { value: number; unit: string };
  num_addrs: number;
  name: string;
  gw_addr: string | null;
}

/* ── Actions ─────────────────────────────────────────────────────────────── */

export interface ActionResponse extends Took {
  status?: string;
  [key: string]: unknown;
}

/* ── Config ──────────────────────────────────────────────────────────────── */

export interface ConfigResponse extends Took {
  config: Record<string, unknown>;
}

/* ── Sessions ────────────────────────────────────────────────────────────── */

export interface ApiSession {
  id: number;
  current_session: boolean;
  valid: boolean;
  tls: { login: boolean; mixed: boolean };
  app: boolean;
  cli: boolean;
  login_at: number;
  last_active: number;
  valid_until: number;
  remote_addr: string;
  user_agent: string | null;
  x_forwarded_for: string | null;
}

export interface SessionsResponse extends Took {
  sessions: ApiSession[];
}
