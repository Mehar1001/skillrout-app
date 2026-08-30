import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button } from './Button';
import { Card } from './Card';
import { Input } from './Input';
import { type Colors, fontSizes, spacing } from '../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../contexts/AuthContext';
import { calculateMachine, calculateVisit } from '../helpers/calculations';
import { formatCurrency } from '../helpers/formatters';
import { adjustVisit } from '../services/visits';
import { Visit, VisitMachine } from '../types';

interface VisitAdjustmentModalProps {
  visit: Visit;
  onClose: () => void;
  onAdjusted: () => void;
}

export const VisitAdjustmentModal = ({ visit, onClose, onAdjusted }: VisitAdjustmentModalProps) => {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { ownerId } = useAuth();
  const [readings, setReadings] = useState(
    visit.machines.map(m => ({
      machineId: m.machineId,
      machineNumber: m.machineNumber,
      lastSettledIn: m.lastSettledIn,
      lastSettledOut: m.lastSettledOut,
      presentIn: String(m.presentIn),
      presentOut: String(m.presentOut),
    }))
  );
  const [note, setNote] = useState('');
  const [tag, setTag] = useState('');
  const [rewriteBaselines, setRewriteBaselines] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const computed = (() => {
    const vms = readings.map(r => {
      const presentIn = Number(r.presentIn) || 0;
      const presentOut = Number(r.presentOut) || 0;
      const calc = calculateMachine(r.lastSettledIn, r.lastSettledOut, presentIn, presentOut);
      return { newIn: calc.newIn, newOut: calc.newOut } as VisitMachine;
    });
    return calculateVisit(vms, visit.storePercent);
  })();

  const updatePresent = (machineId: string, field: 'presentIn' | 'presentOut', value: string) => {
    setReadings(prev => prev.map(r => (r.machineId === machineId ? { ...r, [field]: value } : r)));
  };

  const handleSave = async () => {
    if (!ownerId) return;
    setError('');
    if (!note.trim()) {
      setError('An adjustment note is required.');
      return;
    }
    if (!tag.trim()) {
      setError('An adjustment tag (e.g. CORRECTION) is required.');
      return;
    }
    const payloadReadings = readings
      .map(r => ({
        machineId: r.machineId,
        presentIn: Number(r.presentIn) || 0,
        presentOut: Number(r.presentOut) || 0,
      }))
      .filter(r => visit.machines.some((m: VisitMachine) => m.machineId === r.machineId));
    setSaving(true);
    try {
      await adjustVisit(ownerId, visit.storeId, visit.id, {
        note: note.trim(),
        tag: tag.trim(),
        rewriteBaselines,
        readings: payloadReadings,
      });
      onAdjusted();
    } catch (e: any) {
      setError(e.message || 'Adjustment could not be saved.');
    } finally {
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
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Per-machine readings</Text>
        {readings.map(r => {
          const vm = visit.machines.find((m: VisitMachine) => m.machineId === r.machineId);
          return (
            <Card key={r.machineId} style={styles.machineCard}>
              <Text style={styles.machineTitle}>
                #{r.machineNumber} {vm?.name}
              </Text>
              <Text style={styles.baseline}>
                Last Settled: IN {formatCurrency(r.lastSettledIn)} · OUT {formatCurrency(r.lastSettledOut)}
              </Text>
              <View style={styles.row}>
                <View style={styles.half}>
                  <Input
                    label="Present IN"
                    value={r.presentIn}
                    onChangeText={text => updatePresent(r.machineId, 'presentIn', text)}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.half}>
                  <Input
                    label="Present OUT"
                    value={r.presentOut}
                    onChangeText={text => updatePresent(r.machineId, 'presentOut', text)}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </Card>
          );
        })}

        <Card style={styles.computedCard}>
          <Text style={styles.sectionTitle}>Recalculated totals</Text>
          <View style={styles.computedRow}>
            <Text style={styles.computedLabel}>Money In</Text>
            <Text style={styles.computedValue}>{formatCurrency(computed.totalNewIn)}</Text>
          </View>
          <View style={styles.computedRow}>
            <Text style={styles.computedLabel}>Money Out</Text>
            <Text style={styles.computedValue}>{formatCurrency(computed.totalNewOut)}</Text>
          </View>
          <View style={styles.computedRow}>
            <Text style={styles.computedLabel}>Net</Text>
            <Text style={styles.computedValue}>{formatCurrency(computed.totalNet)}</Text>
          </View>
          <View style={styles.computedRow}>
            <Text style={styles.computedLabel}>Store ({visit.storePercent}%)</Text>
            <Text style={styles.computedValue}>{formatCurrency(computed.storeAmount)}</Text>
          </View>
          <View style={styles.computedRow}>
            <Text style={styles.computedLabel}>Games ({visit.vendorPercent}%)</Text>
            <Text style={styles.computedValue}>{formatCurrency(computed.vendorAmount)}</Text>
          </View>
        </Card>

        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Adjustment details</Text>
          <Input
            label="Tag (e.g. CORRECTION, REBATE)"
            value={tag}
            onChangeText={setTag}
            placeholder="CORRECTION"
          />
          <Input
            label="Note (mandatory)"
            value={note}
            onChangeText={setNote}
            placeholder="Why the readings are being changed"
            multiline
          />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Rewrite machine baselines</Text>
            <Switch
              value={rewriteBaselines}
              onValueChange={setRewriteBaselines}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={rewriteBaselines ? colors.primary : colors.textMuted}
            />
          </View>
          <Text style={styles.switchHint}>
            Only enable if this is the last submitted visit for these machines.
          </Text>
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <Button title="Save Adjustment" onPress={handleSave} loading={saving} disabled={saving} />
          <Button title="Cancel" onPress={onClose} variant="secondary" disabled={saving} />
        </View>
      </ScrollView>
      {saving ? (
        <View style={styles.spinner}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
};

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.background,
      zIndex: 100,
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    header: {
      marginBottom: spacing.md,
    },
    eyebrow: {
      color: colors.primary,
      fontSize: fontSizes.caption,
      fontWeight: '700',
      letterSpacing: 0.8,
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
    container: {
      paddingBottom: spacing.xxl,
      gap: spacing.md,
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
    machineTitle: {
      color: colors.textPrimary,
      fontSize: fontSizes.h3,
      fontWeight: '600',
    },
    baseline: {
      color: colors.textSecondary,
      fontSize: fontSizes.caption,
      marginBottom: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    half: {
      flex: 1,
    },
    computedCard: {
      marginBottom: spacing.md,
    },
    computedRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    computedLabel: {
      color: colors.textSecondary,
      fontSize: fontSizes.body,
    },
    computedValue: {
      color: colors.textPrimary,
      fontSize: fontSizes.body,
      fontWeight: '700',
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
    switchLabel: {
      color: colors.textPrimary,
      fontSize: fontSizes.body,
      fontWeight: '600',
    },
    switchHint: {
      color: colors.textMuted,
      fontSize: fontSizes.caption,
      marginTop: spacing.xs,
    },
    error: {
      color: colors.error,
      fontSize: fontSizes.body,
      textAlign: 'center',
    },
    actions: {
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    spinner: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.background,
      opacity: 0.8,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
