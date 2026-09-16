import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { type Colors, fontSizes, lineHeights, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../helpers/formatters';
import { getActiveShift, getShift, startShift, finishShift, listShiftVisits } from '../../services/shifts';
import { CollectionShift, Visit } from '../../types';

const statusLabel: Record<string, string> = {
  in_progress: 'In Progress',
  returning: 'Returning',
  pending_reconciliation: 'Pending Reconciliation',
  partially_reconciled: 'Partially Reconciled',
  closed: 'Closed',
};

const statusVariant: Record<string, 'muted' | 'success' | 'warning' | 'error' | 'info'> = {
  in_progress: 'info',
  returning: 'info',
  pending_reconciliation: 'warning',
  partially_reconciled: 'warning',
  closed: 'success',
};

export default function EmployeeActivityScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { ownerId } = useAuth();
  const [shift, setShift] = useState<CollectionShift | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [duration, setDuration] = useState('—');

  useEffect(() => {
    const startedAt = shift?.startedAt?.toDate?.();
    if (!startedAt) {
      setDuration('—');
      return;
    }
    const tick = () => {
      const diff = Date.now() - startedAt.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setDuration(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [shift?.startedAt]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const active = await getActiveShift();
      setShift(active);
      if (active) {
        const shiftVisits = await listShiftVisits(active.ownerId, active.id);
        setVisits(shiftVisits);
      } else {
        setVisits([]);
      }
    } catch (e: any) {
      const message = e.message || 'Could not load shift.';
      console.error('Employee Activity: load failed', { error: message });
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleStart = async () => {
    if (!ownerId) return;
    setActionLoading(true);
    try {
      const { shiftId } = await startShift(ownerId);
      const newShift = await getShift(ownerId, shiftId);
      setShift(newShift);
      setVisits(newShift ? await listShiftVisits(newShift.ownerId, newShift.id) : []);
    } catch (e: any) {
      Alert.alert('Could not start shift', e.message || 'Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinish = async () => {
    if (!shift) return;
    setActionLoading(true);
    try {
      await finishShift(shift.id);
      await load();
    } catch (e: any) {
      Alert.alert('Could not finish shift', e.message || 'Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Loading shift…</Text>
        </View>
      );
    }

    if (error) {
      return (
        <ScrollView contentContainerStyle={styles.container}>
          <Card style={styles.stateCard}>
            <Text style={styles.emptyTitle}>Shift unavailable</Text>
            <Text style={styles.stateText}>{error}</Text>
            <Button title="Try Again" onPress={load} variant="secondary" compact />
          </Card>
        </ScrollView>
      );
    }

    if (!shift) {
      return (
        <Card style={styles.stateCard}>
          <Text style={styles.emptyTitle}>No active shift</Text>
          <Text style={styles.stateText}>Start a shift before running visits so your collections are grouped correctly.</Text>
          <Button title="Start Shift" onPress={handleStart} loading={actionLoading} />
        </Card>
      );
    }

    const startedAt = shift.startedAt?.toDate?.();
    const canFinish = ['in_progress', 'returning'].includes(shift.status);

    return (
      <>
        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.summaryTitle}>Current Shift</Text>
              {startedAt && (
                <View style={styles.clockRow}>
                  <Text style={styles.clockLabel}>Clocked in:</Text>
                  <Text style={styles.clockValue}>{startedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              )}
              <View style={styles.clockRow}>
                <Text style={styles.clockLabel}>Duration:</Text>
                <Text style={styles.clockValue}>{duration}</Text>
              </View>
            </View>
            <Badge title={statusLabel[shift.status] ?? shift.status} variant={statusVariant[shift.status] ?? 'default'} />
          </View>

          <View style={styles.kpiRow}>
            <Kpi label="Stores" value={String(shift.visitedStoreIds?.length || 0)} />
            <Kpi label="Machines" value={String(shift.machinesServiced || 0)} />
            <Kpi label="Gross Collected" value={formatCurrency(shift.grossCollected)} emphasis />
            <Kpi label="Expected Cash to Return" value={formatCurrency(shift.expectedReturnCash)} emphasis />
          </View>

          {shift.actualCashReceived > 0 && (
            <View style={styles.reconciliationRow}>
              <Text style={styles.reconciliationText}>
                Actual received: <Text style={{ fontWeight: '700' }}>{formatCurrency(shift.actualCashReceived)}</Text>
              </Text>
              <Text style={styles.reconciliationText}>
                Difference: <Text style={{ fontWeight: '700', color: shift.difference === 0 ? colors.success : colors.error }}>
                  {formatCurrency(shift.difference)}
                </Text>
              </Text>
            </View>
          )}

          {canFinish ? (
            <Button
              title="Finish Route"
              onPress={handleFinish}
              loading={actionLoading}
              variant="primary"
            />
          ) : (
            <View style={styles.waitingBox}>
              <Text style={styles.waitingText}>Waiting for admin reconciliation.</Text>
              <Text style={styles.waitingSubtext}>You cannot start a new shift until this one is closed.</Text>
            </View>
          )}
        </Card>

        <Text style={styles.sectionTitle}>Shift Visits</Text>
        {visits.length === 0 ? (
          <Text style={styles.emptyList}>No visits recorded yet. Go to Stores to run a visit.</Text>
        ) : (
          visits.map(visit => {
            const ts = visit.timestamp?.toDate?.();
            return (
              <Card key={visit.id} style={styles.visitCard}>
                <View style={styles.visitRow}>
                  <View style={styles.visitLeft}>
                    <Text style={styles.visitStore}>{visit.storeName}</Text>
                    <Text style={styles.visitMeta}>
                      {visit.businessDate} {ts ? `· ${ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </Text>
                  </View>
                  <View style={styles.visitRight}>
                    <Text style={styles.visitNet}>{formatCurrency(visit.totalNet)}</Text>
                    <Badge
                      title={visit.settlementStatus === 'submitted' ? 'Submitted' : 'Not submitted'}
                      variant={visit.settlementStatus === 'submitted' ? 'success' : 'warning'}
                    />
                  </View>
                </View>
                {visit.machines.length > 0 && (
                  <View style={styles.machines}>
                    {visit.machines.map(m => (
                      <View key={m.machineId} style={styles.machineRow}>
                        <Text style={styles.machineLabel}>{m.machineNumber} · {m.name || 'Unnamed'}</Text>
                        <Text style={styles.machineValue}>IN {formatCurrency(m.presentIn)} · OUT {formatCurrency(m.presentOut)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            );
          })
        )}
      </>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>My Activity</Text>
      {renderContent()}
    </ScrollView>
  );
}

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

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
    minHeight: '100%',
  },
  title: {
    fontSize: fontSizes.h1,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  centered: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  stateCard: {
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  emptyTitle: {
    fontSize: fontSizes.h2,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
  },
  startButton: {
    marginTop: spacing.sm,
  },
  summaryCard: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryTitle: {
    fontSize: fontSizes.h2,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryDate: {
    color: colors.textSecondary,
    fontSize: fontSizes.caption,
  },
  clockRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  clockLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.caption,
  },
  clockValue: {
    color: colors.textPrimary,
    fontSize: fontSizes.caption,
    fontWeight: '600',
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
  reconciliationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  reconciliationText: {
    color: colors.textSecondary,
    fontSize: fontSizes.body,
  },
  finishButton: {
    marginTop: spacing.sm,
  },
  waitingBox: {
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
  },
  waitingText: {
    color: colors.textPrimary,
    fontSize: fontSizes.h3,
    fontWeight: '600',
  },
  waitingSubtext: {
    color: colors.textSecondary,
    fontSize: fontSizes.caption,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSizes.h3,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  emptyList: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
  },
  visitCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  visitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  visitLeft: {
    flex: 1,
    minWidth: 180,
  },
  visitStore: {
    fontSize: fontSizes.h3,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  visitMeta: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
  },
  visitRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  visitNet: {
    fontSize: fontSizes.h2,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  machines: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  machineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  machineLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.caption,
  },
  machineValue: {
    color: colors.textSecondary,
    fontSize: fontSizes.caption,
  },
});
