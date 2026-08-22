import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { radii, spacing } from '@/constants/designTokens';
import { useColors } from '@/hooks/useColors';

export const Card: React.FC<ViewProps> = ({ children, style, ...props }) => {
  const colors = useColors();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.glowAccent,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 3,
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
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
  },
});
