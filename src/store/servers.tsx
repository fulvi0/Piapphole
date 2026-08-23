import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { PiholeClient, hostnameOf, normaliseBaseUrl } from '@/api/client';

export interface PiholeServer {
  id: string;
  /** Friendly name shown in the UI. */
  name: string;
  /** Normalised origin, e.g. `http://192.168.1.10`. */
  baseUrl: string;
  /** Whether the server has 2FA enabled (we then prompt for a TOTP on login). */
  totpEnabled: boolean;
  /** Server needs no password at all (Pi-hole with authentication disabled). */
  passwordless: boolean;
  createdAt: number;
}

const INDEX_KEY = 'piapphole.servers.v1';
const ACTIVE_KEY = 'piapphole.activeServer.v1';
const secretKey = (id: string) => `piapphole_secret_${id}`;

interface ServersContextValue {
  servers: PiholeServer[];
  activeServer: PiholeServer | null;
  client: PiholeClient | null;
  ready: boolean;
  addServer: (input: {
    name: string;
    baseUrl: string;
    password?: string;
    totpEnabled?: boolean;
    passwordless?: boolean;
  }) => Promise<PiholeServer>;
  updateServer: (id: string, patch: Partial<Omit<PiholeServer, 'id'>> & { password?: string }) => Promise<void>;
  removeServer: (id: string) => Promise<void>;
  selectServer: (id: string) => void;
  getPassword: (id: string) => Promise<string | null>;
  /** Supplies a one-shot TOTP code for the next login on the active server. */
  provideTotp: (code: string) => void;
}

const ServersContext = createContext<ServersContextValue | null>(null);

async function readSecret(id: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(secretKey(id));
  } catch {
    return null;
  }
}

async function writeSecret(id: string, password: string | undefined) {
  try {
    if (password === undefined) return;
    if (password === '') await SecureStore.deleteItemAsync(secretKey(id));
    else await SecureStore.setItemAsync(secretKey(id), password);
  } catch {
    // Secure storage can be unavailable (e.g. web); the app still works, it
    // just re-asks for the password.
  }
}

export function ServersProvider({ children }: { children: React.ReactNode }) {
  const [servers, setServers] = useState<PiholeServer[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [client, setClient] = useState<PiholeClient | null>(null);
  const [ready, setReady] = useState(false);
  const clientRef = useRef<PiholeClient | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [rawIndex, rawActive] = await Promise.all([
        AsyncStorage.getItem(INDEX_KEY),
        AsyncStorage.getItem(ACTIVE_KEY),
      ]);
      if (cancelled) return;
      let list: PiholeServer[] = [];
      if (rawIndex) {
        try {
          list = JSON.parse(rawIndex) as PiholeServer[];
        } catch {
          list = [];
        }
      }
      setServers(list);
      setActiveId(rawActive && list.some((s) => s.id === rawActive) ? rawActive : (list[0]?.id ?? null));
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistServers = useCallback(async (next: PiholeServer[]) => {
    setServers(next);
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(next));
  }, []);

  const activeServer = useMemo(() => servers.find((s) => s.id === activeId) ?? null, [servers, activeId]);

  // Rebuild the API client whenever the active server (or its address) changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeServer) {
        clientRef.current = null;
        setClient(null);
        return;
      }
      const password = activeServer.passwordless ? undefined : ((await readSecret(activeServer.id)) ?? undefined);
      if (cancelled) return;
      const next = new PiholeClient({ baseUrl: activeServer.baseUrl, password });
      clientRef.current = next;
      setClient(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeServer]);

  const addServer = useCallback<ServersContextValue['addServer']>(
    async ({ name, baseUrl, password, totpEnabled = false, passwordless = false }) => {
      const server: PiholeServer = {
        id: `srv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        name: name.trim() || hostnameOf(baseUrl),
        baseUrl: normaliseBaseUrl(baseUrl),
        totpEnabled,
        passwordless,
        createdAt: Date.now(),
      };
      await writeSecret(server.id, password ?? '');
      await persistServers([...servers, server]);
      setActiveId(server.id);
      await AsyncStorage.setItem(ACTIVE_KEY, server.id);
      return server;
    },
    [persistServers, servers],
  );

  const updateServer = useCallback<ServersContextValue['updateServer']>(
    async (id, patch) => {
      const { password, ...rest } = patch;
      if (password !== undefined) await writeSecret(id, password);
      const next = servers.map((server) =>
        server.id === id
          ? { ...server, ...rest, baseUrl: rest.baseUrl ? normaliseBaseUrl(rest.baseUrl) : server.baseUrl }
          : server,
      );
      await persistServers(next);
      if (id === activeId && clientRef.current) {
        if (password !== undefined) clientRef.current.setPassword(password || undefined);
        clientRef.current.invalidateSession();
      }
    },
    [activeId, persistServers, servers],
  );

  const removeServer = useCallback<ServersContextValue['removeServer']>(
    async (id) => {
      try {
        await SecureStore.deleteItemAsync(secretKey(id));
      } catch {
        // Nothing to clean up.
      }
      const next = servers.filter((server) => server.id !== id);
      await persistServers(next);
      if (activeId === id) {
        const fallback = next[0]?.id ?? null;
        setActiveId(fallback);
        if (fallback) await AsyncStorage.setItem(ACTIVE_KEY, fallback);
        else await AsyncStorage.removeItem(ACTIVE_KEY);
      }
    },
    [activeId, persistServers, servers],
  );

  const selectServer = useCallback((id: string) => {
    setActiveId(id);
    void AsyncStorage.setItem(ACTIVE_KEY, id);
  }, []);

  const getPassword = useCallback((id: string) => readSecret(id), []);

  const provideTotp = useCallback((code: string) => {
    clientRef.current?.setTotp(code);
    clientRef.current?.invalidateSession();
  }, []);

  const value = useMemo<ServersContextValue>(
    () => ({
      servers,
      activeServer,
      client,
      ready,
      addServer,
      updateServer,
      removeServer,
      selectServer,
      getPassword,
      provideTotp,
    }),
    [servers, activeServer, client, ready, addServer, updateServer, removeServer, selectServer, getPassword, provideTotp],
  );

  return <ServersContext.Provider value={value}>{children}</ServersContext.Provider>;
}

export function useServers(): ServersContextValue {
  const ctx = useContext(ServersContext);
  if (!ctx) throw new Error('useServers must be used inside <ServersProvider>');
  return ctx;
}

/** Convenience hook for screens that cannot render without a connected server. */
export function usePiholeClient(): PiholeClient | null {
  return useServers().client;
}
