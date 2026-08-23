import React from 'react';
import { StyleSheet, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface FieldProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string | null;
  icon?: IconName;
  right?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export function Field({ label, hint, error, icon, right, containerStyle, style, ...rest }: FieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = React.useState(false);

  return (
    <View style={containerStyle}>
      {label ? (
        <Text variant="footnote" tone="secondary" style={{ marginBottom: 6, marginLeft: 2 }}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.wrap,
          {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radii.md,
            borderColor: error ? theme.colors.danger : focused ? theme.colors.accent : theme.colors.separator,
            paddingHorizontal: theme.spacing.md,
          },
        ]}
      >
        {icon ? (
          <View style={{ marginRight: 8 }}>
            <Icon name={icon} size={17} color={theme.colors.tertiaryLabel} />
          </View>
        ) : null}
        <TextInput
          {...rest}
          onFocus={(event) => {
            setFocused(true);
            rest.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            rest.onBlur?.(event);
          }}
          placeholderTextColor={theme.colors.tertiaryLabel}
          style={[
            theme.type.body,
            { color: theme.colors.label, flex: 1, paddingVertical: 12 },
            style,
          ]}
        />
        {right}
      </View>
      {error ? (
        <Text variant="caption1" tone="danger" style={{ marginTop: 5, marginLeft: 2 }}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption1" tone="tertiary" style={{ marginTop: 5, marginLeft: 2 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
});
