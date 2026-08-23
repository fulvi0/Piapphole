# Piapphole

An open-source, native mobile client for **Pi-hole v6**, built with Expo and React Native.

Piapphole talks to your Pi-hole's [REST API](https://docs.pi-hole.net/api/) directly from your
device. There is no backend, no account, and no telemetry — credentials live in the device
keychain and every request goes straight to the server you configured.

The interface is designed iOS-first: inset grouped lists, large titles, a blurred tab bar,
SF Symbols, haptics and a full dark mode, with sensible fallbacks on Android and web.

---

## Features

Piapphole covers the everyday Pi-hole workflows end to end.

### Overview
- Blocking on/off with the familiar "pause for 10s / 30s / 1m / 5m / 15m / 1h / indefinitely"
  presets, plus a live countdown when a timer is running
- Total, blocked, cached and forwarded query counts, block percentage, unique domains
- Stacked 24-hour activity chart, query-type donut, upstream response times
- Top permitted/blocked domains and the most active clients, tappable straight into the query log
- Gravity size and last update, active client count, diagnostic-message banner

### Query log
- Infinite-scrolling log with live refresh
- Filter by domain (wildcards), client IP, blocked/permitted, query type, reply type, upstream
  and DNSSEC status — options come from the server's own `/queries/suggestions`
- Per-query detail sheet with the full record, plus one-tap allowlist/denylist, "show only this
  domain/client", gravity lookup and copy

### Manage
- **Allowlist / denylist** — exact and regex rules: add, edit, enable/disable, delete, assign groups
- **Subscribed lists** — blocklists and allowlists with download status, domain counts and health
- **Groups** — create, rename, enable/disable, delete
- **Clients** — assign devices to groups, with suggestions from the Pi-hole network table
- **Search** — answer "why is this domain blocked?" across gravity and your own rules

### System
- CPU load, memory, temperature (with the hot limit), system and FTL uptime
- FTL process stats, privacy level, gravity/anti-gravity counts
- DNS cache metrics and long-term database size
- Network devices, gateway, interfaces and routes
- DHCP leases, with the ability to release one
- dnsmasq / FTL / web-server logs
- Host details and per-component versions with update indicators
- Actions: update gravity (streamed output), restart FTL, flush logs, ARP cache, network table

### Settings
- Multiple Pi-hole servers with instant switching, connection testing and per-server credentials
- Active API sessions on the Pi-hole, with revoke
- Theme (auto/light/dark), live-refresh interval, haptics, compact rows, page size

---

## Requirements

- **Pi-hole v6 or newer** — the REST API this app uses was introduced in v6
- A device that can reach the Pi-hole (same LAN, or a VPN back home)
- For development: Node 20+ and the Expo tooling

## Getting started

```bash
npm install
npm start          # then press i / a, or scan the QR code with Expo Go
```

On first launch, enter your Pi-hole's address (`192.168.1.10`, `pi.hole`, or a full URL such as
`https://pi.hole:8443`). Piapphole probes the server, asks for a password only if one is required,
and asks for a TOTP code only when two-factor authentication is enabled.

> **Tip:** create an *application password* in the Pi-hole web interface
> (Settings → Web interface / API) and use that instead of your main password. It can be revoked
> independently without changing your login.

### Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run ios` / `npm run android` / `npm run web` | Start on a specific platform |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint via `expo lint` |
| `npm test` | Compile and run the API-client tests on the Node test runner |

## Project layout

```
app/                       expo-router routes
  _layout.tsx              providers, theme, root stack
  index.tsx                entry gate (onboarding vs. tabs)
  connect.tsx              guided server setup
  (tabs)/
    _layout.tsx            blurred bottom tab bar
    overview/              dashboard
    queries/               query log
    manage/                domains, lists, groups, clients, search
    system/                diagnostics, network, DHCP, logs, actions
    settings/              servers, sessions, preferences, about
src/
  api/                     typed Pi-hole v6 client and response types
  hooks/usePihole.ts       TanStack Query hooks, one per endpoint group
  store/                   server registry (keychain-backed) and app preferences
  theme/                   colour, type, spacing and radius tokens
  ui/                      design-system primitives (list rows, sheets, buttons, …)
  charts/                  SVG area, donut, bar-list and sparkline charts
  components/              composed feature components
  utils/                   formatting, query-status mapping, haptics
tests/                     API-client tests
```

### The API layer

`src/api/client.ts` is a single stateful class per server. It owns the session (SID + CSRF token),
logs in lazily on the first request, shares one in-flight login between concurrent callers, and
transparently re-authenticates and retries once on a `401`. Network problems, API errors and
rate limiting surface as distinct typed errors so the UI can explain what actually went wrong.

All endpoint groups from the specification are wrapped: auth and sessions, stats, history, queries
and suggestions, DNS blocking, domains, groups, clients, lists, search, info and diagnostics, logs,
network, DHCP, actions, config, and PADD.

## Security notes

- Passwords are stored with `expo-secure-store` (Keychain on iOS, Keystore on Android)
- A TOTP code is used once and then discarded — it is never persisted or replayed
- The iOS build allows plaintext HTTP and local networking, because Pi-hole servers are typically
  reached over plain HTTP on a private network. Use HTTPS where your setup allows it.

## Contributing

Issues and pull requests are welcome. Please keep `npm run typecheck`, `npm run lint` and
`npm test` green.

## License

MIT — see [LICENSE](./LICENSE).

Pi-hole® is a registered trademark of Pi-hole LLC. Piapphole is an independent client and is not
affiliated with or endorsed by the Pi-hole project.
