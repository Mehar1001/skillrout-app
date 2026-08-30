import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { darkShadows, lightShadows, radii, spacing } from '@/constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useColorScheme } from '@/hooks/useColorScheme';

export const Card: React.FC<ViewProps> = ({ children, style, ...props }) => {
  const colors = useColors();
  const scheme = useColorScheme() ?? 'light';
  const shadows = scheme === 'dark' ? darkShadows.card : lightShadows.card;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          ...shadows,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1,
  },
});
