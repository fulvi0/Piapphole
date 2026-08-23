import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Rendered in the top-right corner, typically a save action. */
  action?: React.ReactNode;
  scrollable?: boolean;
}

/** Bottom sheet presented as a modal card, matching iOS sheet styling. */
export function Sheet({ visible, onClose, title, subtitle, children, action, scrollable = true }: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const Body = scrollable ? ScrollView : View;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.groupedBackground,
                borderTopLeftRadius: theme.radii.xl,
                borderTopRightRadius: theme.radii.xl,
                paddingBottom: insets.bottom + theme.spacing.lg,
              },
              theme.shadow.floating,
            ]}
          >
            <View style={[styles.grabber, { backgroundColor: theme.colors.quaternaryLabel }]} />
            <View style={[styles.header, { paddingHorizontal: theme.spacing.lg }]}>
              <Pressable onPress={onClose} hitSlop={10} style={styles.headerSide}>
                <Icon name="close" size={16} color={theme.colors.secondaryLabel} />
              </Pressable>
              <View style={styles.headerCenter}>
                {title ? (
                  <Text variant="headline" numberOfLines={1}>
                    {title}
                  </Text>
                ) : null}
                {subtitle ? (
                  <Text variant="caption1" tone="secondary" numberOfLines={1}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              <View style={[styles.headerSide, styles.headerRight]}>{action}</View>
            </View>
            <Body
              style={styles.body}
              contentContainerStyle={
                scrollable ? { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg } : undefined
              }
              keyboardShouldPersistTaps="handled"
            >
              {scrollable ? children : <View style={{ paddingHorizontal: theme.spacing.lg }}>{children}</View>}
            </Body>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  keyboardWrap: { justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', paddingTop: 8 },
  grabber: { width: 36, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', paddingBottom: 12, minHeight: 32 },
  headerSide: { width: 64 },
  headerRight: { alignItems: 'flex-end' },
  headerCenter: { flex: 1, alignItems: 'center' },
  body: { flexGrow: 0 },
});
