import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { fontSizes, radii, spacing } from '@/constants/designTokens';
import { useColors } from '@/hooks/useColors';

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'muted';

interface BadgeProps {
  title: string;
  variant?: BadgeVariant;
}

export const Badge: React.FC<BadgeProps> = ({ title, variant = 'muted' }) => {
  const colors = useColors();

  const palette: Record<BadgeVariant, { bg: string; fg: string }> = {
    success: { bg: colors.glowSuccess, fg: colors.success },
    error: { bg: colors.glowError, fg: colors.error },
    warning: { bg: colors.glowAccent, fg: colors.warning },
    info: { bg: colors.glowPrimary, fg: colors.primary },
    muted: { bg: colors.glowAccent, fg: colors.textMuted },
  };

  const { bg, fg } = palette[variant];

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    minHeight: 24,
    justifyContent: 'center',
  },
  text: {
    fontSize: fontSizes.caption,
    fontWeight: '700',
    lineHeight: fontSizes.caption + 4,
  },
});
