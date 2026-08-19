import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, radii, spacing } from '../constants/designTokens';

interface VisitDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

export const VisitDatePicker = ({ value, onChange, error }: VisitDatePickerProps) => {
  const [open, setOpen] = useState(false);
  const options = useMemo(
    () => Array.from({ length: 8 }, (_, index) => dayjs().subtract(index, 'day')),
    []
  );

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Business date</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Select business date"
        onPress={() => setOpen(true)}
        style={[styles.field, error ? styles.fieldError : null]}
      >
        <Text style={styles.fieldText}>{dayjs(value).format('MMM D, YYYY')}</Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : <Text style={styles.helper}>Today or the previous seven days</Text>}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <Text style={styles.modalTitle}>Select business date</Text>
            {options.map((date, index) => {
              const dateValue = date.format('YYYY-MM-DD');
              const selected = value === dateValue;
              return (
                <Pressable
                  key={dateValue}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onChange(dateValue);
                    setOpen(false);
                  }}
                  style={[styles.option, selected ? styles.optionSelected : null]}
                >
                  <Text style={[styles.optionText, selected ? styles.optionTextSelected : null]}>
                    {index === 0 ? 'Today' : index === 1 ? 'Yesterday' : date.format('dddd')}
                  </Text>
                  <Text style={[styles.optionDate, selected ? styles.optionTextSelected : null]}>
                    {date.format('MMM D, YYYY')}
                  </Text>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  label: {
    marginBottom: spacing.xs,
    color: colors.textSecondary,
    fontSize: fontSizes.caption,
    fontWeight: '600',
  },
  field: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  fieldError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  fieldText: {
    color: colors.textPrimary,
    fontSize: fontSizes.body,
    fontWeight: '600',
  },
  chevron: {
    color: colors.primary,
    fontSize: fontSizes.h2,
  },
  helper: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: fontSizes.caption,
  },
  error: {
    marginTop: spacing.xs,
    color: colors.error,
    fontSize: fontSizes.caption,
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(42, 42, 42, 0.42)',
  },
  modal: {
    width: '100%',
    maxWidth: 420,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    marginBottom: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSizes.h2,
    fontWeight: '700',
  },
  option: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
  optionSelected: {
    backgroundColor: colors.primary,
  },
  optionText: {
    color: colors.textPrimary,
    fontSize: fontSizes.body,
    fontWeight: '600',
  },
  optionDate: {
    color: colors.textSecondary,
    fontSize: fontSizes.caption,
  },
  optionTextSelected: {
    color: colors.textOnPrimary,
  },
});
