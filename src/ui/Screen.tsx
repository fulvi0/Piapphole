import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

export interface ScreenProps extends ScrollViewProps {
  children: React.ReactNode;
  /** Pull-to-refresh handler; omit to disable the control. */
  onRefresh?: () => Promise<unknown> | void;
  refreshing?: boolean;
  /** Extra bottom padding so content clears the floating tab bar. */
  bottomInset?: number;
  padded?: boolean;
  style?: ViewStyle;
}

/** Scrolling container with the iOS grouped background and pull-to-refresh. */
export function Screen({
  children,
  onRefresh,
  refreshing = false,
  bottomInset = TAB_BAR_CLEARANCE,
  padded = true,
  style,
  contentContainerStyle,
  ...rest
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [internalRefreshing, setInternalRefreshing] = React.useState(false);

  const handleRefresh = React.useCallback(async () => {
    if (!onRefresh) return;
    setInternalRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setInternalRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <ScrollView
      {...rest}
      style={[{ backgroundColor: theme.colors.groupedBackground }, style]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        padded && { paddingHorizontal: theme.spacing.lg },
        { paddingBottom: bottomInset + insets.bottom },
        contentContainerStyle,
      ]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing || internalRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.secondaryLabel}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

/** Non-scrolling variant used by list screens that manage their own scrolling. */
export function ScreenSurface({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const theme = useTheme();
  return <View style={[styles.fill, { backgroundColor: theme.colors.groupedBackground }, style]}>{children}</View>;
}

/** Height of the floating tab bar above the safe-area inset. */
const TAB_BAR_CLEARANCE = 64;

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
