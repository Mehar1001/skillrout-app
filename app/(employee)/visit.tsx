import dayjs from 'dayjs';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { MachineReadingCard } from '../../components/MachineReadingCard';
import { AppliedReceiptReading, ReceiptScanReview } from '../../components/ReceiptScanReview';
import { VisitDatePicker } from '../../components/VisitDatePicker';
import { VisitTotals } from '../../components/VisitTotals';
import { type Colors, fontSizes, lineHeights, radii, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';
import { useDraftQueue } from '../../contexts/DraftQueueContext';
import { calculateLiveReadings } from '../../helpers/calculations';
import { matchReceiptCandidates, ReceiptReviewRow } from '../../helpers/receiptMachineMatching';
import { validateBusinessDate, validatePresentReading } from '../../helpers/validators';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { listMachines } from '../../services/machines';
import { prepareReceiptImage, readReceiptImage } from '../../services/receiptOcr';
import { getStore } from '../../services/stores';
import { saveRun } from '../../services/visits';
import { Machine, MachineReadingDraft, ReceiptOcrResponse, Store } from '../../types';

export default function VisitScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const router = useRouter();
  const { user, ownerId } = useAuth();
  const { isOnline } = useNetworkStatus();
  const { saveDraft } = useDraftQueue();
  const [store, setStore] = useState<Store | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [readings, setReadings] = useState<Record<string, MachineReadingDraft>>({});
  const [businessDate, setBusinessDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [saving, setSaving] = useState(false);
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

  const totals = useMemo(() => calculateLiveReadings(machines, readings), [machines, readings]);
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

  const handleReceiptImage = async (source: 'camera' | 'library') => {
    const asset = await selectImage(source);
    if (asset) await processReceiptImage(asset);
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

  const handleRun = async () => {
    if (!user || !ownerId || !store || !storeId) return;
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

    setSaving(true);
    try {
      setCompletedVisitId(await saveRun(ownerId, storeId, businessDate, machines, readings, receiptImageUri ?? undefined));
    } catch (e: any) {
      Alert.alert(
        'RUN Failed',
        e.message || 'The visit could not be recorded. Your entries are still on screen; try again when online.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (!store) return null;

  const handleViewResults = () => {
    if (!completedVisitId) return;
    const visitId = completedVisitId;
    setCompletedVisitId(null);
    router.push(`/results?visitId=${visitId}` as any);
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>STORE DETAILS</Text>
          <Text style={styles.title}>{store.name}</Text>
          <Text style={styles.address}>{store.address}</Text>
          <Text style={styles.subtitle}>
            Enter every cumulative Credits In and Total Paid reading. Values below the last settlement are not accepted.
          </Text>
        </View>

        <VisitDatePicker value={businessDate} onChange={setBusinessDate} error={dateError} />

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Machine readings</Text>
            <Text style={styles.sectionHelp}>Photos are optional. RUN permanently records the visit.</Text>
          </View>
          <Button title="Clear" onPress={clearReadings} variant="secondary" />
        </View>

        <View style={styles.receiptScanner}>
          <View style={styles.receiptScannerText}>
            <Text style={styles.receiptScannerTitle}>Auto-fill from receipt</Text>
            <Text style={styles.receiptScannerHelp}>Scan the full bookkeeping receipt once. Review every suggested value before applying.</Text>
          </View>
          <View style={styles.receiptActions}>
            <Button title="Scan Receipt" onPress={() => handleReceiptImage('camera')} variant="accent" disabled={readingReceipt} loading={readingReceipt} />
            <Button title="Upload Receipt" onPress={() => handleReceiptImage('library')} variant="secondary" disabled={readingReceipt} />
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

        {machines.map(machine => (
          <MachineReadingCard
            key={machine.id}
            machine={machine}
            reading={readings[machine.id] || { presentIn: null, presentOut: null }}
            onChange={reading => updateReading(machine.id, reading)}
            onTakePhoto={() => handleMachineImage(machine, 'camera')}
            onUploadPhoto={() => handleMachineImage(machine, 'library')}
            onReadPhoto={() => handleReadMachinePhoto(machine)}
            onRemovePhoto={() => updateReading(machine.id, { ...readings[machine.id], photoUri: undefined, ocr: undefined })}
            readingPhoto={readingReceipt && scanTargetMachineId === machine.id}
            showRequiredErrors={showRequiredErrors}
          />
        ))}

        <VisitTotals {...totals} />

        <View style={styles.runArea}>
          <Button title={isOnline ? 'RUN' : 'Save Offline Draft'} onPress={handleRun} loading={saving} disabled={saving} variant="primary" />
          <Text style={styles.runHelp}>
            {isOnline
              ? 'RUN saves this visit permanently and does not update settled readings.'
              : 'You appear offline. Save a draft and it will be submitted automatically when you reconnect.'}
          </Text>
        </View>
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
    letterSpacing: 0.8,
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
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.lg,
    backgroundColor: colors.accentSubtle,
  },
  receiptScannerText: {
    flex: 1,
  },
  receiptScannerTitle: {
    color: colors.textPrimary,
    fontSize: fontSizes.h3,
    fontWeight: '700',
  },
  receiptScannerHelp: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: fontSizes.caption,
    lineHeight: 16,
  },
  receiptActions: {
    gap: spacing.sm,
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
  runArea: {
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  runHelp: {
    color: colors.textMuted,
    fontSize: fontSizes.caption,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(42, 42, 42, 0.48)',
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
    width: 55,
    height: 55,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
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
    minHeight: 48,
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
