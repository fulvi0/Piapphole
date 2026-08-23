import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let enabled = true;

/** Wired up from the settings store so the whole app respects the preference. */
export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

function guard(run: () => Promise<void>) {
  if (!enabled || Platform.OS === 'web') return;
  void run().catch(() => undefined);
}

export const haptics = {
  select: () => guard(() => Haptics.selectionAsync()),
  light: () => guard(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => guard(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: () => guard(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: () => guard(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => guard(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => guard(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
