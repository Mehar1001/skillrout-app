import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { fontSizes, radii, spacing } from '@/constants/designTokens';
import { formatCurrencyInput, parseCurrencyInput } from '@/helpers/formatters';
import { useColors } from '@/hooks/useColors';

interface CurrencyInputProps {
  label: string;
  value: number | null;
  onChangeValue: (value: number | null) => void;
  error?: string | null;
  helperText?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const CurrencyInput = ({
  label,
  value,
  onChangeValue,
  error,
  helperText,
  placeholder = '0.00',
  disabled = false,
}: CurrencyInputProps) => {
  const colors = useColors();
  const [text, setText] = useState(formatCurrencyInput(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(formatCurrencyInput(value));
  }, [value, focused]);

  const handleChange = (next: string) => {
    const normalized = next.replace(/[$,\s]/g, '');
    if (normalized !== '' && !/^\d*(\.\d{0,2})?$/.test(normalized)) return;
    setText(normalized);
    onChangeValue(parseCurrencyInput(normalized));
  };

  const handleFocus = () => {
    setFocused(true);
    setText(value === null ? '' : value.toFixed(2));
  };

  const handleBlur = () => {
    setFocused(false);
    setText(formatCurrencyInput(value));
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View
        style={[
          styles.field,
          {
            borderColor: error ? colors.error : colors.border,
            backgroundColor: disabled ? colors.surfaceSecondary : colors.surface,
          },
        ]}
      >
        <Text style={[styles.currency, { color: colors.textPrimary }]}>$</Text>
        <TextInput
          value={text}
          onChangeText={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          editable={!disabled}
          style={[styles.input, { color: colors.textPrimary }]}
          accessibilityLabel={label}
          accessibilityHint={helperText}
        />
      </View>
      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : helperText ? (
        <Text style={[styles.helper, { color: colors.textMuted }]}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    marginBottom: spacing.xs,
    fontSize: fontSizes.caption,
    fontWeight: '600',
  },
  field: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.md,
  },
  currency: {
    paddingLeft: spacing.md,
    fontSize: fontSizes.body,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: spacing.xs,
    paddingRight: spacing.md,
    fontSize: fontSizes.body,
    outlineStyle: 'none',
  } as any,
  error: {
    marginTop: spacing.xs,
    fontSize: fontSizes.caption,
    lineHeight: 16,
  },
  helper: {
    marginTop: spacing.xs,
    fontSize: fontSizes.caption,
  },
});
