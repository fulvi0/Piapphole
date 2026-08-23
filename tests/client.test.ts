import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import { PiholeApiError, PiholeClient, apiRoot, hostnameOf, normaliseBaseUrl } from '../src/api/client';

describe('normaliseBaseUrl', () => {
  const cases: [string, string][] = [
    ['192.168.1.10', 'http://192.168.1.10'],
    ['pi.hole', 'http://pi.hole'],
    ['http://pi.hole/admin', 'http://pi.hole'],
    ['http://pi.hole/api', 'http://pi.hole'],
    ['https://pi.hole:8443/api', 'https://pi.hole:8443'],
    ['https://host.example/pihole/', 'https://host.example/pihole'],
    ['  HTTP://PI.HOLE/  ', 'http://pi.hole'],
    ['', ''],
  ];

  for (const [input, expected] of cases) {
    it(`normalises ${JSON.stringify(input)}`, () => {
      assert.equal(normaliseBaseUrl(input), expected);
    });
  }

  it('derives the API root and hostname', () => {
    assert.equal(apiRoot('192.168.1.10'), 'http://192.168.1.10/api');
    assert.equal(hostnameOf('https://pi.hole:8443/api'), 'pi.hole');
  });
});

interface RecordedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

/** Minimal stand-in for a Pi-hole that requires a password. */
function mockPihole(password = 'correct') {
  const calls: RecordedCall[] = [];
  const state = { sid: null as string | null };

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  const impl = async (url: string | URL | Request, init: RequestInit = {}): Promise<Response> => {
    const target = String(url);
    const headers = (init.headers ?? {}) as Record<string, string>;
    calls.push({ url: target, method: init.method ?? 'GET', headers, body: init.body as string | undefined });

    if (target.endsWith('/api/auth') && init.method === 'POST') {
      const payload = JSON.parse(String(init.body)) as { password?: string };
      if (payload.password !== password) {
        return json({ error: { key: 'unauthorized', message: 'bad password', hint: null } }, 401);
      }
      state.sid = `sid-${calls.length}`;
      return json({
        session: { valid: true, totp: false, sid: state.sid, csrf: 'csrf', validity: 1800, message: null },
      });
    }

    if (headers['X-FTL-SID'] !== state.sid) {
      return json({ error: { key: 'unauthorized', message: 'session expired', hint: null } }, 401);
    }
    if (target.includes('/api/stats/summary')) return json({ queries: { total: 42 } });
    if (target.includes('/api/queries')) return json({ queries: [], recordsTotal: 0, recordsFiltered: 0 });
    return json({}, 404);
  };

  globalThis.fetch = impl as unknown as typeof fetch;
  return { calls, state };
}

describe('PiholeClient', () => {
  it('logs in on the first request and reuses the session', async () => {
    const { calls } = mockPihole();
    const client = new PiholeClient({ baseUrl: '192.168.1.10', password: 'correct' });

    assert.deepEqual(await client.summary(), { queries: { total: 42 } });
    await client.summary();

    const logins = calls.filter((call) => call.url.endsWith('/api/auth'));
    assert.equal(logins.length, 1, 'should authenticate only once');
    assert.ok(calls[calls.length - 1].headers['X-FTL-SID']);
  });

  it('re-authenticates and retries once when the session expires', async () => {
    const { calls, state } = mockPihole();
    const client = new PiholeClient({ baseUrl: 'pi.hole', password: 'correct' });

    await client.summary();
    state.sid = 'rotated-out-of-band';

    assert.deepEqual(await client.summary(), { queries: { total: 42 } });
    assert.equal(calls.filter((call) => call.url.endsWith('/api/auth')).length, 2);
  });

  it('reports a rejected password as an unauthorised API error', async () => {
    mockPihole('correct');
    const client = new PiholeClient({ baseUrl: 'pi.hole', password: 'wrong' });

    await assert.rejects(
      () => client.summary(),
      (error: unknown) => error instanceof PiholeApiError && error.status === 401,
    );
  });

  it('builds query strings from filters and drops empty values', async () => {
    const { calls } = mockPihole();
    const client = new PiholeClient({ baseUrl: 'pi.hole', password: 'correct' });

    await client.queries({ domain: '*ads*', length: 50, disk: false, client_ip: '' });

    const request = calls[calls.length - 1].url;
    assert.ok(request.includes('/api/queries?'), request);
    // encodeURIComponent leaves `*` alone, which Pi-hole accepts as a wildcard.
    assert.ok(request.includes('domain=*ads*'), request);
    assert.ok(request.includes('length=50'), request);
    assert.ok(request.includes('disk=false'), request);
    assert.ok(!request.includes('client_ip'), request);
  });

  it('surfaces unreachable servers as a network error', async () => {
    globalThis.fetch = mock.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;

    const client = new PiholeClient({ baseUrl: 'unreachable.invalid' });
    await assert.rejects(() => client.summary(), { name: 'PiholeNetworkError' });
  });

  it('sends the TOTP code once and then forgets it', async () => {
    const calls: RecordedCall[] = [];
    globalThis.fetch = (async (url: string | URL | Request, init: RequestInit = {}) => {
      calls.push({
        url: String(url),
        method: init.method ?? 'GET',
        headers: (init.headers ?? {}) as Record<string, string>,
        body: init.body as string | undefined,
      });
      if (String(url).endsWith('/api/auth')) {
        return new Response(
          JSON.stringify({
            session: { valid: true, totp: true, sid: 'sid', csrf: 'csrf', validity: 1800, message: null },
          }),
          { status: 200 },
        );
      }
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;

    const client = new PiholeClient({ baseUrl: 'pi.hole', password: 'correct', totp: '123456' });
    await client.login();
    client.invalidateSession();
    await client.login();

    assert.equal(JSON.parse(calls[0].body!).totp, '123456');
    assert.equal(JSON.parse(calls[1].body!).totp, undefined, 'a used TOTP must not be replayed');
  });
});
