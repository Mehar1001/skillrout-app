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
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
          elevation: 2,
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
