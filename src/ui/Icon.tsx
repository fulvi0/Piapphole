import { Ionicons } from '@expo/vector-icons';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import React from 'react';
import { Platform, View } from 'react-native';

import { useTheme } from '@/theme';

/**
 * Semantic icon names used across the app. Each maps to an SF Symbol on iOS and
 * to the closest Ionicon elsewhere, so the app keeps its native feel on iOS
 * without breaking on Android or web.
 */
export const iconMap = {
  dashboard: ['chart.pie.fill', 'stats-chart'],
  queries: ['list.bullet.rectangle', 'list'],
  manage: ['slider.horizontal.3', 'options'],
  system: ['cpu', 'hardware-chip-outline'],
  settings: ['gearshape.fill', 'settings-outline'],
  shield: ['shield.lefthalf.filled', 'shield-half'],
  shieldOff: ['shield.slash.fill', 'shield-outline'],
  pause: ['pause.circle.fill', 'pause-circle'],
  play: ['play.circle.fill', 'play-circle'],
  clock: ['clock', 'time-outline'],
  chevron: ['chevron.right', 'chevron-forward'],
  chevronDown: ['chevron.down', 'chevron-down'],
  close: ['xmark', 'close'],
  check: ['checkmark', 'checkmark'],
  plus: ['plus', 'add'],
  trash: ['trash', 'trash-outline'],
  search: ['magnifyingglass', 'search'],
  filter: ['line.3.horizontal.decrease.circle', 'filter'],
  globe: ['globe', 'globe-outline'],
  server: ['externaldrive.connected.to.line.below', 'server-outline'],
  network: ['network', 'git-network-outline'],
  device: ['desktopcomputer', 'desktop-outline'],
  wifi: ['wifi', 'wifi'],
  domain: ['text.badge.checkmark', 'document-text-outline'],
  block: ['hand.raised.fill', 'hand-left'],
  allow: ['checkmark.seal.fill', 'checkmark-circle'],
  group: ['person.2.fill', 'people'],
  client: ['iphone', 'phone-portrait-outline'],
  list: ['square.stack.3d.up', 'layers-outline'],
  refresh: ['arrow.clockwise', 'refresh'],
  restart: ['arrow.triangle.2.circlepath', 'reload'],
  bolt: ['bolt.fill', 'flash'],
  warning: ['exclamationmark.triangle.fill', 'warning'],
  info: ['info.circle', 'information-circle-outline'],
  temperature: ['thermometer.medium', 'thermometer-outline'],
  memory: ['memorychip', 'albums-outline'],
  database: ['cylinder.split.1x2', 'server-outline'],
  logs: ['doc.plaintext', 'document-outline'],
  dhcp: ['point.3.connected.trianglepath.dotted', 'git-merge-outline'],
  copy: ['doc.on.doc', 'copy-outline'],
  share: ['square.and.arrow.up', 'share-outline'],
  lock: ['lock.fill', 'lock-closed'],
  key: ['key.fill', 'key-outline'],
  logout: ['rectangle.portrait.and.arrow.right', 'log-out-outline'],
  moon: ['moon.fill', 'moon'],
  sun: ['sun.max.fill', 'sunny'],
  sparkles: ['sparkles', 'sparkles'],
  heart: ['heart.fill', 'heart'],
  github: ['chevron.left.forwardslash.chevron.right', 'code-slash'],
  cache: ['tray.full', 'file-tray-full-outline'],
  upstream: ['arrow.up.arrow.down', 'swap-vertical'],
  clientList: ['person.crop.circle', 'person-circle-outline'],
  drop: ['drop.fill', 'water'],
  gravity: ['arrow.down.circle.fill', 'cloud-download'],
  eye: ['eye', 'eye-outline'],
  eyeOff: ['eye.slash', 'eye-off-outline'],
  sortDesc: ['arrow.down', 'arrow-down'],
  power: ['power', 'power'],
} as const;

export type IconName = keyof typeof iconMap;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  weight?: SymbolViewProps['weight'];
}

export function Icon({ name, size = 20, color, weight = 'semibold' }: IconProps) {
  const theme = useTheme();
  const tint = color ?? theme.colors.label;
  const [symbol, ionicon] = iconMap[name];

  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={symbol as SymbolViewProps['name']}
        size={size}
        tintColor={tint}
        weight={weight}
        resizeMode="scaleAspectFit"
        fallback={<Ionicons name={ionicon as never} size={size} color={tint} />}
      />
    );
  }
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={ionicon as never} size={size} color={tint} />
    </View>
  );
}
