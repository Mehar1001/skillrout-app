import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, fontSizes, radii, spacing } from '../constants/designTokens';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}) => {
  const isSecondary = variant === 'secondary';

  const bg = {
    primary: colors.primary,
    secondary: colors.surface,
    accent: colors.accent,
    danger: colors.error,
  }[variant];

  const fg = {
    primary: colors.textOnPrimary,
    secondary: colors.textPrimary,
    accent: colors.textOnAccent,
    danger: colors.textOnPrimary,
  }[variant];

  const border = isSecondary ? colors.border : variant === 'danger' ? colors.error : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderWidth: isSecondary || variant === 'danger' ? 1 : 0,
          borderColor: border,
          opacity: disabled ? 0.45 : pressed ? 0.92 : 1,
        },
      ]}
    >
      <Text style={[styles.text, { color: fg }]}>{loading ? 'Loading…' : title}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    minWidth: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
