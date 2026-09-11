import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button } from './Button';
import { Card } from './Card';
import { Input } from './Input';
import { type Colors, fontSizes, letterSpacings, lineHeights, radii, spacing } from '../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../contexts/AuthContext';
import { alert } from '../helpers/alert';
import { calculateMachine, calculateVisit, round2 } from '../helpers/calculations';
import { formatCurrency } from '../helpers/formatters';
import { sortMachinesByNumber } from '../helpers/machineOrdering';
import { adjustVisit } from '../services/visits';
import { Visit, VisitMachine } from '../types';

interface VisitAdjustmentModalProps {
  visit: Visit;
  /** True when another submitted visit for this store closed out after this one. */
  hasNewerSubmittedVisit?: boolean;
  onClose: () => void;
  onAdjusted: () => void;
}

const READING_WARNING =
  'Adjusting these readings will change the closing numbers for this visit. Please make sure the corrected IN/OUT readings match the actual machine readings and properly close out the previous readings before saving. Incorrect adjustments may affect the next RUN and future machine calculations.';

const BASELINE_WARNING =
  'This will replace the machine\u2019s current closing/baseline readings with the corrected readings. The next RUN will calculate from these numbers. Only continue if these are the correct final machine readings.';

const CONFIRM_LABEL = 'I confirm these adjusted readings are correct and should be used to close out this visit.';

const baselineInfo = `When to use it:\n\nEnable it ONLY if this is the most recent submitted visit for these machines and you need future visits to start counting from these newly adjusted numbers.\n\nKeep it disabled if there have already been newer visits submitted after this one, or if you are simply correcting a past record without changing the current baseline for future readings.`;

const showInfo = () => alert('Rewrite machine baselines', baselineInfo);

const sanitizeNumeric = (value: string) =>
  value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');

const toAmount = (value: string) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? round2(numeric) : 0;
};

const formatTwoDecimals = (value: string) => toAmount(value).toFixed(2);

const signed = (value: number) => `${value > 0 ? '+' : ''}${formatCurrency(value)}`;

export const VisitAdjustmentModal = ({
  visit,
  hasNewerSubmittedVisit = false,
  onClose,
  onAdjusted,
}: VisitAdjustmentModalProps) => {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { ownerId } = useAuth();

  // The first adjustment stores the untouched submitted readings, so later
  // adjustments still compare against the true original values.
  const originalMachines = useMemo(() => {
    const source = visit.originalMachines?.length ? visit.originalMachines : visit.machines;
    return new Map(source.map(m => [m.machineId, m]));
  }, [visit.originalMachines, visit.machines]);

  const orderedMachines = useMemo(() => sortMachinesByNumber(visit.machines), [visit.machines]);

  const [readings, setReadings] = useState(() =>
    orderedMachines.map(m => ({
      machineId: m.machineId,
      machineNumber: m.machineNumber,
      name: m.name,
      lastSettledIn: Number(m.lastSettledIn) || 0,
      lastSettledOut: Number(m.lastSettledOut) || 0,
      storedPresentIn: Number(m.presentIn) || 0,
      storedPresentOut: Number(m.presentOut) || 0,
      presentIn: (Number(m.presentIn) || 0).toFixed(2),
      presentOut: (Number(m.presentOut) || 0).toFixed(2),
    }))
  );
  const [note, setNote] = useState('');
  const [tag, setTag] = useState('');
  const [rewriteBaselines, setRewriteBaselines] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);

  const originalTotalNet = visit.originalTotals?.totalNet ?? (Number(visit.totalNet) || 0);

  const rows = readings.map(r => {
    const original = originalMachines.get(r.machineId);
    const correctedIn = toAmount(r.presentIn);
    const correctedOut = toAmount(r.presentOut);
    const calc = calculateMachine(r.lastSettledIn, r.lastSettledOut, correctedIn, correctedOut);
    return {
      ...r,
      originalPresentIn: Number(original?.presentIn ?? r.storedPresentIn) || 0,
      originalPresentOut: Number(original?.presentOut ?? r.storedPresentOut) || 0,
      correctedIn,
      correctedOut,
      newIn: calc.newIn,
      newOut: calc.newOut,
      machineNet: calc.machineNet,
      changed: correctedIn !== r.storedPresentIn || correctedOut !== r.storedPresentOut,
    };
  });

  const computed = calculateVisit(
    rows.map(r => ({ newIn: r.newIn, newOut: r.newOut }) as VisitMachine),
    visit.storePercent
  );
  const netDifference = round2(computed.totalNet - originalTotalNet);
  const changedCount = rows.filter(r => r.changed).length;

  const updatePresent = (machineId: string, field: 'presentIn' | 'presentOut', value: string) => {
    setError('');
    setReadings(prev =>
      prev.map(r => (r.machineId === machineId ? { ...r, [field]: sanitizeNumeric(value) } : r))
    );
  };

  const formatPresent = (machineId: string, field: 'presentIn' | 'presentOut', value: string) => {
    setReadings(prev =>
      prev.map(r => (r.machineId === machineId ? { ...r, [field]: formatTwoDecimals(value) } : r))
    );
  };

  const canSave =
    confirmed &&
    note.trim().length > 0 &&
    tag.trim().length > 0 &&
    !saving;

  const handleSave = async () => {
    // Guard against a double tap slipping through before `saving` re-renders.
    if (submitting.current || !canSave) return;
    if (!ownerId) {
      setError('Your session is missing an owner account. Sign in again and retry.');
      return;
    }
    submitting.current = true;
    setError('');
    setSaving(true);
    try {
      const result = await adjustVisit(ownerId, visit.storeId, visit.id, {
        note: note.trim(),
        tag: tag.trim().toUpperCase(),
        rewriteBaselines,
        readings: rows.map(r => ({
          machineId: r.machineId,
          presentIn: r.correctedIn,
          presentOut: r.correctedOut,
        })),
      });

      const lines = [
        `Net is now ${formatCurrency(result.totalNet)} (${signed(result.netDifference)} vs before).`,
        `Store ${formatCurrency(result.storeAmount)} · Games ${formatCurrency(result.vendorAmount)}.`,
      ];
      if (rewriteBaselines) {
        lines.push(
          result.rewroteBaselines
            ? 'Machine baselines were updated for the next RUN.'
            : 'Machine baselines were left unchanged.'
        );
      }
      if (result.baselineSkipped?.length) {
        lines.push(
          `Skipped baselines: ${result.baselineSkipped
            .map(s => `${s.machineNumber} (${s.reason})`)
            .join(', ')}.`
        );
      }
      alert('Adjustment saved', lines.join('\n\n'));
      onAdjusted();
    } catch (e: any) {
      setError(e?.message || 'The adjustment could not be saved. Please try again.');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>ADMIN ADJUSTMENT</Text>
        <Text style={styles.title}>{visit.storeName}</Text>
        <Text style={styles.meta}>
          {visit.businessDate} · {visit.employeeName} · Visit {visit.id.slice(-8).toUpperCase()}
        </Text>
      </View>
      <View style={styles.warningBanner} accessibilityRole="alert">
        <Text style={styles.warningTitle}>⚠️ Warning</Text>
        <Text style={styles.warningText}>{READING_WARNING}</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.sectionTitle}>Per-machine readings</Text>
        {rows.map(r => (
          <Card key={r.machineId} style={styles.machineCard}>
            <View style={styles.machineHeader}>
              <Text style={styles.machineTitle}>
                {r.machineNumber} {r.name || 'Unnamed machine'}
              </Text>
              {r.changed ? <Text style={styles.changedTag}>CHANGED</Text> : null}
            </View>

            <View style={styles.readingGrid}>
              <ReadingLine
                styles={styles}
                label="Previous settled (baseline)"
                value={`IN ${formatCurrency(r.lastSettledIn)} · OUT ${formatCurrency(r.lastSettledOut)}`}
              />
              <ReadingLine
                styles={styles}
                label="Original submitted present"
                value={`IN ${formatCurrency(r.originalPresentIn)} · OUT ${formatCurrency(r.originalPresentOut)}`}
              />
            </View>

            <View style={styles.row}>
              <View style={styles.half}>
                <Input
                  label="Corrected Present IN"
                  value={r.presentIn}
                  onChangeText={text => updatePresent(r.machineId, 'presentIn', text)}
                  onBlur={() => formatPresent(r.machineId, 'presentIn', r.presentIn)}
                  prefix="$"
                  keyboardType="decimal-pad"
                  inputMode="decimal"
                />
              </View>
              <View style={styles.half}>
                <Input
                  label="Corrected Present OUT"
                  value={r.presentOut}
                  onChangeText={text => updatePresent(r.machineId, 'presentOut', text)}
                  onBlur={() => formatPresent(r.machineId, 'presentOut', r.presentOut)}
                  prefix="$"
                  keyboardType="decimal-pad"
                  inputMode="decimal"
                />
              </View>
            </View>

            <View style={styles.afterBox}>
              <Text style={styles.afterTitle}>After correction</Text>
              <ReadingLine
                styles={styles}
                label="New IN"
                value={`${formatCurrency(r.correctedIn)} − ${formatCurrency(r.lastSettledIn)} = ${formatCurrency(r.newIn)}`}
              />
              <ReadingLine
                styles={styles}
                label="New OUT"
                value={`${formatCurrency(r.correctedOut)} − ${formatCurrency(r.lastSettledOut)} = ${formatCurrency(r.newOut)}`}
              />
              <ReadingLine styles={styles} label="Machine net" value={formatCurrency(r.machineNet)} strong />
            </View>
          </Card>
        ))}

        <Card style={styles.computedCard}>
          <Text style={styles.sectionTitle}>Before you save</Text>
          <CompareRow
            styles={styles}
            label="Money In"
            before={visit.originalTotals?.totalNewIn ?? visit.totalNewIn}
            after={computed.totalNewIn}
          />
          <CompareRow
            styles={styles}
            label="Money Out"
            before={visit.originalTotals?.totalNewOut ?? visit.totalNewOut}
            after={computed.totalNewOut}
          />
          <CompareRow styles={styles} label="Net" before={originalTotalNet} after={computed.totalNet} strong />
          <CompareRow
            styles={styles}
            label={`Store (${visit.storePercent}%)`}
            before={visit.originalTotals?.storeAmount ?? visit.storeAmount}
            after={computed.storeAmount}
          />
          <CompareRow
            styles={styles}
            label={`Games (${visit.vendorPercent}%)`}
            before={visit.originalTotals?.vendorAmount ?? visit.vendorAmount}
            after={computed.vendorAmount}
          />
          <View style={styles.differenceRow}>
            <Text style={styles.differenceLabel}>Difference caused by adjustment</Text>
            <Text
              style={[
                styles.differenceValue,
                netDifference > 0 ? styles.positive : netDifference < 0 ? styles.negative : null,
              ]}
            >
              {signed(netDifference)}
            </Text>
          </View>
          <Text style={styles.differenceHint}>
            {changedCount === 0
              ? 'No readings changed yet.'
              : `${changedCount} machine${changedCount === 1 ? '' : 's'} will be corrected.`}
          </Text>
        </Card>

        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Adjustment details</Text>
          <Input
            label="Tag / reason (required)"
            value={tag}
            onChangeText={value => {
              setError('');
              setTag(value);
            }}
            placeholder="CORRECTION"
            autoCapitalize="characters"
          />
          <Input
            label="Note (required)"
            value={note}
            onChangeText={value => {
              setError('');
              setNote(value);
            }}
            placeholder="Explain why these readings are being changed"
            multiline
          />
          <View style={styles.switchRow}>
            <View style={styles.switchLabelGroup}>
              <Text style={styles.switchLabel}>Rewrite machine baselines</Text>
              <Pressable
                onPress={showInfo}
                style={styles.infoButton}
                accessibilityRole="button"
                accessibilityLabel="Baseline rewrite info"
              >
                <Text style={[styles.infoIcon, { color: colors.primary }]}>?</Text>
              </Pressable>
            </View>
            <Switch
              value={rewriteBaselines}
              onValueChange={value => {
                setError('');
                setRewriteBaselines(value);
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={rewriteBaselines ? colors.primary : colors.textMuted}
            />
          </View>
          <Text style={styles.switchHint}>
            Only enable if this is the last submitted visit for these machines.
          </Text>
          {rewriteBaselines ? (
            <View style={styles.baselineWarning} accessibilityRole="alert">
              <Text style={styles.warningTitle}>⚠️ Baseline rewrite</Text>
              <Text style={styles.warningText}>{BASELINE_WARNING}</Text>
            </View>
          ) : null}
          {rewriteBaselines && hasNewerSubmittedVisit ? (
            <Text style={styles.baselineBlocked}>
              A newer submitted visit exists for this store, so baselines will be left unchanged to protect later
              calculations. This visit will still be corrected.
            </Text>
          ) : null}
          {rewriteBaselines && visit.settlementStatus !== 'submitted' ? (
            <Text style={styles.baselineBlocked}>
              This visit is not submitted, so machine baselines cannot be rewritten. The corrected readings will
              still be saved.
            </Text>
          ) : null}
        </Card>

        <Pressable
          onPress={() => {
            setError('');
            setConfirmed(value => !value);
          }}
          style={styles.confirmRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: confirmed }}
          accessibilityLabel={CONFIRM_LABEL}
        >
          <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
            {confirmed ? <Text style={styles.checkboxMark}>✓</Text> : null}
          </View>
          <Text style={styles.confirmText}>{CONFIRM_LABEL}</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!confirmed && !error ? (
          <Text style={styles.hint}>Check the confirmation box above to enable Save Adjustment.</Text>
        ) : null}

        <View style={styles.actions}>
          <Button
            title={saving ? 'Saving…' : 'Save Adjustment'}
            onPress={handleSave}
            loading={saving}
            disabled={!canSave}
          />
          <Button title="Cancel" onPress={onClose} variant="secondary" disabled={saving} />
        </View>
      </ScrollView>
      {saving ? (
        <View style={styles.spinner} pointerEvents="auto">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.spinnerText}>Saving adjustment…</Text>
        </View>
      ) : null}
    </View>
  );
};

const ReadingLine = ({
  styles,
  label,
  value,
  strong = false,
}: {
  styles: ReturnType<typeof makeStyles>;
  label: string;
  value: string;
  strong?: boolean;
}) => (
  <View style={styles.readingLine}>
    <Text style={styles.readingLabel}>{label}</Text>
    <Text style={[styles.readingValue, strong && styles.readingValueStrong]}>{value}</Text>
  </View>
);

const CompareRow = ({
  styles,
  label,
  before,
  after,
  strong = false,
}: {
  styles: ReturnType<typeof makeStyles>;
  label: string;
  before: number;
  after: number;
  strong?: boolean;
}) => (
  <View style={styles.computedRow}>
    <Text style={styles.computedLabel}>{label}</Text>
    <View style={styles.computedValues}>
      <Text style={styles.beforeValue}>{formatCurrency(Number(before) || 0)}</Text>
      <Text style={styles.arrow}>→</Text>
      <Text style={[styles.computedValue, strong && styles.computedValueStrong]}>{formatCurrency(after)}</Text>
    </View>
  </View>
);

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.background,
      zIndex: 100,
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      justifyContent: 'flex-start',
    },
    header: {
      marginBottom: spacing.sm,
    },
    eyebrow: {
      color: colors.primary,
      fontSize: fontSizes.caption,
      fontWeight: '700',
      letterSpacing: letterSpacings.label,
    },
    title: {
      marginTop: spacing.xs,
      color: colors.textPrimary,
      fontSize: fontSizes.h1,
      fontWeight: '700',
    },
    meta: {
      color: colors.textSecondary,
      fontSize: fontSizes.body,
    },
    scroll: {
      flex: 1,
    },
    container: {
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    warningBanner: {
      padding: spacing.md,
      marginBottom: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.warning,
      backgroundColor: colors.surfaceSecondary,
      gap: spacing.xs,
    },
    baselineWarning: {
      marginTop: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.warning,
      backgroundColor: colors.surfaceSecondary,
      gap: spacing.xs,
    },
    warningTitle: {
      color: colors.warning,
      fontSize: fontSizes.body,
      fontWeight: '700',
    },
    warningText: {
      color: colors.textPrimary,
      fontSize: fontSizes.body,
      lineHeight: lineHeights.body,
    },
    baselineBlocked: {
      marginTop: spacing.sm,
      color: colors.info,
      fontSize: fontSizes.caption,
      lineHeight: lineHeights.caption,
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: fontSizes.h2,
      fontWeight: '700',
      marginBottom: spacing.sm,
    },
    machineCard: {
      marginBottom: spacing.md,
    },
    machineHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    machineTitle: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: fontSizes.h3,
      fontWeight: '600',
    },
    changedTag: {
      color: colors.warning,
      fontSize: fontSizes.caption,
      fontWeight: '700',
      letterSpacing: letterSpacings.label,
    },
    readingGrid: {
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
      gap: spacing.xs,
    },
    readingLine: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    readingLabel: {
      flexShrink: 1,
      color: colors.textSecondary,
      fontSize: fontSizes.caption,
    },
    readingValue: {
      color: colors.textPrimary,
      fontSize: fontSizes.caption,
      textAlign: 'right',
    },
    readingValueStrong: {
      fontWeight: '700',
    },
    row: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    half: {
      flex: 1,
      minWidth: 0,
    },
    afterBox: {
      marginTop: spacing.sm,
      padding: spacing.sm,
      borderRadius: radii.sm,
      backgroundColor: colors.surfaceSecondary,
      gap: spacing.xs,
    },
    afterTitle: {
      color: colors.textSecondary,
      fontSize: fontSizes.caption,
      fontWeight: '700',
      letterSpacing: letterSpacings.label,
    },
    computedCard: {
      marginBottom: spacing.md,
    },
    computedRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    computedLabel: {
      flexShrink: 1,
      color: colors.textSecondary,
      fontSize: fontSizes.body,
    },
    computedValues: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    beforeValue: {
      color: colors.textMuted,
      fontSize: fontSizes.caption,
      textDecorationLine: 'line-through',
    },
    arrow: {
      color: colors.textMuted,
      fontSize: fontSizes.caption,
    },
    computedValue: {
      color: colors.textPrimary,
      fontSize: fontSizes.body,
      fontWeight: '700',
    },
    computedValueStrong: {
      fontSize: fontSizes.h3,
    },
    differenceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
      paddingTop: spacing.sm,
    },
    differenceLabel: {
      flexShrink: 1,
      color: colors.textPrimary,
      fontSize: fontSizes.body,
      fontWeight: '600',
    },
    differenceValue: {
      color: colors.textPrimary,
      fontSize: fontSizes.h3,
      fontWeight: '700',
    },
    positive: {
      color: colors.success,
    },
    negative: {
      color: colors.error,
    },
    differenceHint: {
      marginTop: spacing.xs,
      color: colors.textMuted,
      fontSize: fontSizes.caption,
    },
    formCard: {
      marginBottom: spacing.md,
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    switchLabelGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
    },
    switchLabel: {
      color: colors.textPrimary,
      fontSize: fontSizes.body,
      fontWeight: '600',
    },
    infoButton: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoIcon: {
      fontSize: fontSizes.body,
      fontWeight: '700',
    },
    switchHint: {
      color: colors.textMuted,
      fontSize: fontSizes.caption,
      marginTop: spacing.xs,
    },
    confirmRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: 44,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    checkbox: {
      width: 26,
      height: 26,
      borderRadius: radii.sm,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    checkboxMark: {
      color: colors.surface,
      fontSize: fontSizes.body,
      fontWeight: '700',
    },
    confirmText: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: fontSizes.body,
      lineHeight: lineHeights.body,
    },
    error: {
      color: colors.error,
      fontSize: fontSizes.body,
      lineHeight: lineHeights.body,
      textAlign: 'center',
    },
    hint: {
      color: colors.textMuted,
      fontSize: fontSizes.caption,
      textAlign: 'center',
    },
    actions: {
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    spinner: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
    },
    spinnerText: {
      color: colors.textPrimary,
      fontSize: fontSizes.body,
      fontWeight: '600',
    },
  });
