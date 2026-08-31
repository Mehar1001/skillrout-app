import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { type Colors, fontSizes, lineHeights, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate, formatTime } from '../../helpers/formatters';
import { buildReportSummary, generateReportHtml, type ReportSummary } from '../../helpers/reportTemplate';
import { listVisits } from '../../services/visits';
import { Visit } from '../../types';
import { VisitAdjustmentModal } from '../../components/VisitAdjustmentModal';

const todayIso = () => new Date().toISOString().slice(0, 10);
const daysAgoIso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

type RangePreset = '7' | '30' | '90' | 'custom';

export default function ReportsScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { ownerId, businessName } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preset, setPreset] = useState<RangePreset>('30');
  const [startDate, setStartDate] = useState(daysAgoIso(30));
  const [endDate, setEndDate] = useState(todayIso());
  const [generating, setGenerating] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);

  const fetchVisits = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    setError('');
    try {
      setVisits(await listVisits(ownerId, 500));
    } catch (e: any) {
      setError(e.message || 'Unable to load visits for report.');
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  const applyPreset = (next: RangePreset) => {
    setPreset(next);
    if (next === '7') {
      setStartDate(daysAgoIso(7));
      setEndDate(todayIso());
    } else if (next === '30') {
      setStartDate(daysAgoIso(30));
      setEndDate(todayIso());
    } else if (next === '90') {
      setStartDate(daysAgoIso(90));
      setEndDate(todayIso());
    }
  };

  const filteredVisits = useMemo(() => {
    return visits.filter(visit => {
      const visitDate = visit.businessDate;
      return visitDate >= startDate && visitDate <= endDate;
    });
  }, [visits, startDate, endDate]);

  const summary: ReportSummary = useMemo(() => buildReportSummary(filteredVisits), [filteredVisits]);

  const handlePrint = async () => {
    if (filteredVisits.length === 0) {
      Alert.alert('No data', 'There are no visits in the selected range to print.');
      return;
    }
    setGenerating(true);
    try {
      const html = generateReportHtml(summary, startDate, endDate, businessName ?? undefined);
      await Print.printAsync({ html });
    } catch (e: any) {
      Alert.alert('Print Error', e.message || 'Report could not be printed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    if (filteredVisits.length === 0) {
      Alert.alert('No data', 'There are no visits in the selected range to share.');
      return;
    }
    setGenerating(true);
    try {
      const html = generateReportHtml(summary, startDate, endDate, businessName ?? undefined);
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
        return;
      }
      const fileUri = `${FileSystem.cacheDirectory}skillrout-report-${startDate}-to-${endDate}.html`;
      await FileSystem.writeAsStringAsync(fileUri, html, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/html',
          dialogTitle: 'Skillrout Report',
          UTI: 'public.html',
        });
      } else {
        Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
      }
    } catch (e: any) {
      Alert.alert('Report Error', e.message || 'Report could not be generated.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={styles.screen}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.headingText}>
          <Text style={styles.title}>Reports</Text>
          <Text style={styles.subtitle}>Store, machine, visit, and settlement summaries.</Text>
        </View>
        <Button title="Refresh" onPress={fetchVisits} variant="secondary" disabled={loading} />
      </View>

      <Card style={styles.filterCard}>
        <Text style={styles.sectionLabel}>Date range</Text>
        <View style={styles.presetRow}>
          {(['7', '30', '90', 'custom'] as RangePreset[]).map(p => (
            <PresetChip
              key={p}
              label={p === 'custom' ? 'Custom' : `${p}d`}
              selected={preset === p}
              onPress={() => applyPreset(p)}
            />
          ))}
        </View>
        {preset === 'custom' && (
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>Start (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.dateInput}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="2026-01-01"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>End (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.dateInput}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="2026-12-31"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>
        )}
        <Text style={styles.rangeText}>
          {formatDate(startDate)} – {formatDate(endDate)} · {filteredVisits.length} visit{filteredVisits.length === 1 ? '' : 's'}
        </Text>
      </Card>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Loading visits…</Text>
        </View>
      ) : error ? (
        <Card style={styles.stateCard}>
          <Text style={styles.errorTitle}>Report unavailable</Text>
          <Text style={styles.stateText}>{error}</Text>
          <Button title="Try Again" onPress={fetchVisits} />
        </Card>
      ) : filteredVisits.length === 0 ? (
        <Card style={styles.stateCard}>
          <Text style={styles.emptyTitle}>No visits in range</Text>
          <Text style={styles.stateText}>Choose a wider date range or complete more RUN actions.</Text>
        </Card>
      ) : (
        <>
          <View style={styles.kpiRow}>
            <Kpi label="Visits" value={String(summary.totalVisits)} />
            <Kpi label="Total Net" value={formatCurrency(summary.totalNet)} emphasis />
            <Kpi label="Store $" value={formatCurrency(summary.totalStoreAmount)} />
            <Kpi label="Games $" value={formatCurrency(summary.totalVendorAmount)} />
          </View>

          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Settlement Breakdown</Text>
            <View style={styles.breakdownRow}>
              <BreakdownItem label="Submitted" value={summary.settlementTotals.submittedCount} color={colors.success} />
              <BreakdownItem label="Not submitted" value={summary.settlementTotals.notSubmittedCount} color={colors.warning} />
              <BreakdownItem label="Printed" value={summary.settlementTotals.printedCount} color={colors.info} />
              <BreakdownItem label="Not printed" value={summary.settlementTotals.notPrintedCount} color={colors.textMuted} />
              <BreakdownItem label="Positive" value={summary.settlementTotals.positiveCount} color={colors.success} />
              <BreakdownItem label="Negative" value={summary.settlementTotals.negativeCount} color={colors.error} />
            </View>
          </Card>

          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Store Summary</Text>
            {summary.storeSummaries.map(s => (
              <View key={s.storeId} style={styles.summaryRow}>
                <View style={styles.summaryLeft}>
                  <Text style={styles.summaryName}>{s.storeName}</Text>
                  <Text style={styles.summaryMeta}>{s.visitCount} visit{s.visitCount === 1 ? '' : 's'}</Text>
                </View>
                <View style={styles.summaryRight}>
                  <Text style={styles.summaryNet}>{formatCurrency(s.totalNet)}</Text>
                  <Text style={styles.summaryMeta}>Store {formatCurrency(s.storeAmount)} · Games {formatCurrency(s.vendorAmount)}</Text>
                </View>
              </View>
            ))}
          </Card>

          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Machine Summary</Text>
            {summary.machineSummaries.slice(0, 20).map(m => (
              <View key={`${m.storeId}:${m.machineId}`} style={styles.summaryRow}>
                <View style={styles.summaryLeft}>
                  <Text style={styles.summaryName}>{m.machineNumber} · {m.machineName}</Text>
                  <Text style={styles.summaryMeta}>{m.storeName} · {m.visitCount} visit{m.visitCount === 1 ? '' : 's'}</Text>
                </View>
                <View style={styles.summaryRight}>
                  <Text style={styles.summaryNet}>{formatCurrency(m.totalNet)}</Text>
                  <Text style={styles.summaryMeta}>IN {formatCurrency(m.totalNewIn)} · OUT {formatCurrency(m.totalNewOut)}</Text>
                </View>
              </View>
            ))}
            {summary.machineSummaries.length > 20 && (
              <Text style={styles.moreText}>+{summary.machineSummaries.length - 20} more machines in the PDF.</Text>
            )}
          </Card>

          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Recent Visits</Text>
            {filteredVisits.map(visit => {
              const expanded = expandedVisitId === visit.id;
              const ts = visit.timestamp?.toDate?.();
              return (
                <View key={visit.id} style={[styles.summaryRow, { flexWrap: 'wrap' }]}>
                  <View style={{ flex: 1, minWidth: 180 }}>
                    <Text style={styles.summaryName}>{visit.storeName}</Text>
                    <Text style={styles.summaryMeta}>
                      {visit.businessDate} {ts ? `at ${formatTime(ts)}` : ''} · {visit.employeeName}
                    </Text>
                  </View>
                  <View style={[styles.summaryRight, { flex: 1, minWidth: 140 }]}>
                    <Text style={styles.summaryNet}>{formatCurrency(visit.totalNet)}</Text>
                    <Text style={styles.summaryMeta}>{visit.settlementStatus === 'submitted' ? 'Submitted' : 'Not submitted'}</Text>
                    <View style={styles.rowActions}>
                      <Button
                        title={expanded ? 'Hide' : 'View'}
                        onPress={() => setExpandedVisitId(expanded ? null : visit.id)}
                        variant={expanded ? 'primary' : 'secondary'}
                        compact
                      />
                      <Button title="Adjust" onPress={() => setSelectedVisit(visit)} variant="secondary" compact />
                    </View>
                  </View>
                  {expanded ? (
                    <View style={styles.visitDetails}>
                      {visit.machines.map((m, i) => (
                        <View key={m.machineId} style={styles.detailRow}>
                          <Text style={styles.detailLabel}>{i + 1}. #{m.machineNumber} {m.name}</Text>
                          <Text style={styles.detailValue}>
                            IN {formatCurrency(m.presentIn)} · OUT {formatCurrency(m.presentOut)} · Net {formatCurrency(m.machineNet)}
                          </Text>
                        </View>
                      ))}
                      <View style={[styles.detailRow, styles.detailSection]}>
                        <Text style={styles.detailLabel}>Split</Text>
                        <Text style={styles.detailValue}>Store {visit.storePercent}% · Games {visit.vendorPercent}%</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Payouts</Text>
                        <Text style={styles.detailValue}>
                          Store {formatCurrency(visit.storeAmount)} · Games {formatCurrency(visit.vendorAmount)}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </Card>
        </>
      )}

      {!loading && !error && filteredVisits.length > 0 && (
        <View style={styles.actions}>
          <Button title="Print Report" onPress={handlePrint} loading={generating} />
          <Button title="Share / Save PDF" onPress={handleShare} variant="accent" loading={generating} />
        </View>
      )}
    </ScrollView>
    {selectedVisit ? (
      <VisitAdjustmentModal
        visit={selectedVisit}
        onClose={() => setSelectedVisit(null)}
        onAdjusted={() => {
          setSelectedVisit(null);
          fetchVisits();
        }}
      />
    ) : null}
    </View>
  );
}

const PresetChip = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => {
  const colors = useColors();
  const styles = makeStyles(colors);
  return (
    <PressableChip selected={selected} onPress={onPress} label={label} colors={colors} styles={styles} />
  );
};

const PressableChip = ({ selected, onPress, label, colors, styles }: { selected: boolean; onPress: () => void; label: string; colors: Colors; styles: ReturnType<typeof makeStyles> }) => (
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
      <Text style={[styles.kpiValue, emphasis && { color: colors.accent }]}>{value}</Text>
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
  screen: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
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
  centerState: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  stateCard: {
    gap: spacing.md,
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: fontSizes.body,
  },
  errorTitle: {
    color: colors.error,
    fontSize: fontSizes.h2,
    fontWeight: '700',
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: fontSizes.h2,
    fontWeight: '700',
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
    borderRadius: 10,
    borderWidth: 1,
  },
  kpiLabel: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  kpiValue: {
    marginTop: spacing.xs,
    fontSize: fontSizes.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  sectionCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSizes.h2,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  breakdownRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xs,
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
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
  },
  breakdownValue: {
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  summaryLeft: {
    flex: 1,
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  summaryName: {
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  summaryMeta: {
    marginTop: 2,
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  summaryNet: {
    fontSize: fontSizes.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  moreText: {
    marginTop: spacing.sm,
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  rowActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  visitDetails: {
    width: '100%',
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 13,
    backgroundColor: colors.surfaceSecondary,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  detailSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    flexShrink: 0,
  },
  detailValue: {
    fontSize: fontSizes.caption,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
  },

  actions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
