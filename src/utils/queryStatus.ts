import type { ThemeColors } from '@/theme/tokens';

export type QueryOutcome = 'blocked' | 'allowed' | 'cached' | 'special' | 'unknown';

const BLOCKED = new Set([
  'GRAVITY',
  'REGEX',
  'DENYLIST',
  'EXTERNAL_BLOCKED_IP',
  'EXTERNAL_BLOCKED_NULL',
  'EXTERNAL_BLOCKED_NXRA',
  'EXTERNAL_BLOCKED_EDE15',
  'GRAVITY_CNAME',
  'REGEX_CNAME',
  'DENYLIST_CNAME',
  'SPECIAL_DOMAIN',
]);

const CACHED = new Set(['CACHE', 'CACHE_STALE']);
const ALLOWED = new Set(['FORWARDED', 'RETRIED', 'RETRIED_DNSSEC']);

export function outcomeForStatus(status: string | null | undefined): QueryOutcome {
  if (!status) return 'unknown';
  if (BLOCKED.has(status)) return 'blocked';
  if (CACHED.has(status)) return 'cached';
  if (ALLOWED.has(status)) return 'allowed';
  if (status === 'IN_PROGRESS' || status === 'DBBUSY' || status === 'UNKNOWN') return 'special';
  return 'unknown';
}

export function colorForOutcome(outcome: QueryOutcome, colors: ThemeColors): string {
  switch (outcome) {
    case 'blocked':
      return colors.blocked;
    case 'cached':
      return colors.cached;
    case 'allowed':
      return colors.allowed;
    case 'special':
      return colors.warning;
    default:
      return colors.tertiaryLabel;
  }
}

const STATUS_LABELS: Record<string, string> = {
  UNKNOWN: 'Unknown',
  GRAVITY: 'Blocked (gravity)',
  FORWARDED: 'Forwarded',
  CACHE: 'Cached',
  CACHE_STALE: 'Cached (stale)',
  REGEX: 'Blocked (regex)',
  DENYLIST: 'Blocked (denylist)',
  EXTERNAL_BLOCKED_IP: 'Blocked upstream (IP)',
  EXTERNAL_BLOCKED_NULL: 'Blocked upstream (NULL)',
  EXTERNAL_BLOCKED_NXRA: 'Blocked upstream (NXRA)',
  EXTERNAL_BLOCKED_EDE15: 'Blocked upstream (EDE15)',
  GRAVITY_CNAME: 'Blocked (CNAME gravity)',
  REGEX_CNAME: 'Blocked (CNAME regex)',
  DENYLIST_CNAME: 'Blocked (CNAME denylist)',
  RETRIED: 'Retried',
  RETRIED_DNSSEC: 'Retried (DNSSEC)',
  IN_PROGRESS: 'In progress',
  DBBUSY: 'Database busy',
  SPECIAL_DOMAIN: 'Blocked (special domain)',
};

export function labelForStatus(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  return STATUS_LABELS[status] ?? status.replace(/_/g, ' ').toLowerCase();
}

export function shortLabelForStatus(status: string | null | undefined): string {
  const outcome = outcomeForStatus(status);
  switch (outcome) {
    case 'blocked':
      return 'Blocked';
    case 'cached':
      return 'Cached';
    case 'allowed':
      return 'Forwarded';
    case 'special':
      return 'Pending';
    default:
      return 'Unknown';
  }
}
