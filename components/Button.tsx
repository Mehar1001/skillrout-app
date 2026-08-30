import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { darkShadows, fontSizes, lightShadows, radii, spacing } from '@/constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useColorScheme } from '@/hooks/useColorScheme';

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
  const scheme = useColorScheme() ?? 'light';
  const buttonShadows = scheme === 'dark' ? darkShadows.button : lightShadows.button;

  const palette = {
    primary: {
      bg: colors.primary,
      fg: colors.textOnPrimary,
      pressedBg: colors.primaryHover,
      border: 'transparent',
    },
    secondary: {
      bg: 'transparent',
      fg: colors.primary,
      pressedBg: colors.primarySubtle,
      border: colors.primary,
    },
    accent: {
      bg: colors.accent,
      fg: colors.textOnAccent,
      pressedBg: colors.accentHover,
      border: colors.border,
    },
    danger: {
      bg: colors.error,
      fg: colors.textOnPrimary,
      pressedBg: colors.error,
      border: 'transparent',
    },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        {
          backgroundColor: pressed ? palette.pressedBg : palette.bg,
          borderColor: palette.border,
          ...buttonShadows,
          shadowColor: disabled ? 'transparent' : buttonShadows.shadowColor,
          elevation: disabled ? 0 : buttonShadows.elevation,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      {iconName ? <Ionicons name={iconName} size={compact ? 18 : 20} color={palette.fg} /> : null}
      <Text style={[styles.text, { color: palette.fg }]}>{loading ? 'Loading…' : title}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  compact: {
    minHeight: 44,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  text: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    lineHeight: fontSizes.body + 4,
  },
});
