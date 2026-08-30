import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { type Colors, fontSizes, lineHeights, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate, formatTime } from '../../helpers/formatters';
import { listVisits } from '../../services/visits';
import { Visit } from '../../types';

export default function HistoryScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { ownerId } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchVisits = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    setError('');
    try {
      setVisits(await listVisits(ownerId));
    } catch (e: any) {
      setError(e.message || 'Unable to load visit history.');
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.headingText}>
          <Text style={styles.title}>Visit history</Text>
          <Text style={styles.subtitle}>Review recorded runs, print status, and settlements.</Text>
        </View>
        <Button title="Refresh" onPress={fetchVisits} variant="secondary" disabled={loading} compact />
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Loading visits…</Text>
        </View>
      ) : error ? (
        <Card style={styles.stateCard}>
          <Text style={styles.errorTitle}>History unavailable</Text>
          <Text style={styles.stateText}>{error}</Text>
          <Button title="Try Again" onPress={fetchVisits} />
        </Card>
      ) : visits.length === 0 ? (
        <Card style={styles.stateCard}>
          <Text style={styles.emptyTitle}>No visits yet</Text>
          <Text style={styles.stateText}>Completed RUN actions will appear here.</Text>
        </Card>
      ) : (
        visits.map(visit => {
          const timestamp = visit.timestamp?.toDate?.();
          const resultLabel = visit.result === 'positive' ? 'Positive' : visit.result === 'negative' ? 'Negative' : 'Zero';
          const resultColor = visit.result === 'positive' ? colors.success : visit.result === 'negative' ? colors.error : colors.textMuted;

          return (
            <Card key={visit.id} style={styles.visitCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.storeName}>{visit.storeName}</Text>
                  <Text style={styles.meta}>
                    {timestamp ? `${formatDate(timestamp)} at ${formatTime(timestamp)}` : visit.businessDate}
                  </Text>
                  <Text style={styles.meta}>Employee: {visit.employeeName}</Text>
                </View>
                <View style={[styles.resultBadge, { borderColor: resultColor }]}>
                  <Text style={[styles.resultText, { color: resultColor }]}>{resultLabel}</Text>
                </View>
              </View>

              <View style={styles.metrics}>
                <Metric label="Machines" value={String(visit.machines.length)} />
                <Metric label="New IN" value={formatCurrency(visit.totalNewIn)} />
                <Metric label="New OUT" value={formatCurrency(visit.totalNewOut)} />
                <Metric label="Total Net" value={formatCurrency(visit.totalNet)} emphasis />
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>
                  Settlement: <Text style={styles.statusValue}>{visit.settlementStatus === 'submitted' ? 'Submitted' : 'Not submitted'}</Text>
                </Text>
                <Text style={styles.statusLabel}>
                  Receipt: <Text style={styles.statusValue}>{visit.printStatus === 'printed' ? 'Printed' : 'Not printed'}</Text>
                </Text>
              </View>

              <Text style={styles.splitText}>
                Store {visit.storePercent}%: {formatCurrency(visit.storeAmount)} · Games {visit.vendorPercent}%: {formatCurrency(visit.vendorAmount)}
              </Text>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const Metric = ({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) => { const colors = useColors(); const styles = makeStyles(colors); return (
  <View style={styles.metric}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={[styles.metricValue, emphasis && styles.metricEmphasis]}>{value}</Text>
  </View>
); };

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
    marginBottom: spacing.xl,
  },
  headingText: {
    flex: 1,
    minWidth: 220,
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
  visitCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  cardHeaderText: {
    flex: 1,
  },
  storeName: {
    fontSize: fontSizes.h2,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  meta: {
    marginTop: spacing.xs,
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
  },
  resultBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  resultText: {
    fontSize: fontSizes.caption,
    fontWeight: '700',
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  metric: {
    minWidth: 120,
    flex: 1,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.surfaceSecondary,
  },
  metricLabel: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
  },
  metricValue: {
    marginTop: spacing.xs,
    fontSize: fontSizes.h3,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  metricEmphasis: {
    color: colors.primary,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusLabel: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
  },
  statusValue: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  splitText: {
    marginTop: spacing.md,
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
  },
});
