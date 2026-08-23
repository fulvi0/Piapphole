import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Appearance = 'system' | 'light' | 'dark';

export interface AppSettings {
  appearance: Appearance;
  /** Live-refresh interval for dashboard/query data, in seconds. 0 disables it. */
  refreshInterval: number;
  haptics: boolean;
  /** Show the full query log with client names rather than only counts. */
  compactQueries: boolean;
  /** Default number of rows fetched per query-log page. */
  queryPageSize: number;
  confirmDestructive: boolean;
}

const DEFAULTS: AppSettings = {
  appearance: 'system',
  refreshInterval: 10,
  haptics: true,
  compactQueries: false,
  queryPageSize: 100,
  confirmDestructive: true,
};

const STORAGE_KEY = 'piapphole.settings.v1';

interface SettingsContextValue {
  settings: AppSettings;
  ready: boolean;
  update: (patch: Partial<AppSettings>) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          try {
            setSettings({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<AppSettings>) });
          } catch {
            // Corrupt preferences are not worth surfacing — fall back to defaults.
          }
        }
      })
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: AppSettings) => {
    setSettings(next);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  // The functional update keeps `update` stable while always reading fresh state.
  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const reset = useCallback(() => persist(DEFAULTS), [persist]);

  const value = useMemo(() => ({ settings, ready, update, reset }), [settings, ready, update, reset]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useAppSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used inside <SettingsProvider>');
  return ctx;
}

export const settingsDefaults = DEFAULTS;
