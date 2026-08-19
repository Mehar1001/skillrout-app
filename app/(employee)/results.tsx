import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import * as Print from 'expo-print';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { colors, fontSizes, lineHeights, radii, spacing } from '../../constants/designTokens';
import { useAuth } from '../../contexts/AuthContext';
import { generateReceiptHtml } from '../../helpers/receiptTemplate';
import { formatCurrency, formatNumber } from '../../helpers/formatters';
import { validatePercentages } from '../../helpers/validators';
import { calculateVisit } from '../../helpers/calculations';
import { getVisit, markPrinted, submitVisit } from '../../services/visits';
import { Visit } from '../../types';

export default function ResultsScreen() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const router = useRouter();
  const { user, ownerId } = useAuth();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [storePercent, setStorePercent] = useState(50);
  const [vendorPercent, setVendorPercent] = useState(50);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !ownerId || !visitId) return;
    getVisit(ownerId!, visitId).then(v => {
      if (v) {
        setVisit(v);
        setStorePercent(v.storePercent);
        setVendorPercent(v.vendorPercent);
      }
    });
  }, [user, ownerId, visitId]);

  const recalc = (sPct: number, vPct: number) => {
    if (!visit) return null;
    const error = validatePercentages(sPct, vPct);
    if (error) return null;
    const calc = calculateVisit(visit.machines, sPct);
    return { ...calc, cashDueLocation: calc.totalNewOut + calc.storeAmount };
  };

  const current = recalc(storePercent, vendorPercent);
  const display = current ?? visit;

  const handlePrint = async () => {
    if (!user || !ownerId || !visit || !display) return;
    setLoading(true);
    try {
      const updated: Visit = {
        ...visit,
        storePercent,
        vendorPercent,
        storeAmount: current?.storeAmount ?? visit.storeAmount,
        vendorAmount: current?.vendorAmount ?? visit.vendorAmount,
        cashDueLocation: current?.cashDueLocation ?? visit.cashDueLocation,
        totalNet: current?.totalNet ?? visit.totalNet,
      };
      await markPrinted(ownerId!, visit.id, user.uid);
      await Print.printAsync({ html: generateReceiptHtml(updated) });
      Alert.alert('Printed', 'Receipt ready.');
    } catch (e: any) {
      Alert.alert('Print Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !ownerId || !visit) return;
    const error = validatePercentages(storePercent, vendorPercent);
    if (error) {
      Alert.alert('Validation', error);
      return;
    }
    setLoading(true);
    try {
      await submitVisit(ownerId!, visit.id, storePercent, vendorPercent);
      const submittedVisit: Visit = {
        ...visit,
        storePercent,
        vendorPercent,
        storeAmount: current?.storeAmount ?? visit.storeAmount,
        vendorAmount: current?.vendorAmount ?? visit.vendorAmount,
        cashDueLocation: current?.cashDueLocation ?? visit.cashDueLocation,
      };
      await Print.printAsync({ html: generateReceiptHtml(submittedVisit) });
      Alert.alert('Submitted', 'Settlement finalized and receipt printed.');
      router.replace('/select-store' as any);
    } catch (e: any) {
      Alert.alert('Submit Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!visit || !display) return null;

  const resultColor =
    display.result === 'positive'
      ? colors.success
      : display.result === 'negative'
      ? colors.error
      : colors.textMuted;

  const canSubmit =
    display.totalNet > 0 &&
    storePercent + vendorPercent === 100 &&
    visit.settlementStatus !== 'submitted';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Results</Text>
        <Text style={styles.meta}>
          {visit.storeName} · {visit.businessDate}
        </Text>
      </View>

      <Card style={styles.summaryCard}>
        <View style={styles.resultRow}>
          <Text style={styles.summaryTitle}>Run outcome</Text>
          <View style={[styles.badge, { backgroundColor: resultColor }]}>
            <Text style={styles.badgeText}>{display.result.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total New IN</Text>
          <Text style={styles.value}>{formatNumber(display.totalNewIn)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total New OUT</Text>
          <Text style={styles.value}>{formatNumber(display.totalNewOut)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Net</Text>
          <Text style={[styles.value, { color: resultColor }]}>
            {formatNumber(display.totalNet)}
          </Text>
        </View>
      </Card>

      {visit.settlementStatus !== 'submitted' && (
        <Card style={styles.percentCard}>
          <Text style={styles.summaryTitle}>Settlement split</Text>
          <View style={styles.row}>
            <View style={styles.half}>
              <Input
                label="Store %"
                value={String(storePercent)}
                onChangeText={text => setStorePercent(Number(text) || 0)}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.half}>
              <Input
                label="Vendor %"
                value={String(vendorPercent)}
                onChangeText={text => setVendorPercent(Number(text) || 0)}
                keyboardType="numeric"
              />
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Store amount</Text>
            <Text style={styles.value}>{formatCurrency(display.storeAmount)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Vendor amount</Text>
            <Text style={styles.value}>{formatCurrency(display.vendorAmount)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Cash due location</Text>
            <Text style={styles.value}>{formatCurrency(display.cashDueLocation)}</Text>
          </View>
        </Card>
      )}

      {visit.settlementStatus === 'submitted' && (
        <Card style={styles.submittedCard}>
          <Text style={styles.submittedText}>
            This settlement has already been submitted. You can still reprint the receipt.
          </Text>
        </Card>
      )}

      <View style={styles.actions}>
        <Button title="Print" onPress={handlePrint} loading={loading} variant="secondary" />
        {canSubmit && (
          <Button title="Submit & Print" onPress={handleSubmit} loading={loading} variant="primary" />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    minHeight: '100%',
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes.h1,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  meta: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
  },
  summaryCard: {
    marginBottom: spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryTitle: {
    fontSize: fontSizes.h2,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
  },
  badgeText: {
    color: colors.textOnPrimary,
    fontSize: fontSizes.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  percentCard: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
  label: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    flex: 1,
  },
  value: {
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  submittedCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceSecondary,
  },
  submittedText: {
    color: colors.textPrimary,
    fontWeight: '500',
    lineHeight: lineHeights.body,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
});
