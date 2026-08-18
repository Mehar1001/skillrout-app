import React from 'react';
import { Text, TextInput, View, StyleSheet, TextInputProps } from 'react-native';
import { colors, fontSizes, radii, spacing } from '../constants/designTokens';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, style, ...props }) => {
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          { borderColor: error ? colors.error : colors.border },
          style as any,
        ]}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    minHeight: 48,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSizes.caption,
    marginTop: spacing.xs,
  },
});
