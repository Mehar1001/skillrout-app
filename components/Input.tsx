import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, Text, TextInput, View, StyleSheet, TextInputProps } from 'react-native';
import { fontSizes, radii, spacing } from '@/constants/designTokens';
import { useColors } from '@/hooks/useColors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  prefix?: string;
  suffix?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, style, onFocus, onBlur, prefix, suffix, ...props }) => {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = Boolean(props.secureTextEntry);
  const a11yLabel = props.accessibilityLabel ?? label;

  const textStyle = [
    styles.input,
    {
      backgroundColor: colors.surface,
      borderColor: error ? colors.error : focused ? colors.primary : colors.border,
      borderWidth: focused ? 2 : 1,
      color: colors.textPrimary,
      shadowColor: focused ? colors.primary : colors.glowAccent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: focused ? 0.15 : 0.06,
      shadowRadius: focused ? 4 : 2,
      elevation: focused ? 3 : 1,
      paddingRight: isPassword ? 44 : spacing.md,
    },
    style as any,
  ];

  const sharedTextInputProps = {
    accessibilityLabel: a11yLabel,
    placeholderTextColor: colors.textMuted,
    onFocus: (e: any) => {
      setFocused(true);
      onFocus?.(e);
    },
    onBlur: (e: any) => {
      setFocused(false);
      onBlur?.(e);
    },
    ...props,
    secureTextEntry: isPassword ? !showPassword : props.secureTextEntry,
  };

  const inner = prefix || suffix ? (
    <View style={[textStyle as any, styles.inputRow, { paddingHorizontal: 0, paddingVertical: 0 }]}>
      {prefix ? (
        <Text style={[styles.affix, { color: colors.textMuted, paddingLeft: spacing.md }]}>{prefix}</Text>
      ) : null}
      <TextInput
        style={[
          styles.input,
          {
            flex: 1,
            backgroundColor: 'transparent',
            borderWidth: 0,
            shadowOpacity: 0,
            elevation: 0,
            color: colors.textPrimary,
          },
          style as any,
        ]}
        {...sharedTextInputProps}
      />
      {suffix ? (
        <Text style={[styles.affix, { color: colors.textMuted, paddingRight: spacing.md }]}>{suffix}</Text>
      ) : null}
    </View>
  ) : (
    <TextInput style={textStyle} {...sharedTextInputProps} />
  );

  return (
    <View style={styles.wrapper}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <View style={styles.inputOuter}>
        {inner}
        {isPassword ? (
          <Pressable
            onPress={() => setShowPassword(v => !v)}
            style={styles.eye}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  inputOuter: {
    position: 'relative',
    justifyContent: 'center',
  },
  eye: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: fontSizes.caption,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  input: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.body,
    minHeight: 48,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  affix: {
    fontSize: fontSizes.body,
    fontWeight: '600',
  },
  errorText: {
    fontSize: fontSizes.caption,
    marginTop: spacing.xs,
  },
});
