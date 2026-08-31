import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fontSizes, spacing } from '@/constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { getPasswordChecks } from '../helpers/passwordValidation';

interface PasswordRequirementsProps {
  password: string;
}

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({ password }) => {
  const colors = useColors();
  const styles = makeStyles(colors);
  const checks = getPasswordChecks(password);

  return (
    <View style={styles.container}>
      {checks.map(({ label, met }) => (
        <View key={label} style={styles.row}>
          <Ionicons
            name={met ? 'checkmark-circle' : 'close-circle'}
            size={16}
            color={met ? colors.success : colors.error}
            style={styles.icon}
          />
          <Text style={[styles.text, { color: met ? colors.textSecondary : colors.error }]}>{label}</Text>
        </View>
      ))}
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    icon: {
      marginRight: spacing.xs,
    },
    text: {
      fontSize: fontSizes.caption,
    },
  });
