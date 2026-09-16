import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { type Colors, fontSizes, lineHeights, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate } from '../../helpers/formatters';
import { buildShiftReport } from '../../helpers/shiftReport';
import { shareReportExcel } from '../../helpers/shareReportExcel';
import { listShifts, listShiftReconciliations, listShiftVisits } from '../../services/shifts';
import { listStores } from '../../services/stores';
import { CollectionShift, ShiftReconciliation, Store, Visit } from '../../types';

const todayIso = () => new Date().toISOString().slice(0, 10);
const daysAgoIso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
};

type RangePreset = 'today' | 'week' | 'month' | 'six-month' | 'custom';

export default function ShiftReportsScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { ownerId, businessName } = useAuth();
  const [shifts, setShifts] = useState<CollectionShift[]>([]);
  const [reconciliations, setReconciliations] = useState<Record<string, ShiftReconciliation[]>>({});
  const [visits, setVisits] = useState<Record<string, Visit[]>>({});
  const [storeMap, setStoreMap] = useState<Record<string, Store>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [preset, setPreset] = useState<RangePreset>('month');
  const [startDate, setStartDate] = useState(daysAgoIso(30));
  const [endDate, setEndDate] = useState(todayIso());

  const applyPreset = (next: RangePreset) => {
    setPreset(next);
    if (next === 'today') {
      setStartDate(startOfToday());
      setEndDate(startOfToday());
    } else if (next === 'week') {
      setStartDate(daysAgoIso(7));
      setEndDate(todayIso());
    } else if (next === 'month') {
      setStartDate(daysAgoIso(30));
      setEndDate(todayIso());
    } else if (next === 'six-month') {
      setStartDate(daysAgoIso(180));
      setEndDate(todayIso());
    }
  };

  const load = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const [allShifts, allStores] = await Promise.all([listShifts(ownerId, undefined, 500), listStores(ownerId)]);
      setShifts(allShifts);
      setStoreMap(Object.fromEntries(allStores.map(s => [s.id, s])));

      const reconMap: Record<string, ShiftReconciliation[]> = {};
      const visitMap: Record<string, Visit[]> = {};
      await Promise.all(
        allShifts.map(async shift => {
          const [reconData, visitData] = await Promise.all([
            listShiftReconciliations(ownerId, shift.id),
            listShiftVisits(ownerId, shift.id),
          ]);
          reconMap[shift.id] = reconData;
          visitMap[shift.id] = visitData;
        })
      );
      setReconciliations(reconMap);
      setVisits(visitMap);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not load shift reports.');
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    load();
  }, [load]);

  const { summary, storeDetail, machineDetail } = useMemo(() => {
    return buildShiftReport(shifts, storeMap, reconciliations, visits, startDate, endDate);
  }, [shifts, storeMap, reconciliations, visits, startDate, endDate]);

  const handleExport = async () => {
    if (storeDetail.length === 0 && machineDetail.length === 0) {
      Alert.alert('No data', 'There are no shifts in the selected range to export.');
      return;
    }
    setExporting(true);
    try {
      await shareReportExcel(summary, storeDetail, machineDetail, startDate, endDate, businessName ?? undefined);
    } catch (e: any) {
      Alert.alert('Export Error', e.message || 'Could not create the Excel file.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.headingText}>
          <Text style={styles.title}>Collections Reports</Text>
          <Text style={styles.subtitle}>Employee shift and collection summaries with Excel export.</Text>
        </View>
        <Button title="Refresh" onPress={load} variant="secondary" disabled={loading} />
      </View>

      <Card style={styles.filterCard}>
        <Text style={styles.sectionLabel}>Date range</Text>
        <View style={styles.presetRow}>
          {(['today', 'week', 'month', 'six-month', 'custom'] as RangePreset[]).map(p => (
            <PresetChip key={p} label={presetLabel(p)} selected={preset === p} onPress={() => applyPreset(p)} colors={colors} styles={styles} />
          ))}
        </View>
        {preset === 'custom' && (
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>Start (YYYY-MM-DD)</Text>
              <TextInput style={styles.dateInput} value={startDate} onChangeText={setStartDate} placeholder="2026-01-01" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>End (YYYY-MM-DD)</Text>
              <TextInput style={styles.dateInput} value={endDate} onChangeText={setEndDate} placeholder="2026-12-31" placeholderTextColor={colors.textMuted} />
            </View>
          </View>
        )}
        <Text style={styles.rangeText}>
          {formatDate(startDate)} – {formatDate(endDate)} · {summary.totalShifts} shift{summary.totalShifts === 1 ? '' : 's'}
        </Text>
      </Card>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Loading shift reports…</Text>
        </View>
      ) : summary.totalShifts === 0 ? (
        <Card style={styles.stateCard}>
          <Text style={styles.emptyTitle}>No shifts in range</Text>
          <Text style={styles.stateText}>Choose a wider range or wait for employees to start and finish shifts.</Text>
        </Card>
      ) : (
        <>
          <View style={styles.kpiRow}>
            <Kpi label="Employees" value={String(summary.totalEmployees)} />
            <Kpi label="Shifts" value={String(summary.totalShifts)} />
            <Kpi label="Expected" value={formatCurrency(summary.expectedReturnCash)} emphasis />
            <Kpi label="Actual" value={formatCurrency(summary.actualCashReceived)} emphasis />
            <Kpi label="Difference" value={formatCurrency(summary.totalDifference)} emphasis />
          </View>

          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Shift Status</Text>
            <View style={styles.breakdownRow}>
              <BreakdownItem label="In Progress" value={summary.inProgress} color={colors.info} />
              <BreakdownItem label="Pending" value={summary.pendingReconciliation} color={colors.warning} />
              <BreakdownItem label="Partial" value={summary.partiallyReconciled} color={colors.warning} />
              <BreakdownItem label="Closed" value={summary.closed} color={colors.success} />
            </View>
          </Card>

          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Employee Summary</Text>
            {summary.employees.map(e => (
              <View key={e.employeeId} style={styles.employeeRow}>
                <View style={styles.employeeLeft}>
                  <Text style={styles.employeeName}>{e.employeeName}</Text>
                  <Text style={styles.employeeMeta}>{e.shiftCount} shift{e.shiftCount === 1 ? '' : 's'}</Text>
                </View>
                <View style={styles.employeeRight}>
                  <Text style={styles.employeeAmount}>Exp {formatCurrency(e.expectedReturnCash)}</Text>
                  <Text style={styles.employeeAmount}>Act {formatCurrency(e.actualCashReceived)}</Text>
                  <Badge title={`Diff ${formatCurrency(e.difference)}`} variant={e.difference === 0 ? 'success' : e.difference > 0 ? 'info' : 'error'} />
                </View>
              </View>
            ))}
          </Card>

          <View style={styles.actions}>
            <Button title="Export Excel" onPress={handleExport} loading={exporting} />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const presetLabel = (p: RangePreset) => {
  switch (p) {
    case 'today':
      return 'Today';
    case 'week':
      return '7 Days';
    case 'month':
      return '30 Days';
    case 'six-month':
      return '6 Months';
    case 'custom':
      return 'Custom';
  }
};

const PresetChip = ({ label, selected, onPress, colors, styles }: { label: string; selected: boolean; onPress: () => void; colors: Colors; styles: ReturnType<typeof makeStyles> }) => (
  <Text
    onPress={onPress}
    accessibilityRole="button"
    style={[
      styles.chip,
      {
        backgroundColor: selected ? colors.primary : colors.surfaceSecondary,
        color: selected ? colors.textOnPrimary : colors.textSecondary,
        borderColor: selected ? colors.primary : colors.border,
      },
    ]}
  >
    {label}
  </Text>
);

const Kpi = ({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) => {
  const colors = useColors();
  const styles = makeStyles(colors);
  return (
    <View style={[styles.kpi, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, emphasis && { color: colors.primary }]}>{value}</Text>
    </View>
  );
};

const BreakdownItem = ({ label, value, color }: { label: string; value: number; color: string }) => {
  const colors = useColors();
  const styles = makeStyles(colors);
  return (
    <View style={styles.breakdownItem}>
      <View style={[styles.breakdownDot, { backgroundColor: color }]} />
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={styles.breakdownValue}>{value}</Text>
    </View>
  );
};

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
    minHeight: '100%',
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headingText: {
    flex: 1,
    minWidth: 200,
  },
  title: {
    fontSize: fontSizes.h1,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
    color: colors.textSecondary,
  },
  filterCard: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    fontSize: fontSizes.body,
    fontWeight: '600',
    minHeight: 36,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  dateField: {
    flex: 1,
    minWidth: 140,
  },
  dateLabel: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    minHeight: 44,
  },
  rangeText: {
    fontSize: fontSizes.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  centered: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  stateCard: {
    gap: spacing.md,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: fontSizes.h2,
    fontWeight: '700',
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: fontSizes.body,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  kpi: {
    flex: 1,
    minWidth: 120,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  kpiLabel: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  kpiValue: {
    fontSize: fontSizes.h3,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionCard: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSizes.h3,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.caption,
  },
  breakdownValue: {
    color: colors.textPrimary,
    fontSize: fontSizes.caption,
    fontWeight: '700',
  },
  employeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  employeeLeft: {
    flex: 1,
    minWidth: 140,
  },
  employeeName: {
    fontSize: fontSizes.h3,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  employeeMeta: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
  },
  employeeRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  employeeAmount: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
  },
  actions: {
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
});
