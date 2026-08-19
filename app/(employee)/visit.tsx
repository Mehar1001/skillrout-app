import dayjs from 'dayjs';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { MachineReadingCard } from '../../components/MachineReadingCard';
import { VisitDatePicker } from '../../components/VisitDatePicker';
import { VisitTotals } from '../../components/VisitTotals';
import { colors, fontSizes, lineHeights, radii, spacing } from '../../constants/designTokens';
import { useAuth } from '../../contexts/AuthContext';
import { calculateLiveReadings } from '../../helpers/calculations';
import { validateBusinessDate, validatePresentReading } from '../../helpers/validators';
import { listMachines } from '../../services/machines';
import { getStore } from '../../services/stores';
import { saveRun } from '../../services/visits';
import { Machine, MachineReadingDraft, Store } from '../../types';

export default function VisitScreen() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const router = useRouter();
  const { user, ownerId } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [readings, setReadings] = useState<Record<string, MachineReadingDraft>>({});
  const [businessDate, setBusinessDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [saving, setSaving] = useState(false);
  const [showRequiredErrors, setShowRequiredErrors] = useState(false);
  const [completedVisitId, setCompletedVisitId] = useState<string | null>(null);

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

  const handleCamera = async (machineId: string) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera Permission', 'Allow camera access to attach an optional machine photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      updateReading(machineId, { ...readings[machineId], photoUri: result.assets[0].uri });
    }
  };

  const clearReadings = () => {
    setReadings(
      Object.fromEntries(machines.map(machine => [machine.id, { presentIn: null, presentOut: null }]))
    );
    setShowRequiredErrors(false);
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
      const inError = validatePresentReading(reading?.presentIn ?? null, machine.lastSettledIn, 'IN');
      const outError = validatePresentReading(reading?.presentOut ?? null, machine.lastSettledOut, 'OUT');
      if (inError || outError) {
        Alert.alert(`Machine ${machine.machineNumber}`, inError || outError || 'Correct the reading.');
        return;
      }
    }

    setSaving(true);
    try {
      setCompletedVisitId(await saveRun(ownerId, storeId, businessDate, machines, readings));
    } catch (e: any) {
      Alert.alert('RUN Failed', e.message || 'The visit could not be recorded.');
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
            Enter every cumulative present reading. Values below the last settlement are not accepted.
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

        {machines.map(machine => (
          <MachineReadingCard
            key={machine.id}
            machine={machine}
            reading={readings[machine.id] || { presentIn: null, presentOut: null }}
            onChange={reading => updateReading(machine.id, reading)}
            onTakePhoto={() => handleCamera(machine.id)}
            onRemovePhoto={() => updateReading(machine.id, { ...readings[machine.id], photoUri: undefined })}
            showRequiredErrors={showRequiredErrors}
          />
        ))}

        <VisitTotals {...totals} />

        <View style={styles.runArea}>
          <Button title="RUN" onPress={handleRun} loading={saving} disabled={saving} variant="primary" />
          <Text style={styles.runHelp}>RUN saves this visit permanently and does not update settled readings.</Text>
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
    </>
  );
}

const styles = StyleSheet.create({
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
