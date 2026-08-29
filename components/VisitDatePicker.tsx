import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { type Colors, fontSizes, radii, spacing } from '../constants/designTokens';
import { useColors } from '@/hooks/useColors';

interface VisitDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

const DAYS_IN_WEEK = 7;
const WEEKS_TO_SHOW = 6;

export const VisitDatePicker = ({ value, onChange, error }: VisitDatePickerProps) => {
  const colors = useColors();
  const styles = makeStyles(colors);
  const [open, setOpen] = useState(false);

  const today = useMemo(() => dayjs().startOf('day'), []);
  const selectedDate = useMemo(() => dayjs(value).startOf('day'), [value]);

  const [monthStart, setMonthStart] = useState(() => {
    const base = dayjs(value).isValid() ? dayjs(value) : today;
    return base.startOf('month');
  });

  const earliestAllowed = useMemo(() => today.subtract(7, 'day'), [today]);

  const isSelectable = (date: dayjs.Dayjs) => {
    return (
      !date.isBefore(earliestAllowed, 'day') && !date.isAfter(today, 'day')
    );
  };

  const handleSelect = (date: dayjs.Dayjs) => {
    if (!isSelectable(date)) return;
    onChange(date.format('YYYY-MM-DD'));
    setOpen(false);
  };

  const handleToday = () => {
    onChange(today.format('YYYY-MM-DD'));
    setMonthStart(today.startOf('month'));
    setOpen(false);
  };

  const goToPreviousMonth = () => {
    setMonthStart((prev) => prev.subtract(1, 'month').startOf('month'));
  };

  const goToNextMonth = () => {
    setMonthStart((prev) => prev.add(1, 'month').startOf('month'));
  };

  const startOfMonth = monthStart.startOf('month');
  const daysInMonth = startOfMonth.daysInMonth();
  const startOffset = startOfMonth.day();

  const calendarDays: (dayjs.Dayjs | null)[] = [];
  for (let i = 0; i < WEEKS_TO_SHOW * DAYS_IN_WEEK; i += 1) {
    const dayNumber = i - startOffset + 1;
    if (dayNumber > 0 && dayNumber <= daysInMonth) {
      calendarDays.push(startOfMonth.date(dayNumber));
    } else {
      calendarDays.push(null);
    }
  }

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Business date</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Select business date"
        onPress={() => setOpen(true)}
        style={[styles.field, error ? styles.fieldError : null]}
      >
        <Text style={styles.fieldText}>
          {selectedDate.isValid() ? selectedDate.format('MMM D, YYYY') : today.format('MMM D, YYYY')}
        </Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <Text style={styles.helper}>Today or the previous seven days</Text>
      )}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <Text style={styles.modalTitle}>Select business date</Text>

            <View style={styles.header}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                onPress={goToPreviousMonth}
                style={styles.arrowButton}
              >
                <Text style={styles.arrowText}>‹</Text>
              </Pressable>

              <Text style={styles.monthLabel}>{monthStart.format('MMMM YYYY')}</Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next month"
                onPress={goToNextMonth}
                style={styles.arrowButton}
              >
                <Text style={styles.arrowText}>›</Text>
              </Pressable>
            </View>

            <View style={styles.dayLabels}>
              {dayLabels.map((label, index) => (
                <View key={index} style={styles.dayLabelCell}>
                  <Text style={styles.dayLabelText}>{label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.grid}>
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <View key={index} style={styles.cell} />;
                }

                const dateValue = date.format('YYYY-MM-DD');
                const selected = dateValue === value;
                const isToday = date.isSame(today, 'day');
                const selectable = isSelectable(date);

                return (
                  <Pressable
                    key={dateValue}
                    accessibilityRole="button"
                    accessibilityLabel={date.format('MMMM D, YYYY')}
                    accessibilityState={{ selected, disabled: !selectable }}
                    disabled={!selectable}
                    onPress={() => handleSelect(date)}
                    style={[
                      styles.cell,
                      selected && styles.cellSelected,
                      isToday && !selected && styles.cellToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.cellText,
                        !selectable && styles.cellTextDisabled,
                        selected && styles.cellTextSelected,
                      ]}
                    >
                      {date.date()}
                    </Text>
                    {isToday && !selected && <View style={styles.todayDot} />}
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Select today"
              onPress={handleToday}
              style={styles.todayButton}
            >
              <Text style={styles.todayButtonText}>Today</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    monthLabel: {
      color: colors.textPrimary,
      fontSize: fontSizes.h3,
      fontWeight: '700',
    },
    arrowButton: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.pill,
      backgroundColor: colors.surfaceSecondary,
    },
    arrowText: {
      color: colors.primary,
      fontSize: fontSizes.h2,
      fontWeight: '700',
    },
    dayLabels: {
      flexDirection: 'row',
      marginBottom: spacing.sm,
    },
    dayLabelCell: {
      width: `${100 / DAYS_IN_WEEK}%`,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xs,
    },
    dayLabelText: {
      color: colors.textMuted,
      fontSize: fontSizes.caption,
      fontWeight: '600',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: spacing.md,
    },
    cell: {
      width: `${100 / DAYS_IN_WEEK}%`,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      padding: spacing.xs,
    },
    cellSelected: {
      backgroundColor: colors.primary,
    },
    cellToday: {
      borderWidth: 1,
      borderColor: colors.primary,
    },
    cellText: {
      color: colors.textPrimary,
      fontSize: fontSizes.body,
      fontWeight: '600',
    },
    cellTextDisabled: {
      color: colors.textMuted,
    },
    cellTextSelected: {
      color: colors.textOnPrimary,
    },
    todayDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      marginTop: 2,
      backgroundColor: colors.primary,
    },
    todayButton: {
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
      backgroundColor: colors.primary,
    },
    todayButtonText: {
      color: colors.textOnPrimary,
      fontSize: fontSizes.body,
      fontWeight: '700',
    },
  });
