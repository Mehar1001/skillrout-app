import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { CurrencyInput } from '../../components/CurrencyInput';
import { type Colors, fontSizes, lineHeights, radii, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate } from '../../helpers/formatters';
import { listShiftReconciliations, listShiftVisits, listShifts, closeShift, reconcileStore } from '../../services/shifts';
import { listStores } from '../../services/stores';
import { CollectionShift, ShiftReconciliation, Store, Visit } from '../../types';

const roundCurrency = (value: number | null | undefined) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : null;
};

const getShiftStatus = (
  status: string,
  allStoreCashSaved: boolean
): { label: string; variant: 'muted' | 'success' | 'warning' | 'error' | 'info' } => {
  if (status === 'closed') return { label: 'Closed', variant: 'success' };
  if (status === 'in_progress') return { label: 'In Progress', variant: 'info' };
  if (status === 'returning') return { label: 'Returning', variant: 'info' };
  if (allStoreCashSaved) return { label: 'Ready to Close', variant: 'success' };
  return { label: 'Needs Cash', variant: 'warning' };
};

const getStoreCashStatus = (
  recon: ShiftReconciliation | undefined,
  expectedReturnCash: number
): { label: string; colorType: 'success' | 'warning' | 'error' | 'muted' } => {
  if (!recon) return { label: expectedReturnCash === 0 ? 'No Cash Due' : 'Needs Cash', colorType: expectedReturnCash === 0 ? 'muted' : 'warning' };
  if (recon.difference === 0 && expectedReturnCash === 0 && recon.actualCashReceived === 0) return { label: 'No Cash Due', colorType: 'muted' };
  if (recon.difference === 0) return { label: 'Received', colorType: 'success' };
  if (recon.difference < 0) return { label: 'Partial', colorType: 'warning' };
  return { label: 'Extra Cash', colorType: 'warning' };
};

const isGenericNote = (note: string) => ['received', 'no cash due', 'saved'].includes(note.trim().toLowerCase());

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
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmingCloseShiftId, setConfirmingCloseShiftId] = useState<string | null>(null);
  const [closedShiftIds, setClosedShiftIds] = useState<Record<string, boolean>>({});
  const [reconcileActionId, setReconcileActionId] = useState<string | null>(null);
  const [reconcileAmounts, setReconcileAmounts] = useState<Record<string, number | null>>({});
  const [reconcileNotes, setReconcileNotes] = useState<Record<string, string>>({});
  const [reconcileErrors, setReconcileErrors] = useState<Record<string, string | null>>({});
  const [reconcileSuccess, setReconcileSuccess] = useState<Record<string, string>>({});
  const [closeErrors, setCloseErrors] = useState<Record<string, string>>({});

  const loadShifts = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    setError('');
    try {
      const [shiftData, storeData] = await Promise.all([listShifts(ownerId), listStores(ownerId)]);
      setShifts(shiftData);
      setStores(Object.fromEntries(storeData.map(s => [s.id, s])));
    } catch (e: any) {
      const message = e.message || 'Could not load collections.';
      console.error('Collections: loadShifts failed', { ownerId, error: message });
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  useFocusEffect(
    useCallback(() => {
      loadShifts();
    }, [loadShifts])
  );

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
      setReconcileErrors(prev => ({ ...prev, [key]: 'Add a short note for partial or extra cash.' }));
      setReconcileSuccess(prev => ({ ...prev, [key]: '' }));
      return;
    }
    setReconcileActionId(key);
    setReconcileErrors(prev => ({ ...prev, [key]: null }));
    setReconcileSuccess(prev => ({ ...prev, [key]: '' }));
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
      setReconcileSuccess(prev => ({
        ...prev,
        [key]: difference === 0
          ? actualCashReceived === 0 && expectedReturnCash === 0
            ? 'No cash due marked.'
            : 'Cash marked received.'
          : difference < 0
            ? `Partial cash saved: ${formatCurrency(actualCashReceived)} received.`
            : `Extra cash saved: ${formatCurrency(difference)} over expected.`,
      }));
    } catch (e: any) {
      const message = e.message || 'Check the cash amount and try again.';
      setReconcileErrors(prev => ({ ...prev, [key]: `Could not save cash: ${message}` }));
    } finally {
      setReconcileActionId(null);
    }
  };

  const handleClose = async (shift: CollectionShift) => {
    setActionId(shift.id);
    setCloseErrors(prev => ({ ...prev, [shift.id]: '' }));
    try {
      await closeShift(shift.id);
      setClosedShiftIds(prev => ({ ...prev, [shift.id]: true }));
      await loadShifts();
      setExpanded(null);
    } catch (e: any) {
      const message = e.message || 'Check that every store cash amount is saved.';
      setCloseErrors(prev => ({ ...prev, [shift.id]: `Could not close shift: ${message}` }));
    } finally {
      setActionId(null);
      setConfirmingCloseShiftId(null);
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
          <Text style={styles.emptyTitle}>{error ? 'Collections unavailable' : 'No shifts yet'}</Text>
          <Text style={styles.stateText}>
            {error || 'Employee shifts will appear here once they are started and finished.'}
          </Text>
          {error ? (
            <Button title="Try Again" onPress={loadShifts} variant="secondary" compact />
          ) : null}
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
            const pendingStoreIds = shift.storeIds.filter(s => !reconsByStore[s] || reconsByStore[s].status === 'pending');
            const allStoreCashSaved = pendingStoreIds.length === 0;
            const shiftStatus = getShiftStatus(shift.status, allStoreCashSaved);
            const pendingStoreNames = pendingStoreIds.map(storeId => stores[storeId]?.name || 'Unknown store');
            const closeHelpText = !isExpanded
              ? 'Open details to review store cash before closing.'
              : pendingStoreNames.length > 0
                ? `Mark cash for ${pendingStoreNames.join(', ')} before closing this shift.`
                : 'Cash is checked. You can close this shift.';
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
                    <Badge title={shiftStatus.label} variant={shiftStatus.variant} />
                  </View>
                  <View style={styles.shiftTotals}>
                    <Text style={styles.shiftTotal}>Expected {formatCurrency(shift.expectedReturnCash)}</Text>
                    <Text style={styles.shiftTotal}>Received {formatCurrency(shift.actualCashReceived)}</Text>
                    <Text style={[styles.shiftTotal, { color: shift.difference === 0 ? colors.success : colors.error }]}>
                      Diff {formatCurrency(shift.difference)}
                    </Text>
                  </View>
                </View>

                <View style={styles.shiftActions}>
                  <Button title={isExpanded ? 'Hide Details' : 'View Details'} onPress={() => toggleExpand(shift)} variant="secondary" compact />
                  {shift.status !== 'closed' && !closedShiftIds[shift.id] && (
                    <Button
                      title="Close Shift"
                      onPress={() => setConfirmingCloseShiftId(shift.id)}
                      loading={actionId === shift.id}
                      disabled={!isExpanded || !allStoreCashSaved}
                      variant="primary"
                      compact
                    />
                  )}
                </View>
                {shift.status !== 'closed' && !closedShiftIds[shift.id] ? (
                  <Text style={allStoreCashSaved && isExpanded ? styles.actionSuccess : styles.actionProgress}>{closeHelpText}</Text>
                ) : null}
                {closeErrors[shift.id] ? (
                  <Text style={styles.closeError}>{closeErrors[shift.id]}</Text>
                ) : null}
                {closedShiftIds[shift.id] ? (
                  <Text style={styles.closeSuccess}>Shift closed successfully. Employee is cleared to start a new shift.</Text>
                ) : null}

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
                        const reconcileSuccessMessage = reconcileSuccess[reconcileKey];
                        const savedNote = (recon?.reconciliationNote ?? recon?.discrepancyReason ?? '').trim();
                        const draftNote = noteDraft.trim();
                        const savedAmount = roundCurrency(recon?.actualCashReceived);
                        const draftAmount = roundCurrency(actualDraft);
                        const hasReconcileChanges = !recon || savedAmount !== draftAmount || savedNote !== draftNote;
                        const isSavingCash = reconcileActionId === reconcileKey;
                        const liveDifference = roundCurrency((actualDraft ?? 0) - expectedReturnCash) ?? 0;
                        const isZeroCashStore = expectedReturnCash === 0 && (recon?.actualCashReceived ?? actualDraft ?? 0) === 0;
                        const storeCashStatus = getStoreCashStatus(recon, expectedReturnCash);
                        const storeStatusColor = storeCashStatus.colorType === 'success'
                          ? colors.success
                          : storeCashStatus.colorType === 'error'
                            ? colors.error
                            : storeCashStatus.colorType === 'warning'
                              ? colors.warning
                              : colors.textMuted;
                        const reconcileButtonTitle = recon
                          ? 'Update Amount'
                          : expectedReturnCash === 0
                            ? 'Mark No Cash Due'
                            : 'Mark Received';
                        const visibleLineItems = (recon?.lineItems || []).filter(item =>
                          item.expectedAmount !== 0 || item.actualAmount !== 0 || item.difference !== 0
                        );

                        return (
                          <View key={storeId} style={styles.storeSection}>
                            <View style={styles.storeHeader}>
                              <Text style={styles.storeName}>{store?.name || 'Unknown store'}</Text>
                              <Text style={[styles.storeStatus, { color: storeStatusColor }]}>{storeCashStatus.label}</Text>
                            </View>

                            <View style={styles.storeRow}>
                              {isZeroCashStore ? (
                                <Text style={styles.storeMeta}>No cash due for this store.</Text>
                              ) : (
                                <Text style={styles.storeMeta}>Expected: {formatCurrency(expectedReturnCash)}</Text>
                              )}
                              {recon && !isZeroCashStore ? (
                                <>
                                  <Text style={styles.storeMeta}>Received: {formatCurrency(recon.actualCashReceived)}</Text>
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

                            {visibleLineItems.length > 0 && (
                              <View style={styles.machineList}>
                                {visibleLineItems.map(item => (
                                  <View key={item.machineId} style={styles.machineRow}>
                                    <Text style={styles.machineName}>{item.machineNumber || item.machineId}</Text>
                                    <Text style={styles.machineAmount}>
                                      Exp {formatCurrency(item.expectedAmount)} · Got {formatCurrency(item.actualAmount)} · {item.status === 'reconciled' ? 'received' : item.difference < 0 ? 'partial' : 'extra'}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            )}

                            {recon?.reconciliationNote && !isGenericNote(recon.reconciliationNote) ? (
                              <Text style={styles.note}>Note: {recon.reconciliationNote}</Text>
                            ) : null}

                            {shift.status !== 'closed' && (
                              <View style={styles.reconcileBox}>
                                <CurrencyInput
                                  label="Cash received"
                                  value={actualDraft}
                                  onChangeValue={value => {
                                    setReconcileAmounts(prev => ({ ...prev, [reconcileKey]: value }));
                                    setReconcileErrors(prev => ({ ...prev, [reconcileKey]: null }));
                                    setReconcileSuccess(prev => ({ ...prev, [reconcileKey]: '' }));
                                  }}
                                  error={reconcileError}
                                  helperText={`Expected ${formatCurrency(expectedReturnCash)}`}
                                />
                                <TextInput
                                  value={noteDraft}
                                  onChangeText={value => {
                                    setReconcileNotes(prev => ({ ...prev, [reconcileKey]: value }));
                                    setReconcileErrors(prev => ({ ...prev, [reconcileKey]: null }));
                                    setReconcileSuccess(prev => ({ ...prev, [reconcileKey]: '' }));
                                  }}
                                  placeholder={liveDifference === 0 ? 'Note (optional)' : 'Reason for partial or extra cash'}
                                  placeholderTextColor={colors.textMuted}
                                  multiline
                                  style={styles.noteInput}
                                />
                                {recon && !hasReconcileChanges && !isSavingCash ? (
                                  <View style={styles.savedState}>
                                    <Text style={styles.savedStateText}>Checked</Text>
                                  </View>
                                ) : (
                                  <Button
                                    title={reconcileButtonTitle}
                                    onPress={() => handleReconcile(shift, storeId, expectedReturnCash, storeVisits, recon)}
                                    loading={isSavingCash}
                                    disabled={isSavingCash}
                                    compact
                                  />
                                )}
                                {recon && !hasReconcileChanges && !isSavingCash ? (
                                  <Text style={styles.savedHint}>
                                    Cash is checked. Change the amount or note to update it.
                                  </Text>
                                ) : null}
                                {isSavingCash ? (
                                  <Text style={styles.actionProgress}>Saving cash...</Text>
                                ) : null}
                                {reconcileSuccessMessage ? (
                                  <Text style={styles.actionSuccess}>{reconcileSuccessMessage}</Text>
                                ) : null}
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

      <CloseShiftModal
        shift={shifts.find(s => s.id === confirmingCloseShiftId) || null}
        onCancel={() => setConfirmingCloseShiftId(null)}
        onConfirm={() => {
          const shift = shifts.find(s => s.id === confirmingCloseShiftId);
          if (shift) handleClose(shift);
        }}
        loading={actionId === confirmingCloseShiftId}
        colors={colors}
      />
    </ScrollView>
  );
}

const CloseShiftModal = ({
  shift,
  onCancel,
  onConfirm,
  loading,
  colors,
}: {
  shift: CollectionShift | null;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
  colors: Colors;
}) => {
  if (!shift) return null;
  const styles = modalStyles(colors);
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Close this shift?</Text>
          <Text style={styles.body}>
            You have collected and reviewed the shift cash. Closing this shift will mark the cash review complete and allow the employee to start a new shift for the next visit.
          </Text>
          <View style={styles.totals}>
            <Text style={styles.total}>Expected return: {formatCurrency(shift.expectedReturnCash)}</Text>
            <Text style={styles.total}>Cash received: {formatCurrency(shift.actualCashReceived)}</Text>
            <Text style={[styles.total, { color: shift.difference === 0 ? colors.success : colors.error }]}>Difference: {formatCurrency(shift.difference)}</Text>
          </View>
          {shift.difference !== 0 ? (
            <Text style={styles.warning}>This shift has a cash difference. Make sure the note is correct before closing.</Text>
          ) : null}
          <Text style={styles.body}>Closing this shift will clear the employee to start a new shift.</Text>
          {loading ? <Text style={styles.progress}>Closing shift...</Text> : null}
          <View style={styles.actions}>
            <Button title="Cancel" onPress={onCancel} variant="secondary" disabled={loading} compact />
            <Button title="Close Shift" onPress={onConfirm} loading={loading} variant="primary" compact />
          </View>
        </View>
      </View>
    </Modal>
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
  closeError: {
    color: colors.error,
    fontSize: fontSizes.body,
    marginTop: spacing.xs,
  },
  closeSuccess: {
    color: colors.success,
    fontSize: fontSizes.body,
    marginTop: spacing.xs,
  },
  actionProgress: {
    color: colors.textSecondary,
    fontSize: fontSizes.body,
    marginTop: spacing.sm,
  },
  actionSuccess: {
    color: colors.success,
    fontSize: fontSizes.body,
    marginTop: spacing.sm,
  },
  savedState: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    opacity: 0.72,
  },
  savedStateText: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
    fontWeight: '700',
  },
  savedHint: {
    color: colors.textMuted,
    fontSize: fontSizes.caption,
    marginTop: spacing.sm,
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

const modalStyles = (colors: Colors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.overlay,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  title: {
    fontSize: fontSizes.h2,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  body: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    lineHeight: lineHeights.body,
  },
  totals: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSecondary,
    gap: spacing.xs,
  },
  total: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  warning: {
    fontSize: fontSizes.body,
    color: colors.error,
    lineHeight: lineHeights.body,
  },
  progress: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
