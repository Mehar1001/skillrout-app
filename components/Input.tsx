import React, { useState } from 'react';
import { Text, TextInput, View, StyleSheet, TextInputProps } from 'react-native';
import { fontSizes, radii, spacing } from '@/constants/designTokens';
import { useColors } from '@/hooks/useColors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, style, onFocus, onBlur, ...props }) => {
  const colors = useColors();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : focused ? colors.primary : colors.border,
            borderWidth: focused ? 2 : 1,
            color: colors.textPrimary,
            shadowColor: focused ? colors.primary : colors.glowAccent,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: focused ? 0.15 : 0.06,
            shadowRadius: focused ? 4 : 2,
            elevation: focused ? 3 : 1,
          },
          style as any,
        ]}
        placeholderTextColor={colors.textMuted}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
      {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSizes.caption,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  input: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.body,
    minHeight: 48,
  },
  errorText: {
    fontSize: fontSizes.caption,
    marginTop: spacing.xs,
  },
});
