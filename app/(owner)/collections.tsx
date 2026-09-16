import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { CurrencyInput } from '../../components/CurrencyInput';
import { type Colors, fontSizes, lineHeights, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate } from '../../helpers/formatters';
import { listShiftReconciliations, listShiftVisits, listShifts, closeShift, reconcileStore } from '../../services/shifts';
import { listStores } from '../../services/stores';
import { CollectionShift, ShiftReconciliation, Store, Visit } from '../../types';

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

export default function CollectionsScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { ownerId } = useAuth();
  const [shifts, setShifts] = useState<CollectionShift[]>([]);
  const [stores, setStores] = useState<Record<string, Store>>({});
  const [reconciliations, setReconciliations] = useState<Record<string, ShiftReconciliation[]>>({});
  const [visits, setVisits] = useState<Record<string, Visit[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [reconcileActionId, setReconcileActionId] = useState<string | null>(null);
  const [reconcileAmounts, setReconcileAmounts] = useState<Record<string, number | null>>({});
  const [reconcileNotes, setReconcileNotes] = useState<Record<string, string>>({});
  const [reconcileErrors, setReconcileErrors] = useState<Record<string, string | null>>({});

  const loadShifts = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const [shiftData, storeData] = await Promise.all([listShifts(ownerId), listStores(ownerId)]);
      setShifts(shiftData);
      setStores(Object.fromEntries(storeData.map(s => [s.id, s])));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not load collections.');
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  const loadShiftDetails = useCallback(async (shiftId: string) => {
    if (!ownerId) return;
    const [reconData, visitData] = await Promise.all([
      listShiftReconciliations(ownerId, shiftId),
      listShiftVisits(ownerId, shiftId),
    ]);
    setReconciliations(prev => ({ ...prev, [shiftId]: reconData }));
    setVisits(prev => ({ ...prev, [shiftId]: visitData }));
  }, [ownerId]);

  const toggleExpand = async (shift: CollectionShift) => {
    if (expanded === shift.id) {
      setExpanded(null);
      return;
    }
    setExpanded(shift.id);
    if (!reconciliations[shift.id]) {
      try {
        await loadShiftDetails(shift.id);
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Could not load shift details.');
      }
    }
  };

  const getReconcileKey = (shiftId: string, storeId: string) => `${shiftId}:${storeId}`;

  const handleReconcile = async (
    shift: CollectionShift,
    storeId: string,
    expectedReturnCash: number,
    storeVisits: Visit[],
    existingRecon?: ShiftReconciliation
  ) => {
    if (!ownerId) return;
    const key = getReconcileKey(shift.id, storeId);
    const actualCashReceived = Object.prototype.hasOwnProperty.call(reconcileAmounts, key)
      ? reconcileAmounts[key]
      : existingRecon?.actualCashReceived ?? expectedReturnCash;
    const note = (reconcileNotes[key] ?? existingRecon?.reconciliationNote ?? existingRecon?.discrepancyReason ?? '').trim();
    if (actualCashReceived === null || !Number.isFinite(actualCashReceived) || actualCashReceived < 0) {
      setReconcileErrors(prev => ({ ...prev, [key]: 'Enter a valid cash amount.' }));
      return;
    }
    const difference = Math.round((actualCashReceived - expectedReturnCash) * 100) / 100;
    if (difference !== 0 && !note) {
      setReconcileErrors(prev => ({ ...prev, [key]: 'Add a reason when actual cash differs from expected.' }));
      return;
    }
    setReconcileActionId(key);
    setReconcileErrors(prev => ({ ...prev, [key]: null }));
    try {
      await reconcileStore(shift.id, storeId, {
        actualCashReceived,
        discrepancyReason: difference !== 0 ? note : undefined,
        reconciliationNote: note,
        receiptVerified: true,
        lineItems: storeVisits
          .filter(v => v.settlementStatus === 'submitted')
          .flatMap(v => v.machines.map(m => ({
            machineId: m.machineId,
            actualAmount: Math.max(0, Math.round((m.machineNet * (v.vendorPercent / 100)) * 100) / 100),
          }))),
      });
      await Promise.all([loadShifts(), loadShiftDetails(shift.id)]);
      Alert.alert('Store reconciled', 'The shift totals were updated.');
    } catch (e: any) {
      Alert.alert('Could not reconcile store', e.message || 'Check the cash amount and try again.');
    } finally {
      setReconcileActionId(null);
    }
  };

  const handleClose = async (shift: CollectionShift) => {
    setActionId(shift.id);
    try {
      await closeShift(shift.id);
      await loadShifts();
      setExpanded(null);
    } catch (e: any) {
      Alert.alert('Could not close shift', e.message || 'Check that every store is reconciled.');
    } finally {
      setActionId(null);
    }
  };

  const grouped = useMemo(() => {
    const byEmployee: Record<string, CollectionShift[]> = {};
    for (const shift of shifts) {
      if (!byEmployee[shift.employeeId]) byEmployee[shift.employeeId] = [];
      byEmployee[shift.employeeId].push(shift);
    }
    return byEmployee;
  }, [shifts]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.stateText}>Loading collections…</Text>
      </View>
    );
  }

  if (shifts.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Collections</Text>
        <Card style={styles.stateCard}>
          <Text style={styles.emptyTitle}>No shifts yet</Text>
          <Text style={styles.stateText}>Employee shifts will appear here once they are started and finished.</Text>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Collections</Text>
      {Object.entries(grouped).map(([employeeId, employeeShifts]) => (
        <View key={employeeId} style={styles.employeeSection}>
          <Text style={styles.employeeName}>{employeeShifts[0].employeeName || employeeId}</Text>
          {employeeShifts.map(shift => {
            const startedAt = shift.startedAt?.toDate?.();
            const isExpanded = expanded === shift.id;
            const shiftVisits = visits[shift.id] || [];
            const shiftRecons = reconciliations[shift.id] || [];
            const reconsByStore = Object.fromEntries(shiftRecons.map(r => [r.storeId, r]));
            const byStore: Record<string, Visit[]> = {};
            for (const v of shiftVisits) {
              if (!byStore[v.storeId]) byStore[v.storeId] = [];
              byStore[v.storeId].push(v);
            }

            return (
              <Card key={shift.id} style={styles.shiftCard}>
                <View style={styles.shiftHeader}>
                  <View style={styles.shiftHeaderLeft}>
                    <Text style={styles.shiftDate}>
                      {startedAt ? formatDate(startedAt.toISOString().slice(0, 10)) : '—'}
                    </Text>
                    <Badge title={statusLabel[shift.status] ?? shift.status} variant={statusVariant[shift.status] ?? 'muted'} />
                  </View>
                  <View style={styles.shiftTotals}>
                    <Text style={styles.shiftTotal}>Expected {formatCurrency(shift.expectedReturnCash)}</Text>
                    <Text style={styles.shiftTotal}>Actual {formatCurrency(shift.actualCashReceived)}</Text>
                    <Text style={[styles.shiftTotal, { color: shift.difference === 0 ? colors.success : colors.error }]}>
                      Diff {formatCurrency(shift.difference)}
                    </Text>
                  </View>
                </View>

                <View style={styles.shiftActions}>
                  <Button title={isExpanded ? 'Hide Details' : 'View Details'} onPress={() => toggleExpand(shift)} variant="secondary" compact />
                  {shift.status !== 'closed' && (
                    <Button
                      title="Close Shift"
                      onPress={() => handleClose(shift)}
                      loading={actionId === shift.id}
                      variant="primary"
                      compact
                    />
                  )}
                </View>

                {isExpanded && (
                  <View style={styles.detailSection}>
                    {shift.storeIds.length === 0 ? (
                      <Text style={styles.emptyDetail}>No stores assigned to this shift.</Text>
                    ) : (
                      shift.storeIds.map(storeId => {
                        const store = stores[storeId];
                        const recon = reconsByStore[storeId];
                        const storeVisits = byStore[storeId] || [];
                        const submittedTotal = storeVisits
                          .filter(v => v.settlementStatus === 'submitted')
                          .reduce((sum, v) => sum + (v.settlement?.vendorAmount ?? v.vendorAmount), 0);
                        const expectedReturnCash = recon?.expectedReturnCash ?? submittedTotal;
                        const reconcileKey = getReconcileKey(shift.id, storeId);
                        const actualDraft = Object.prototype.hasOwnProperty.call(reconcileAmounts, reconcileKey)
                          ? reconcileAmounts[reconcileKey]
                          : recon?.actualCashReceived ?? expectedReturnCash;
                        const noteDraft = reconcileNotes[reconcileKey] ?? recon?.reconciliationNote ?? recon?.discrepancyReason ?? '';
                        const reconcileError = reconcileErrors[reconcileKey];

                        return (
                          <View key={storeId} style={styles.storeSection}>
                            <View style={styles.storeHeader}>
                              <Text style={styles.storeName}>{store?.name || 'Unknown store'}</Text>
                              {recon ? (
                                <Text style={[styles.storeStatus, { color: recon.status === 'reconciled' ? colors.success : colors.error }]}>
                                  {recon.status === 'reconciled' ? 'Reconciled' : 'Discrepancy'}
                                </Text>
                              ) : (
                                <Text style={[styles.storeStatus, { color: colors.warning }]}>Pending</Text>
                              )}
                            </View>

                            <View style={styles.storeRow}>
                              <Text style={styles.storeMeta}>Expected: {formatCurrency(expectedReturnCash)}</Text>
                              {recon ? (
                                <>
                                  <Text style={styles.storeMeta}>Actual: {formatCurrency(recon.actualCashReceived)}</Text>
                                  <Text style={[styles.storeMeta, { color: recon.difference === 0 ? colors.success : colors.error }]}>
                                    Diff: {formatCurrency(recon.difference)}
                                  </Text>
                                </>
                              ) : null}
                            </View>

                            {storeVisits.length > 0 && (
                              <View style={styles.machineList}>
                                {storeVisits.map(v =>
                                  v.machines.map(m => (
                                    <View key={`${v.id}:${m.machineId}`} style={styles.machineRow}>
                                      <Text style={styles.machineName}>{m.machineNumber} · {m.name || 'Unnamed'}</Text>
                                      <Text style={styles.machineAmount}>
                                        IN {formatCurrency(m.presentIn)} · OUT {formatCurrency(m.presentOut)} · Net {formatCurrency(m.machineNet)}
                                      </Text>
                                    </View>
                                  ))
                                )}
                              </View>
                            )}

                            {recon?.lineItems && recon.lineItems.length > 0 && (
                              <View style={styles.machineList}>
                                {recon.lineItems.map(item => (
                                  <View key={item.machineId} style={styles.machineRow}>
                                    <Text style={styles.machineName}>{item.machineNumber || item.machineId}</Text>
                                    <Text style={styles.machineAmount}>
                                      Exp {formatCurrency(item.expectedAmount)} · Act {formatCurrency(item.actualAmount)} · {item.status}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            )}

                            {recon?.reconciliationNote ? (
                              <Text style={styles.note}>Note: {recon.reconciliationNote}</Text>
                            ) : null}
                            {recon?.receiptVerified && (
                              <Text style={styles.note}>Receipt verified</Text>
                            )}

                            {shift.status !== 'closed' && (
                              <View style={styles.reconcileBox}>
                                <CurrencyInput
                                  label="Actual cash received"
                                  value={actualDraft}
                                  onChangeValue={value => {
                                    setReconcileAmounts(prev => ({ ...prev, [reconcileKey]: value }));
                                    setReconcileErrors(prev => ({ ...prev, [reconcileKey]: null }));
                                  }}
                                  error={reconcileError}
                                  helperText={`Expected ${formatCurrency(expectedReturnCash)}`}
                                />
                                <TextInput
                                  value={noteDraft}
                                  onChangeText={value => {
                                    setReconcileNotes(prev => ({ ...prev, [reconcileKey]: value }));
                                    setReconcileErrors(prev => ({ ...prev, [reconcileKey]: null }));
                                  }}
                                  placeholder="Reason or note"
                                  placeholderTextColor={colors.textMuted}
                                  multiline
                                  style={styles.noteInput}
                                />
                                <Button
                                  title={recon ? 'Update Reconciliation' : 'Reconcile Store'}
                                  onPress={() => handleReconcile(shift, storeId, expectedReturnCash, storeVisits, recon)}
                                  loading={reconcileActionId === reconcileKey}
                                  disabled={reconcileActionId === reconcileKey}
                                  compact
                                />
                              </View>
                            )}
                          </View>
                        );
                      })
                    )}
                  </View>
                )}
              </Card>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

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
  employeeSection: {
    marginBottom: spacing.lg,
  },
  employeeName: {
    fontSize: fontSizes.h2,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  shiftCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  shiftHeaderLeft: {
    gap: spacing.xs,
  },
  shiftDate: {
    fontSize: fontSizes.h3,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  shiftTotals: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  shiftTotal: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
  },
  shiftActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  detailSection: {
    marginTop: spacing.md,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  emptyDetail: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
  },
  storeSection: {
    gap: spacing.xs,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storeName: {
    fontSize: fontSizes.h3,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  storeStatus: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
  },
  storeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  storeMeta: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
  },
  machineList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  machineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  machineName: {
    color: colors.textSecondary,
    fontSize: fontSizes.caption,
  },
  machineAmount: {
    color: colors.textSecondary,
    fontSize: fontSizes.caption,
  },
  note: {
    color: colors.textMuted,
    fontSize: fontSizes.caption,
    marginTop: spacing.xs,
  },
  reconcileBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceSecondary,
  },
  noteInput: {
    minHeight: 72,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    fontSize: fontSizes.body,
    textAlignVertical: 'top',
  },
});
