import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { fontSizes, letterSpacings, radii, spacing } from '@/constants/designTokens';
import { useColors } from '@/hooks/useColors';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  iconName,
}) => {
  const colors = useColors();

  const isSecondary = variant === 'secondary';

  const palette = {
    primary: { bg: colors.primary, fg: colors.textOnPrimary, glow: colors.glowPrimary },
    secondary: { bg: 'transparent', fg: colors.primary, glow: colors.glowPrimary },
    accent: { bg: colors.accent, fg: colors.textOnAccent, glow: colors.glowAccent },
    danger: { bg: colors.error, fg: colors.textOnPrimary, glow: colors.glowError },
  }[variant];

  const borderColor = isSecondary ? colors.primary : variant === 'danger' ? colors.error : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        iconName ? styles.buttonWithIcon : null,
        {
          backgroundColor: palette.bg,
          borderWidth: isSecondary || variant === 'danger' ? 1.5 : 0,
          borderColor,
          shadowColor: palette.glow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: disabled ? 0 : 0.25,
          shadowRadius: 6,
          elevation: disabled ? 0 : 3,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      {iconName ? <Ionicons name={iconName} size={18} color={palette.fg} /> : null}
      <Text style={[styles.text, { color: palette.fg }]}>{loading ? 'Loading…' : title}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    minWidth: 120,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  buttonWithIcon: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  text: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    letterSpacing: letterSpacings.wide,
    textTransform: 'uppercase',
  },
});
