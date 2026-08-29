import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { calculateLiveReadings, calculateMachine } from '../helpers/calculations';
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

  const netColor = (value: number) =>
    value > 0 ? colors.success : value < 0 ? colors.error : colors.textMuted;

  return (
    <Card style={styles.card}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.headerCell, styles.machineCol]}>MACHINE</Text>
            <Text style={[styles.headerCell, styles.baselineCol, styles.headerRight]}>LAST IN</Text>
            <Text style={[styles.headerCell, styles.baselineCol, styles.headerRight]}>LAST PAID</Text>
            <Text style={[styles.headerCell, styles.inputCol, styles.headerRight]}>CREDITS IN</Text>
            <Text style={[styles.headerCell, styles.inputCol, styles.headerRight]}>TOTAL PAID</Text>
            <Text style={[styles.headerCell, styles.computedCol, styles.headerRight]}>TOTAL IN</Text>
            <Text style={[styles.headerCell, styles.computedCol, styles.headerRight]}>TOTAL OUT</Text>
            <Text style={[styles.headerCell, styles.computedCol, styles.headerRight]}>NET</Text>
            <Text style={[styles.headerCell, styles.photoCol, styles.headerCenter]}>📷</Text>
          </View>

          {machines.map(machine => {
            const reading = readings[machine.id] || { presentIn: null, presentOut: null };
            const inError =
              reading.presentIn === null && !showRequiredErrors
                ? null
                : validatePresentReading(reading.presentIn, machine.lastSettledIn, 'Credits In');
            const outError =
              reading.presentOut === null && !showRequiredErrors
                ? null
                : validatePresentReading(reading.presentOut, machine.lastSettledOut, 'Total Paid');
            const expanded = expandedMachineId === machine.id;
            const hasPhoto = Boolean(reading.photoUri);
            const rowError = inError || outError;

            let computed: { newIn: number; newOut: number; machineNet: number } | null = null;
            if (reading.presentIn !== null && reading.presentOut !== null) {
              computed = calculateMachine(
                machine.lastSettledIn,
                machine.lastSettledOut,
                reading.presentIn,
                reading.presentOut
              );
            }

            return (
              <View key={machine.id} style={styles.rowGroup}>
                <View style={[styles.row, rowError ? styles.rowError : null]}>
                  <View style={styles.machineCol}>
                    <Text style={styles.machineNumber}>{machine.machineNumber}</Text>
                    {machine.name ? (
                      <Text style={styles.machineName} numberOfLines={1}>
                        {machine.name}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.baselineCol}>
                    <View style={styles.readOnlyBox}>
                      <Text style={styles.readOnlyText} numberOfLines={1}>
                        {formatCurrency(machine.lastSettledIn)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.baselineCol}>
                    <View style={styles.readOnlyBox}>
                      <Text style={styles.readOnlyText} numberOfLines={1}>
                        {formatCurrency(machine.lastSettledOut)}
                      </Text>
                    </View>
                  </View>

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

                  <View style={styles.computedCol}>
                    <View style={styles.readOnlyBox}>
                      <Text style={styles.readOnlyText} numberOfLines={1}>
                        {computed ? formatCurrency(computed.newIn) : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.computedCol}>
                    <View style={styles.readOnlyBox}>
                      <Text style={styles.readOnlyText} numberOfLines={1}>
                        {computed ? formatCurrency(computed.newOut) : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.computedCol}>
                    <View style={styles.readOnlyBox}>
                      <Text
                        style={[
                          styles.readOnlyText,
                          { color: computed ? netColor(computed.machineNet) : colors.textMuted },
                        ]}
                        numberOfLines={1}
                      >
                        {computed ? formatCurrency(computed.machineNet) : ''}
                      </Text>
                    </View>
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
                    <ActionButton
                      icon="camera-outline"
                      label="Camera"
                      onPress={() => {
                        onTakePhoto(machine);
                        setExpandedMachineId(null);
                      }}
                    />
                    <ActionButton
                      icon="cloud-upload-outline"
                      label="Upload"
                      onPress={() => {
                        onUploadPhoto(machine);
                        setExpandedMachineId(null);
                      }}
                    />
                    {hasPhoto ? (
                      <>
                        <ActionButton
                          icon="scan-outline"
                          label={readingPhotoMachineId === machine.id ? 'Reading…' : 'Read values'}
                          disabled={readingPhotoMachineId === machine.id}
                          onPress={() => {
                            onReadPhoto(machine);
                            setExpandedMachineId(null);
                          }}
                        />
                        <ActionButton
                          icon="trash-outline"
                          label="Remove"
                          destructive
                          onPress={() => {
                            onRemovePhoto(machine);
                            setExpandedMachineId(null);
                          }}
                        />
                      </>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}

          <View style={[styles.row, styles.totalRow]}>
            <View style={styles.machineCol}>
              <Text style={styles.totalLabel}>TOTAL</Text>
            </View>
            <View style={styles.baselineCol} />
            <View style={styles.baselineCol} />
            <View style={styles.inputCol} />
            <View style={styles.inputCol} />
            <View style={styles.computedCol}>
              <View style={styles.readOnlyBox}>
                <Text style={[styles.readOnlyText, styles.totalValue]} numberOfLines={1}>
                  {formatCurrency(totals.newIn)}
                </Text>
              </View>
            </View>
            <View style={styles.computedCol}>
              <View style={styles.readOnlyBox}>
                <Text style={[styles.readOnlyText, styles.totalValue]} numberOfLines={1}>
                  {formatCurrency(totals.newOut)}
                </Text>
              </View>
            </View>
            <View style={styles.computedCol}>
              <View style={styles.readOnlyBox}>
                <Text
                  style={[
                    styles.readOnlyText,
                    styles.totalValue,
                    { color: netColor(totals.activityNet) },
                  ]}
                  numberOfLines={1}
                >
                  {formatCurrency(totals.activityNet)}
                </Text>
              </View>
            </View>
            <View style={styles.photoCol} />
          </View>
        </View>
      </ScrollView>
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
      onFocus={() => {
        setFocused(true);
        setText(value === null ? '' : value.toFixed(2));
      }}
      onBlur={() => {
        setFocused(false);
        setText(formatCurrencyInput(value));
      }}
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

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    card: {
      paddingHorizontal: spacing.sm,
    },
    table: {
      minWidth: 700,
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
    headerRight: {
      textAlign: 'right',
    },
    headerCenter: {
      textAlign: 'center',
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
    totalRow: {
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: spacing.xs,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radii.sm,
    },
    machineCol: {
      width: 100,
    },
    baselineCol: {
      width: 84,
    },
    inputCol: {
      width: 100,
    },
    computedCol: {
      width: 84,
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
    compactInput: {
      width: '100%',
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
    readOnlyBox: {
      width: '100%',
      minHeight: 44,
      paddingHorizontal: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      backgroundColor: colors.surface,
      justifyContent: 'center',
    },
    readOnlyText: {
      color: colors.textSecondary,
      fontSize: fontSizes.caption,
      textAlign: 'right',
    },
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
    totalLabel: {
      color: colors.textPrimary,
      fontSize: fontSizes.body,
      fontWeight: '700',
    },
    totalValue: {
      fontWeight: '700',
      color: colors.textPrimary,
    },
  });
