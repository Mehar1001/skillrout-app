import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { CurrencyInput } from './CurrencyInput';
import { type Colors, fontSizes, radii, spacing } from '../constants/designTokens';
import { formatCurrency } from '../helpers/formatters';
import { ReceiptReviewRow } from '../helpers/receiptMachineMatching';
import { useColors } from '../hooks/useColors';
import { Machine, MachineReadingDraft, ReceiptOcrTotals } from '../types';

export interface AppliedReceiptReading {
  machineId: string;
  presentIn: number;
  presentOut: number;
  confidence: number;
}

interface ReceiptScanReviewProps {
  visible: boolean;
  imageUri: string | null;
  rows: ReceiptReviewRow[];
  totals: ReceiptOcrTotals | null;
  warnings: string[];
  machines: Machine[];
  readings: Record<string, MachineReadingDraft>;
  onApply: (readings: AppliedReceiptReading[]) => void;
  onClose: () => void;
}

export const ReceiptScanReview = ({
  visible,
  imageUri,
  rows,
  totals,
  warnings,
  machines,
  readings,
  onApply,
  onClose,
}: ReceiptScanReviewProps) => {
  const colors = useColors();
  const styles = makeStyles(colors);
  const [draftRows, setDraftRows] = useState(rows);
  const [acceptedMismatch, setAcceptedMismatch] = useState(false);

  useEffect(() => {
    setDraftRows(rows);
    setAcceptedMismatch(false);
  }, [rows]);

  const totalsMismatch = totals?.inMatches === false || totals?.outMatches === false;
  const applicable = useMemo(
    () =>
      draftRows.filter(row => {
        if (!row.machineId || row.presentIn === null || row.presentOut === null) return false;
        const machine = machines.find(item => item.id === row.machineId);
        return Boolean(
          machine &&
          row.presentIn >= machine.lastSettledIn &&
          row.presentOut >= machine.lastSettledOut
        );
      }),
    [draftRows, machines]
  );

  const updateRow = (index: number, values: Partial<ReceiptReviewRow>) => {
    setDraftRows(current => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...values } : row)));
  };

  const handleApply = () => {
    onApply(
      applicable.map(row => ({
        machineId: row.machineId!,
        presentIn: row.presentIn!,
        presentOut: row.presentOut!,
        confidence: row.confidence,
      }))
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>OCR SUGGESTIONS</Text>
            <Text style={styles.title}>Review receipt readings</Text>
            <Text style={styles.subtitle}>Confirm every value before applying it to the visit.</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" /> : null}

          {warnings.map(warning => (
            <View key={warning} style={styles.warningBox}>
              <Text style={styles.warningText}>{warning}</Text>
            </View>
          ))}

          {totals ? (
            <View style={styles.totalsCard}>
              <Text style={styles.sectionTitle}>Receipt totals check</Text>
              <TotalsRow
                label="Credits In / Money In"
                extracted={totals.extractedIn}
                printed={totals.moneyIn}
                matches={totals.inMatches}
              />
              <TotalsRow
                label="Total Paid / Money Out"
                extracted={totals.extractedOut}
                printed={totals.moneyOut}
                matches={totals.outMatches}
              />
            </View>
          ) : null}

          {draftRows.map((row, index) => {
            const machine = row.machineId ? machines.find(item => item.id === row.machineId) : null;
            const current = row.machineId ? readings[row.machineId] : null;
            const inBelow = Boolean(machine && row.presentIn !== null && row.presentIn < machine.lastSettledIn);
            const outBelow = Boolean(machine && row.presentOut !== null && row.presentOut < machine.lastSettledOut);
            return (
              <View key={`${row.receiptMachineNumber}-${index}`} style={styles.rowCard}>
                <View style={styles.rowHeader}>
                  <View>
                    <Text style={styles.machineTitle}>Receipt machine {row.receiptMachineNumber}</Text>
                    <Text style={machine ? styles.matchText : styles.unmatchedText}>
                      {machine
                        ? `Matched Machine ${machine.machineNumber}${machine.name ? ` · ${machine.name}` : ''}`
                        : 'No matching Skillrout machine'}
                    </Text>
                  </View>
                  <Text style={styles.confidence}>{Math.round(row.confidence * 100)}% OCR</Text>
                </View>

                {row.warnings.map(warning => (
                  <Text key={warning} style={styles.rowWarning}>{warning}</Text>
                ))}

                {machine ? (
                  <>
                    {current && (current.presentIn !== null || current.presentOut !== null) ? (
                      <Text style={styles.currentText}>
                        Current manual values: IN {current?.presentIn === null ? '—' : formatCurrency(current?.presentIn ?? 0)} · OUT {current?.presentOut === null ? '—' : formatCurrency(current?.presentOut ?? 0)}
                      </Text>
                    ) : null}
                    <View style={styles.inputs}>
                      <View style={styles.inputHalf}>
                        <CurrencyInput
                          label="Suggested Present IN"
                          value={row.presentIn}
                          onChangeValue={presentIn => updateRow(index, { presentIn })}
                          error={inBelow ? `Must be at least ${formatCurrency(machine.lastSettledIn)}` : undefined}
                        />
                      </View>
                      <View style={styles.inputHalf}>
                        <CurrencyInput
                          label="Suggested Present OUT"
                          value={row.presentOut}
                          onChangeValue={presentOut => updateRow(index, { presentOut })}
                          error={outBelow ? `Must be at least ${formatCurrency(machine.lastSettledOut)}` : undefined}
                        />
                      </View>
                    </View>
                  </>
                ) : null}
              </View>
            );
          })}

          {draftRows.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No machine rows found</Text>
              <Text style={styles.subtitle}>Retake the photo with the entire receipt visible, or enter readings manually.</Text>
            </View>
          ) : null}

          {totalsMismatch ? (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptedMismatch }}
              onPress={() => setAcceptedMismatch(current => !current)}
              style={styles.confirmRow}
            >
              <View style={[styles.checkbox, acceptedMismatch && styles.checkboxChecked]}>
                <Text style={styles.checkmark}>{acceptedMismatch ? '✓' : ''}</Text>
              </View>
              <Text style={styles.confirmText}>I reviewed the totals mismatch and will verify the applied readings manually.</Text>
            </Pressable>
          ) : null}
        </ScrollView>

        <View style={styles.actions}>
          <Button title="Apply Readings" onPress={handleApply} variant="accent" disabled={applicable.length === 0 || (totalsMismatch && !acceptedMismatch)} />
          <Button title="Cancel" onPress={onClose} variant="secondary" />
        </View>
      </View>
    </Modal>
  );
};

const TotalsRow = ({
  label,
  extracted,
  printed,
  matches,
}: {
  label: string;
  extracted: number;
  printed: number | null;
  matches: boolean | null;
}) => {
  const colors = useColors();
  const styles = makeStyles(colors);
  return (
    <View style={styles.totalRow}>
      <View style={styles.totalText}>
        <Text style={styles.totalLabel}>{label}</Text>
        <Text style={styles.totalValue}>Rows {formatCurrency(extracted)} · Receipt {printed === null ? 'Not found' : formatCurrency(printed)}</Text>
      </View>
      <Text style={[styles.totalStatus, { color: matches === true ? colors.success : matches === false ? colors.error : colors.warning }]}>
        {matches === true ? 'Match' : matches === false ? 'Mismatch' : 'Check'}
      </Text>
    </View>
  );
};

const makeStyles = (colors: Colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  headerText: { flex: 1 },
  eyebrow: { color: colors.accent, fontSize: fontSizes.caption, fontWeight: '700', letterSpacing: 0.8 },
  title: { marginTop: spacing.xs, color: colors.textPrimary, fontSize: fontSizes.h2, fontWeight: '700' },
  subtitle: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: fontSizes.body },
  closeButton: { minHeight: 44, minWidth: 60, justifyContent: 'center', alignItems: 'center' },
  closeText: { color: colors.primary, fontSize: fontSizes.body, fontWeight: '700' },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  preview: { width: '100%', height: 220, borderRadius: radii.md, backgroundColor: colors.surfaceSecondary },
  warningBox: { padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.accentSubtle, borderWidth: 1, borderColor: colors.warning },
  warningText: { color: colors.textPrimary, fontSize: fontSizes.body },
  totalsCard: { padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { color: colors.textPrimary, fontSize: fontSizes.h3, fontWeight: '700', marginBottom: spacing.sm },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  totalText: { flex: 1 },
  totalLabel: { color: colors.textPrimary, fontSize: fontSizes.body, fontWeight: '600' },
  totalValue: { marginTop: 2, color: colors.textMuted, fontSize: fontSizes.caption },
  totalStatus: { fontSize: fontSizes.caption, fontWeight: '700' },
  rowCard: { padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  machineTitle: { color: colors.textPrimary, fontSize: fontSizes.h3, fontWeight: '700' },
  matchText: { marginTop: 2, color: colors.success, fontSize: fontSizes.caption },
  unmatchedText: { marginTop: 2, color: colors.error, fontSize: fontSizes.caption, fontWeight: '700' },
  confidence: { color: colors.textMuted, fontSize: fontSizes.caption },
  rowWarning: { marginTop: spacing.sm, color: colors.warning, fontSize: fontSizes.caption },
  currentText: { marginTop: spacing.sm, color: colors.textSecondary, fontSize: fontSizes.caption },
  inputs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  inputHalf: { flex: 1, minWidth: 150 },
  emptyCard: { padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.surface },
  emptyTitle: { color: colors.textPrimary, fontSize: fontSizes.h3, fontWeight: '700' },
  confirmRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface },
  checkbox: { width: 26, height: 26, borderRadius: radii.sm, borderWidth: 2, borderColor: colors.warning, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.warning },
  checkmark: { color: colors.textOnAccent, fontWeight: '800' },
  confirmText: { flex: 1, color: colors.textPrimary, fontSize: fontSizes.body },
  actions: { padding: spacing.md, paddingBottom: spacing.lg, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
});
