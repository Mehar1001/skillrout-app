import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { calculateLiveReadings } from '../helpers/calculations';
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '../helpers/formatters';
import { validatePresentReading } from '../helpers/validators';
import { Machine, MachineReadingDraft } from '../types';
import { type Colors, fontSizes, radii, spacing } from '../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { Card } from './Card';

interface MachineReadingTableProps {
  machines: Machine[];
  readings: Record<string, MachineReadingDraft>;
  onChange: (machineId: string, reading: MachineReadingDraft) => void;
  onTakePhoto: (machine: Machine) => void;
  onUploadPhoto: (machine: Machine) => void;
  onReadPhoto: (machine: Machine) => void;
  onRemovePhoto: (machine: Machine) => void;
  readingPhotoMachineId?: string | null;
  showRequiredErrors?: boolean;
}

export const MachineReadingTable = ({
  machines,
  readings,
  onChange,
  onTakePhoto,
  onUploadPhoto,
  onReadPhoto,
  onRemovePhoto,
  readingPhotoMachineId = null,
  showRequiredErrors = false,
}: MachineReadingTableProps) => {
  const colors = useColors();
  const styles = makeStyles(colors);
  const [expandedMachineId, setExpandedMachineId] = useState<string | null>(null);
  const totals = calculateLiveReadings(machines, readings);

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.machineCol]}>MACHINE</Text>
        <Text style={[styles.headerCell, styles.valueCol]}>LAST IN</Text>
        <Text style={[styles.headerCell, styles.valueCol]}>LAST PAID</Text>
        <Text style={[styles.headerCell, styles.inputCol]}>CREDITS IN</Text>
        <Text style={[styles.headerCell, styles.inputCol]}>TOTAL PAID</Text>
        <View style={styles.photoCol} />
      </View>

      {machines.map(machine => {
        const reading = readings[machine.id] || { presentIn: null, presentOut: null };
        const inError = reading.presentIn === null && !showRequiredErrors
          ? null
          : validatePresentReading(reading.presentIn, machine.lastSettledIn, 'Credits In');
        const outError = reading.presentOut === null && !showRequiredErrors
          ? null
          : validatePresentReading(reading.presentOut, machine.lastSettledOut, 'Total Paid');
        const expanded = expandedMachineId === machine.id;
        const hasPhoto = Boolean(reading.photoUri);
        const rowError = inError || outError;

        return (
          <View key={machine.id} style={styles.rowGroup}>
            <View style={[styles.row, rowError ? styles.rowError : null]}>
              <View style={styles.machineCol}>
                <Text style={styles.machineNumber}>{machine.machineNumber}</Text>
                {machine.name ? (
                  <Text style={styles.machineName} numberOfLines={1}>{machine.name}</Text>
                ) : null}
              </View>
              <Text style={[styles.valueText, styles.valueCol]}>{formatCurrency(machine.lastSettledIn)}</Text>
              <Text style={[styles.valueText, styles.valueCol]}>{formatCurrency(machine.lastSettledOut)}</Text>
              <View style={styles.inputCol}>
                <CompactCurrencyInput
                  value={reading.presentIn}
                  onChangeValue={presentIn => onChange(machine.id, { ...reading, presentIn })}
                  error={Boolean(inError)}
                  accessibilityLabel={`Machine ${machine.machineNumber} Credits In`}
                />
              </View>
              <View style={styles.inputCol}>
                <CompactCurrencyInput
                  value={reading.presentOut}
                  onChangeValue={presentOut => onChange(machine.id, { ...reading, presentOut })}
                  error={Boolean(outError)}
                  accessibilityLabel={`Machine ${machine.machineNumber} Total Paid`}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Photo options for machine ${machine.machineNumber}`}
                onPress={() => setExpandedMachineId(expanded ? null : machine.id)}
                style={[styles.photoCol, styles.photoButton, hasPhoto ? styles.photoAttached : null]}
              >
                {hasPhoto && reading.photoUri ? (
                  <Image source={{ uri: reading.photoUri }} style={styles.photoThumb} />
                ) : (
                  <Ionicons name="camera-outline" color={colors.textSecondary} size={20} />
                )}
              </Pressable>
            </View>

            {rowError ? <Text style={styles.errorText}>{rowError}</Text> : null}

            {reading.ocr ? (
              <View style={styles.ocrRow}>
                <Ionicons
                  name="scan-outline"
                  color={reading.ocr.status === 'warning' ? colors.warning : colors.success}
                  size={14}
                />
                <Text style={styles.ocrText}>
                  {reading.ocr.status === 'reviewed'
                    ? 'OCR applied — reviewed'
                    : reading.ocr.status === 'warning'
                      ? 'OCR warning — verify values'
                      : 'OCR suggested — review required'}
                </Text>
              </View>
            ) : null}

            {expanded ? (
              <View style={styles.actionsRow}>
                <ActionButton icon="camera-outline" label="Camera" onPress={() => { onTakePhoto(machine); setExpandedMachineId(null); }} />
                <ActionButton icon="cloud-upload-outline" label="Upload" onPress={() => { onUploadPhoto(machine); setExpandedMachineId(null); }} />
                {hasPhoto ? (
                  <>
                    <ActionButton
                      icon="scan-outline"
                      label={readingPhotoMachineId === machine.id ? 'Reading…' : 'Read values'}
                      disabled={readingPhotoMachineId === machine.id}
                      onPress={() => { onReadPhoto(machine); setExpandedMachineId(null); }}
                    />
                    <ActionButton icon="trash-outline" label="Remove" destructive onPress={() => { onRemovePhoto(machine); setExpandedMachineId(null); }} />
                  </>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}

      <View style={styles.totalsRow}>
        <TotalCell label="IN" value={formatCurrency(totals.presentIn)} />
        <TotalCell label="OUT" value={formatCurrency(totals.presentOut)} />
        <TotalCell label="NET" value={formatCurrency(totals.activityNet)} emphasis />
      </View>
    </Card>
  );
};

const CompactCurrencyInput = ({
  value,
  onChangeValue,
  error,
  accessibilityLabel,
}: {
  value: number | null;
  onChangeValue: (value: number | null) => void;
  error: boolean;
  accessibilityLabel: string;
}) => {
  const colors = useColors();
  const styles = makeStyles(colors);
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

  return (
    <TextInput
      value={text}
      onChangeText={handleChange}
      onFocus={() => { setFocused(true); setText(value === null ? '' : value.toFixed(2)); }}
      onBlur={() => { setFocused(false); setText(formatCurrencyInput(value)); }}
      placeholder="0.00"
      placeholderTextColor={colors.textMuted}
      keyboardType="decimal-pad"
      accessibilityLabel={accessibilityLabel}
      style={[styles.compactInput, { borderColor: error ? colors.error : colors.border }]}
    />
  );
};

const ActionButton = ({
  icon,
  label,
  onPress,
  disabled = false,
  destructive = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) => {
  const colors = useColors();
  const styles = makeStyles(colors);
  const tint = destructive ? colors.error : colors.textPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[styles.actionButton, disabled ? styles.actionDisabled : null]}
    >
      <Ionicons name={icon} color={tint} size={18} />
      <Text style={[styles.actionText, { color: tint }]}>{label}</Text>
    </Pressable>
  );
};

const TotalCell = ({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) => {
  const colors = useColors();
  const styles = makeStyles(colors);
  return (
    <View style={[styles.totalCell, emphasis ? styles.totalEmphasis : null]}>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={[styles.totalValue, emphasis ? styles.totalValueEmphasis : null]}>{value}</Text>
    </View>
  );
};

const makeStyles = (colors: Colors) => StyleSheet.create({
  card: {
    paddingHorizontal: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCell: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  rowGroup: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 52,
  },
  rowError: {
    backgroundColor: colors.glowError,
    borderRadius: radii.sm,
  },
  machineCol: {
    flex: 0.9,
    minWidth: 44,
  },
  valueCol: {
    flex: 0.9,
    textAlign: 'right',
  },
  inputCol: {
    flex: 1.2,
  },
  photoCol: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  machineNumber: {
    color: colors.textPrimary,
    fontSize: fontSizes.body,
    fontWeight: '700',
  },
  machineName: {
    color: colors.textMuted,
    fontSize: 10,
  },
  valueText: {
    color: colors.textSecondary,
    fontSize: fontSizes.caption,
  },
  compactInput: {
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.sm,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    fontSize: fontSizes.caption,
    textAlign: 'right',
    outlineStyle: 'none',
  } as any,
  photoButton: {
    minHeight: 44,
    borderRadius: radii.sm,
  },
  photoAttached: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  photoThumb: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
  },
  errorText: {
    marginTop: spacing.xs,
    color: colors.error,
    fontSize: fontSizes.caption,
  },
  ocrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  ocrText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  actionButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSecondary,
  },
  actionDisabled: {
    opacity: 0.55,
  },
  actionText: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
  },
  totalsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  totalCell: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSecondary,
  },
  totalEmphasis: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  totalLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  totalValue: {
    marginTop: 2,
    color: colors.textPrimary,
    fontSize: fontSizes.body,
    fontWeight: '700',
  },
  totalValueEmphasis: {
    color: colors.primary,
  },
});
