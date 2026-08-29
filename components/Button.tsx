import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { fontSizes, radii, spacing } from '@/constants/designTokens';
import { useColors } from '@/hooks/useColors';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  compact?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  iconName,
  compact,
}) => {
  const colors = useColors();

  const palette = {
    primary: {
      bg: colors.primary,
      fg: colors.textOnPrimary,
      glow: colors.glowPrimary,
      pressedBg: colors.primaryHover,
      border: 'transparent',
    },
    secondary: {
      bg: 'transparent',
      fg: colors.primary,
      glow: colors.glowPrimary,
      pressedBg: colors.primarySubtle,
      border: colors.primary,
    },
    accent: {
      bg: colors.accent,
      fg: colors.textOnAccent,
      glow: colors.glowAccent,
      pressedBg: colors.accentHover,
      border: colors.border,
    },
    danger: {
      bg: colors.error,
      fg: colors.textOnPrimary,
      glow: colors.glowError,
      pressedBg: colors.error,
      border: 'transparent',
    },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        {
          backgroundColor: pressed ? palette.pressedBg : palette.bg,
          borderWidth: variant === 'secondary' ? 1.5 : 1,
          borderColor: palette.border,
          shadowColor: palette.glow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: disabled ? 0 : 0.12,
          shadowRadius: 4,
          elevation: disabled ? 0 : 2,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      {iconName ? <Ionicons name={iconName} size={compact ? 16 : 18} color={palette.fg} /> : null}
      <Text style={[styles.text, { color: palette.fg }]}>{loading ? 'Loading…' : title}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  compact: {
    minHeight: 40,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
  },
  text: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    lineHeight: fontSizes.body + 4,
  },
});
