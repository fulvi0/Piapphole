import React from 'react';
import { Pressable, StyleSheet, Switch, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface ListSectionProps {
  title?: string;
  footer?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

/** iOS "inset grouped" section: rounded card with hairline-separated rows. */
export function ListSection({ title, footer, children, style }: ListSectionProps) {
  const theme = useTheme();
  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <View style={[{ marginTop: theme.spacing.xl }, style]}>
      {title ? (
        <Text variant="footnote" tone="secondary" style={[styles.sectionTitle, { color: theme.colors.secondaryLabel }]}>
          {title.toUpperCase()}
        </Text>
      ) : null}
      <View
        style={[
          {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radii.md,
            overflow: 'hidden',
          },
          theme.dark ? null : theme.shadow.card,
        ]}
      >
        {items.map((child, index) => (
          <View key={index}>
            {index > 0 ? (
              <View style={[styles.separator, { backgroundColor: theme.colors.separator, marginLeft: 16 }]} />
            ) : null}
            {child}
          </View>
        ))}
      </View>
      {footer ? (
        <Text variant="caption1" tone="tertiary" style={styles.sectionFooter}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

export interface ListRowProps {
  title: string;
  subtitle?: string;
  detail?: string;
  icon?: IconName;
  iconColor?: string;
  iconBackground?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  accent?: boolean;
  disabled?: boolean;
  right?: React.ReactNode;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  numberOfLines?: number;
  monoTitle?: boolean;
}

export function ListRow({
  title,
  subtitle,
  detail,
  icon,
  iconColor,
  iconBackground,
  onPress,
  onLongPress,
  chevron,
  destructive,
  accent,
  disabled,
  right,
  switchValue,
  onSwitchChange,
  numberOfLines = 1,
  monoTitle,
}: ListRowProps) {
  const theme = useTheme();
  const interactive = Boolean(onPress || onLongPress) && !disabled;
  const showChevron = chevron ?? Boolean(onPress);

  const content = (
    <View style={[styles.row, { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md }]}>
      {icon ? (
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: iconBackground ?? theme.colors.tertiaryFill,
              borderRadius: theme.radii.xs + 2,
            },
          ]}
        >
          <Icon name={icon} size={17} color={iconColor ?? theme.colors.label} />
        </View>
      ) : null}

      <View style={styles.rowBody}>
        <Text
          variant="body"
          numberOfLines={numberOfLines}
          mono={monoTitle}
          tone={destructive ? 'danger' : accent ? 'accent' : 'primary'}
          style={disabled ? { opacity: 0.4 } : undefined}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text variant="footnote" tone="secondary" numberOfLines={2} style={{ marginTop: 1 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {detail ? (
        <Text variant="body" tone="secondary" numberOfLines={1} style={styles.detail}>
          {detail}
        </Text>
      ) : null}

      {onSwitchChange ? (
        <Switch
          value={switchValue}
          onValueChange={(value) => {
            haptics.select();
            onSwitchChange(value);
          }}
          trackColor={{ true: theme.colors.success, false: theme.colors.fill }}
          disabled={disabled}
        />
      ) : null}

      {right}

      {showChevron ? (
        <View style={{ marginLeft: theme.spacing.xs }}>
          <Icon name="chevron" size={14} color={theme.colors.tertiaryLabel} weight="bold" />
        </View>
      ) : null}
    </View>
  );

  if (!interactive) {
    return <View style={{ backgroundColor: theme.colors.card }}>{content}</View>;
  }

  return (
    <Pressable
      onPress={() => {
        haptics.light();
        onPress?.();
      }}
      onLongPress={onLongPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? theme.colors.cardPressed : theme.colors.card,
      })}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { marginBottom: 7, marginLeft: 16, letterSpacing: 0.6 },
  sectionFooter: { marginTop: 7, marginHorizontal: 16 },
  separator: { height: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  rowBody: { flex: 1, justifyContent: 'center' },
  iconWrap: { width: 29, height: 29, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  detail: { marginLeft: 8, maxWidth: '48%', textAlign: 'right' },
});
