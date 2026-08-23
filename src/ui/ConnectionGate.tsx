import { useRouter } from 'expo-router';
import React from 'react';

import { useServers } from '@/store/servers';
import { EmptyState } from './State';

/** Renders a call-to-action instead of children when no Pi-hole is configured. */
export function ConnectionGate({ children }: { children: React.ReactNode }) {
  const { servers, ready } = useServers();
  const router = useRouter();

  if (!ready) return null;
  if (servers.length === 0) {
    return (
      <EmptyState
        icon="server"
        title="No Pi-hole connected"
        message="Add your Pi-hole server to see live metrics and manage blocking from here."
        actionTitle="Add a Pi-hole"
        onAction={() => router.push('/connect')}
      />
    );
  }
  return <>{children}</>;
}
