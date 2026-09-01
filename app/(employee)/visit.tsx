import dayjs from 'dayjs';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { MachineReadingTable } from '../../components/MachineReadingTable';
import { AppliedReceiptReading, ReceiptScanReview } from '../../components/ReceiptScanReview';
import { type Colors, fontSizes, letterSpacings, lineHeights, radii, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';
import { useDraftQueue } from '../../contexts/DraftQueueContext';

import { mapFirebaseError } from '../../helpers/firebaseErrors';
import { matchReceiptCandidates, ReceiptReviewRow } from '../../helpers/receiptMachineMatching';
import { validateBusinessDate, validatePresentReading } from '../../helpers/validators';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { listMachines } from '../../services/machines';
import { prepareReceiptImage, readReceiptImage } from '../../services/receiptOcr';
import { getStore } from '../../services/stores';
import { createVisitId, getVisit, type RunProgress, saveRun } from '../../services/visits';
import { Machine, MachineReadingDraft, ReceiptOcrResponse, Store } from '../../types';

const RUN_TIMEOUT_MS = 30000;

const runProgressMessages: Record<RunProgress | 'checking', string> = {
  preparing: 'Preparing your visit…',
  'uploading-photos': 'Uploading machine photos…',
  'uploading-receipt': 'Uploading the receipt…',
  recording: 'Recording the visit securely…',
  checking: 'Checking whether the visit was recorded…',
};

const withTimeout = <T,>(promise: Promise<T>, milliseconds: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('RUN_CONFIRMATION_TIMEOUT')), milliseconds);
    promise.then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); }
    );
  });

export default function VisitScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const router = useRouter();
  const { user, ownerId } = useAuth();
  const { width } = useWindowDimensions();
  const { isOnline } = useNetworkStatus();
  const { saveDraft } = useDraftQueue();
  const [store, setStore] = useState<Store | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [readings, setReadings] = useState<Record<string, MachineReadingDraft>>({});
  const businessDate = dayjs().format('YYYY-MM-DD');
  const [saving, setSaving] = useState(false);
  const [runProgress, setRunProgress] = useState<RunProgress | 'checking' | 'unknown' | 'failed' | null>(null);
  const [runMessage, setRunMessage] = useState('');
  const [pendingVisitId, setPendingVisitId] = useState<string | null>(null);
  const [showRequiredErrors, setShowRequiredErrors] = useState(false);
  const [completedVisitId, setCompletedVisitId] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [readingReceipt, setReadingReceipt] = useState(false);
  const [receiptImageUri, setReceiptImageUri] = useState<string | null>(null);
  const [receiptOcr, setReceiptOcr] = useState<ReceiptOcrResponse | null>(null);
  const [receiptRows, setReceiptRows] = useState<ReceiptReviewRow[]>([]);
  const [scanTargetMachineId, setScanTargetMachineId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !ownerId || !storeId) return;
    getStore(ownerId, storeId).then(setStore);
    listMachines(ownerId, storeId).then(list => {
      const activeMachines = list.filter(machine => machine.active);
      setMachines(activeMachines);
      setReadings(
        Object.fromEntries(
          activeMachines.map(machine => [machine.id, { presentIn: null, presentOut: null }])
        )
      );
    });
  }, [user, ownerId, storeId]);

  const dateError = validateBusinessDate(businessDate);

  const updateReading = (machineId: string, reading: MachineReadingDraft) => {
    setReadings(current => ({ ...current, [machineId]: reading }));
  };

  const selectImage = async (source: 'camera' | 'library'): Promise<ImagePicker.ImagePickerAsset | null> => {
    if (source === 'camera' && Platform.OS !== 'web') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera Permission', 'Allow camera access to scan or attach a machine receipt.');
        return null;
      }
    }
    if (source === 'library' && Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photo Permission', 'Allow photo access to upload a machine receipt.');
        return null;
      }
    }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.9,
          allowsEditing: false,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.9,
          allowsEditing: false,
        });
    return result.canceled ? null : result.assets[0] ?? null;
  };

  const processReceiptImage = async (
    asset: ImagePicker.ImagePickerAsset,
    targetMachine?: Machine
  ) => {
    if (!storeId) return;
    setReadingReceipt(true);
    setReceiptOcr(null);
    setScanTargetMachineId(targetMachine?.id ?? null);
    try {
      const prepared = await prepareReceiptImage({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
      });
      setReceiptImageUri(prepared.uri);
      if (targetMachine) {
        setReadings(current => ({
          ...current,
          [targetMachine.id]: { ...current[targetMachine.id], photoUri: prepared.uri },
        }));
      }
      const result = await readReceiptImage(storeId, prepared, targetMachine?.machineNumber);
      setReceiptRows(matchReceiptCandidates(machines, result.candidates));
      setReceiptOcr(result);
    } catch (error: any) {
      const code = String(error?.code || '');
      const message = code.includes('resource-exhausted')
        ? 'The daily receipt scan limit was reached. Enter readings manually.'
        : code.includes('not-found')
          ? 'No readable machine values were found. Retake the photo with the full receipt visible.'
          : error?.message || 'The receipt could not be read. Enter readings manually or try again.';
      if (targetMachine) setReceiptImageUri(null);
      setScanTargetMachineId(null);
      Alert.alert('Receipt Scan', message);
    } finally {
      setReadingReceipt(false);
    }
  };

  const handleMachineImage = async (machine: Machine, source: 'camera' | 'library') => {
    const asset = await selectImage(source);
    if (!asset) return;
    try {
      const prepared = await prepareReceiptImage({ uri: asset.uri, width: asset.width, height: asset.height });
      setReadings(current => ({
        ...current,
        [machine.id]: { ...current[machine.id], photoUri: prepared.uri, ocr: undefined },
      }));
    } catch (error: any) {
      Alert.alert('Photo Error', error?.message || 'The machine photo could not be prepared.');
    }
  };

  const handleReadMachinePhoto = async (machine: Machine) => {
    const uri = readings[machine.id]?.photoUri;
    if (!uri) return;
    try {
      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
      });
      await processReceiptImage({ uri, ...dimensions }, machine);
    } catch (error: any) {
      Alert.alert('Receipt Scan', error?.message || 'The machine photo could not be read.');
    }
  };

  const closeReceiptReview = () => {
    setReceiptOcr(null);
    setReceiptRows([]);
    setReceiptImageUri(null);
    setScanTargetMachineId(null);
  };

  const applyReceiptReadings = (applied: AppliedReceiptReading[]) => {
    if (!receiptOcr) return;
    setReadings(current => {
      const next = { ...current };
      applied.forEach(item => {
        next[item.machineId] = {
          ...next[item.machineId],
          presentIn: item.presentIn,
          presentOut: item.presentOut,
          ocr: {
            source: scanTargetMachineId ? 'machine-photo' : 'receipt',
            status: 'reviewed',
            presentIn: item.presentIn,
            presentOut: item.presentOut,
            confidence: item.confidence,
            scanId: receiptOcr.scanId,
          },
        };
      });
      return next;
    });
    setReceiptOcr(null);
    setReceiptRows([]);
    if (scanTargetMachineId) setReceiptImageUri(null);
    setScanTargetMachineId(null);
  };

  const clearReadings = () => {
    setReadings(
      Object.fromEntries(machines.map(machine => [machine.id, { presentIn: null, presentOut: null }]))
    );
    setShowRequiredErrors(false);
    closeReceiptReview();
  };

  const completeRun = (visitId: string) => {
    setPendingVisitId(null);
    setRunProgress(null);
    setRunMessage('Visit recorded successfully.');
    setCompletedVisitId(visitId);
  };

  const findRecordedVisit = async (visitId: string) => {
    if (!ownerId || !storeId) return null;
    return withTimeout(getVisit(ownerId, storeId, visitId), 10000).catch(() => null);
  };

  const checkRunStatus = async () => {
    if (!pendingVisitId) return;
    setSaving(true);
    setRunProgress('checking');
    setRunMessage('');
    try {
      const recorded = await findRecordedVisit(pendingVisitId);
      if (recorded) {
        completeRun(pendingVisitId);
      } else {
        setRunProgress('unknown');
        setRunMessage('The visit is not recorded yet. You can safely retry RUN with the same visit reference.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    if (!user || !ownerId || !store || !storeId) return;
    setRunMessage('');
    setShowRequiredErrors(true);
    if (dateError) {
      Alert.alert('Invalid Date', dateError);
      return;
    }
    if (machines.length === 0) {
      Alert.alert('No Machines', 'This store has no active machines to run.');
      return;
    }

    for (const machine of machines) {
      const reading = readings[machine.id];
      const inError = validatePresentReading(reading?.presentIn ?? null, machine.lastSettledIn, 'Credits In');
      const outError = validatePresentReading(reading?.presentOut ?? null, machine.lastSettledOut, 'Total Paid');
      if (inError || outError) {
        Alert.alert(`Machine ${machine.machineNumber}`, inError || outError || 'Correct the Credits In or Total Paid reading.');
        return;
      }
    }

    if (!isOnline) {
      try {
        await saveDraft({
          storeId,
          storeName: store.name,
          businessDate,
          machines,
          readings,
          receiptPhotoUri: receiptImageUri ?? undefined,
        });
        setDraftSaved(true);
      } catch (e: any) {
        Alert.alert('Draft Failed', e.message || 'This visit could not be saved for later.');
      }
      return;
    }

    const visitId = pendingVisitId || createVisitId(ownerId, storeId);
    setPendingVisitId(visitId);
    setSaving(true);
    setRunProgress('preparing');
    try {
      if (pendingVisitId && await findRecordedVisit(visitId)) {
        completeRun(visitId);
        return;
      }
      const recordedVisitId = await withTimeout(
        saveRun(ownerId, storeId, businessDate, machines, readings, receiptImageUri ?? undefined, {
          visitId,
          onProgress: setRunProgress,
        }),
        RUN_TIMEOUT_MS
      );
      completeRun(recordedVisitId);
    } catch (error: any) {
      setRunProgress('checking');
      const recorded = await findRecordedVisit(visitId);
      if (recorded) {
        completeRun(visitId);
      } else if (error?.message === 'RUN_CONFIRMATION_TIMEOUT') {
        setRunProgress('unknown');
        setRunMessage('RUN is taking longer than expected. Check the status before trying again.');
      } else {
        setRunProgress('failed');
        setRunMessage(`${mapFirebaseError(error)} Your readings are still on screen.`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!store) return null;

  const handleViewResults = async () => {
    if (!completedVisitId || !storeId || !ownerId) return;
    const visitId = completedVisitId;
    setCompletedVisitId(null);
    const visit = await getVisit(ownerId, storeId, visitId);
    if (visit && Number(visit.totalNet) > 0) {
      router.push(`/settlement?visitId=${visitId}&storeId=${storeId}` as any);
    } else {
      router.push(`/outcome?visitId=${visitId}&storeId=${storeId}` as any);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>STORE DETAILS</Text>
          <Text style={styles.title}>{store.name}</Text>
          <Text style={styles.address}>{store.address}</Text>
          <Text style={styles.subtitle}>
            Enter every cumulative Present In and Present Out reading. Values below the last settlement are not accepted.
          </Text>
        </View>

        <View style={styles.dateField}>
          <Text style={styles.dateLabel}>Business date</Text>
          <Text style={styles.dateValue}>{dayjs(businessDate).format('MMMM D, YYYY')}</Text>
          <Text style={styles.dateHelper}>Visits are recorded for today.</Text>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Machine readings</Text>
            <Text style={styles.sectionHelp}>Photos are optional. RUN permanently records the visit.</Text>
          </View>
          <Button title="Clear" onPress={clearReadings} variant="secondary" />
        </View>

        <View style={styles.receiptScanner}>
          <View style={[styles.receiptScannerMain, width >= 700 && styles.receiptScannerMainWide]}>
            <View style={styles.receiptScannerText}>
              <Text style={styles.receiptScannerTitle}>Auto-fill from receipt</Text>
              <Text style={styles.receiptScannerHelp}>Scan once, then review suggested values before applying.</Text>
            </View>
            <View style={styles.receiptControls}>
              <View style={styles.receiptActions}>
                <View style={styles.receiptActionHalf}>
                  <Button title="Scan" iconName="camera-outline" onPress={() => {}} variant="accent" disabled={true} compact />
                </View>
                <View style={styles.receiptActionHalf}>
                  <Button title="Upload" iconName="cloud-upload-outline" onPress={() => {}} variant="secondary" disabled={true} compact />
                </View>
              </View>
              <Text style={styles.comingSoon}>Coming soon</Text>
            </View>
          </View>
          {receiptImageUri && !scanTargetMachineId && !receiptOcr ? (
            <View style={styles.receiptAttachmentRow}>
              <Text style={styles.receiptAttached}>Receipt image attached to this visit.</Text>
              <Pressable accessibilityRole="button" onPress={() => setReceiptImageUri(null)} style={styles.removeReceipt}>
                <Text style={styles.removeReceiptText}>Remove</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {machines.length === 0 ? (
          <Card style={styles.emptyMachinesCard}>
            <Text style={styles.emptyMachinesTitle}>No machines for this store</Text>
            <Text style={styles.emptyMachinesBody}>
              Add at least one machine before you can record a visit.
            </Text>
            <Button
              title="Add Machine"
              onPress={() => router.push(`/add-machine?storeId=${storeId}` as any)}
              variant="primary"
            />
          </Card>
        ) : (
          <>
            <MachineReadingTable
              machines={machines}
              readings={readings}
              onChange={updateReading}
              onTakePhoto={machine => handleMachineImage(machine, 'camera')}
              onUploadPhoto={machine => handleMachineImage(machine, 'library')}
              onReadPhoto={handleReadMachinePhoto}
              onRemovePhoto={machine => updateReading(machine.id, { ...readings[machine.id], photoUri: undefined, ocr: undefined })}
              readingPhotoMachineId={readingReceipt ? scanTargetMachineId : null}
              showRequiredErrors={showRequiredErrors}
            />

            <View style={styles.runArea}>
              {(saving || runProgress || runMessage) && (
                <View style={[
                  styles.runStatus,
                  runProgress === 'failed' && styles.runStatusError,
                  runProgress === 'unknown' && styles.runStatusWarning,
                ]}>
                  {saving && <ActivityIndicator size="small" color={colors.primary} />}
                  <View style={styles.runStatusCopy}>
                    <Text style={styles.runStatusTitle}>
                      {saving && runProgress && runProgress !== 'unknown' && runProgress !== 'failed'
                        ? runProgressMessages[runProgress]
                        : runProgress === 'unknown'
                          ? 'RUN status needs confirmation'
                          : runProgress === 'failed'
                            ? 'RUN was not completed'
                            : runMessage}
                    </Text>
                    {saving ? <Text style={styles.runStatusHelp}>Keep this page open. Do not press RUN again.</Text> : null}
                    {!saving && runMessage ? <Text style={styles.runStatusHelp}>{runMessage}</Text> : null}
                  </View>
                  {!saving && runProgress === 'unknown' ? (
                    <View style={styles.checkStatusButton}>
                      <Button title="Check Status" onPress={checkRunStatus} variant="secondary" compact />
                    </View>
                  ) : null}
                </View>
              )}
              <View style={styles.runButtonWrapper}>
                <Button
                  title={isOnline ? pendingVisitId ? 'Retry RUN' : 'RUN' : 'Save Offline Draft'}
                  onPress={handleRun}
                  loading={saving}
                  disabled={saving}
                  variant="primary"
                />
              </View>
              <Text style={styles.runHelp}>
                {isOnline
                  ? 'RUN saves this visit permanently and does not update settled readings.'
                  : 'You appear offline. Save a draft and it will be submitted automatically when you reconnect.'}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={Boolean(completedVisitId)} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.successMark}>
              <Text style={styles.successMarkText}>✓</Text>
            </View>
            <Text style={styles.modalTitle}>RUN Completed</Text>
            <Text style={styles.modalText}>Store visit has been recorded successfully.</Text>
            <Pressable
              accessibilityRole="button"
              style={styles.modalButton}
              onPress={handleViewResults}
            >
              <Text style={styles.modalButtonText}>View Results</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={draftSaved} transparent animationType="fade" onRequestClose={() => setDraftSaved(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Draft Saved Offline</Text>
            <Text style={styles.modalText}>
              This visit is stored on your device and will be submitted automatically when you reconnect.
            </Text>
            <Pressable accessibilityRole="button" style={styles.modalButton} onPress={() => setDraftSaved(false)}>
              <Text style={styles.modalButtonText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ReceiptScanReview
        visible={Boolean(receiptOcr)}
        imageUri={receiptImageUri}
        rows={receiptRows}
        totals={receiptOcr?.totals ?? null}
        warnings={receiptOcr?.warnings ?? []}
        machines={machines}
        readings={readings}
        onApply={applyReceiptReadings}
        onClose={closeReceiptReview}
      />
    </>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
    minHeight: '100%',
  },
  header: {
    marginBottom: spacing.lg,
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
  address: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: fontSizes.body,
  },
  subtitle: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fontSizes.h2,
    fontWeight: '700',
  },
  sectionHelp: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: fontSizes.caption,
  },
  receiptScanner: {
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.md,
    backgroundColor: colors.accentSubtle,
  },
  receiptScannerMain: {
    gap: spacing.sm,
  },
  receiptScannerMainWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  receiptScannerText: {
    flex: 1,
  },
  receiptScannerTitle: {
    color: colors.textPrimary,
    fontSize: fontSizes.body,
    fontWeight: '700',
  },
  receiptScannerHelp: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 10,
    lineHeight: fontSizes.caption,
  },
  receiptControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  receiptActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  receiptActionHalf: {
    width: 100,
  },
  comingSoon: {
    color: colors.textMuted,
    fontSize: 10,
    fontStyle: 'italic',
  },
  receiptAttachmentRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  receiptAttached: {
    flex: 1,
    color: colors.success,
    fontSize: fontSizes.caption,
    fontWeight: '700',
  },
  removeReceipt: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  removeReceiptText: {
    color: colors.error,
    fontSize: fontSizes.caption,
    fontWeight: '700',
  },
  dateField: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  dateLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.caption,
    fontWeight: '600',
  },
  dateValue: {
    color: colors.textPrimary,
    fontSize: fontSizes.body,
    fontWeight: '700',
  },
  dateHelper: {
    color: colors.textMuted,
    fontSize: fontSizes.caption,
  },
  runArea: {
    gap: spacing.sm,
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  runStatus: {
    width: '100%',
    maxWidth: 640,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.md,
    backgroundColor: colors.primarySubtle,
  },
  runStatusWarning: {
    borderColor: colors.warning,
    backgroundColor: colors.surfaceSecondary,
  },
  runStatusError: {
    borderColor: colors.error,
    backgroundColor: colors.glowError,
  },
  runStatusCopy: {
    flex: 1,
  },
  runStatusTitle: {
    color: colors.textPrimary,
    fontSize: fontSizes.body,
    fontWeight: '700',
  },
  runStatusHelp: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: fontSizes.caption,
  },
  checkStatusButton: {
    minWidth: 120,
  },
  runButtonWrapper: {
    width: '50%',
    maxWidth: 280,
    minWidth: 200,
  },
  runHelp: {
    color: colors.textMuted,
    fontSize: fontSizes.caption,
    textAlign: 'center',
  },
  emptyMachinesCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
  },
  emptyMachinesTitle: {
    color: colors.textPrimary,
    fontSize: fontSizes.h2,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyMachinesBody: {
    color: colors.textSecondary,
    fontSize: fontSizes.body,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.overlay,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  successMark: {
    width: spacing.xxl,
    height: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.success,
  },
  successMarkText: {
    color: colors.textOnPrimary,
    fontSize: fontSizes.h1,
    fontWeight: '700',
  },
  modalTitle: {
    marginTop: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSizes.h2,
    fontWeight: '700',
  },
  modalText: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    color: colors.textSecondary,
    fontSize: fontSizes.body,
    textAlign: 'center',
  },
  modalButton: {
    minHeight: 44,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.primary,
  },
  modalButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSizes.body,
    fontWeight: '700',
  },
});
