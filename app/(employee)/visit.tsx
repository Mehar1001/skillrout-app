import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { colors, fontSizes, lineHeights, radii, spacing } from '../../constants/designTokens';
import { useAuth } from '../../contexts/AuthContext';
import { listMachines } from '../../services/machines';
import { getStore } from '../../services/stores';
import { saveRun } from '../../services/visits';
import { Machine, Store } from '../../types';

export default function VisitScreen() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const router = useRouter();
  const { user, ownerId } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [present, setPresent] = useState<{ [machineId: string]: { in: string; out: string } }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !storeId) return;
    getStore(ownerId!, storeId).then(setStore);
    listMachines(ownerId!, storeId).then(list => {
      setMachines(list.filter(m => m.active));
      const initial: typeof present = {};
      list.forEach(m => {
        initial[m.id] = { in: '', out: '' };
      });
      setPresent(initial);
    });
  }, [user, storeId]);

  const updatePresent = (machineId: string, field: 'in' | 'out', value: string) => {
    setPresent(prev => ({
      ...prev,
      [machineId]: { ...prev[machineId], [field]: value },
    }));
  };

  const handleRun = async () => {
    if (!user || !ownerId || !store || !storeId) return;

    const readings: { [machineId: string]: { in: number; out: number } } = {};
    for (const machine of machines) {
      const inVal = Number(present[machine.id]?.in);
      const outVal = Number(present[machine.id]?.out);
      if (isNaN(inVal) || isNaN(outVal)) {
        Alert.alert('Invalid Reading', `Enter numbers for machine ${machine.machineNumber}`);
        return;
      }
      if (inVal < machine.lastSettledIn || outVal < machine.lastSettledOut) {
        Alert.alert(
          'Reading Too Low',
          `Machine ${machine.machineNumber}: present reading must not be lower than last settled.`
        );
        return;
      }
      readings[machine.id] = { in: inVal, out: outVal };
    }

    setSaving(true);
    try {
      const visitId = await saveRun(
        ownerId!,
        storeId,
        store.name,
        user.uid,
        user.email || 'Employee',
        machines,
        readings,
        store.defaultStorePercent,
        store.defaultVendorPercent
      );
      router.push(`/results?visitId=${visitId}` as any);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!store) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{store.name}</Text>
        <Text style={styles.subtitle}>
          Enter the present IN and OUT readings, then press RUN. The system will calculate the rest.
        </Text>
      </View>

      {machines.map(machine => (
        <Card key={machine.id} style={styles.machineCard}>
          <View style={styles.machineHeader}>
            <Text style={styles.machineNumber}>Machine {machine.machineNumber}</Text>
            {machine.name ? <Text style={styles.machineName}>{machine.name}</Text> : null}
          </View>

          <View style={styles.baselineRow}>
            <View style={styles.baselineBox}>
              <Text style={styles.baselineLabel}>Last Settled IN</Text>
              <Text style={styles.baselineValue}>{machine.lastSettledIn}</Text>
            </View>
            <View style={styles.baselineBox}>
              <Text style={styles.baselineLabel}>Last Settled OUT</Text>
              <Text style={styles.baselineValue}>{machine.lastSettledOut}</Text>
            </View>
          </View>

          <View style={styles.inputsRow}>
            <View style={styles.half}>
              <Input
                label="Present IN"
                value={present[machine.id]?.in || ''}
                onChangeText={text => updatePresent(machine.id, 'in', text)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
            <View style={styles.half}>
              <Input
                label="Present OUT"
                value={present[machine.id]?.out || ''}
                onChangeText={text => updatePresent(machine.id, 'out', text)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>
        </Card>
      ))}

      <View style={styles.runArea}>
        <Button title="RUN" onPress={handleRun} loading={saving} variant="primary" />
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
  subtitle: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    lineHeight: lineHeights.body,
  },
  machineCard: {
    marginBottom: spacing.md,
  },
  machineHeader: {
    marginBottom: spacing.sm,
  },
  machineNumber: {
    fontSize: fontSizes.h2,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  machineName: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  baselineRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  baselineBox: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  baselineLabel: {
    fontSize: fontSizes.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  baselineValue: {
    fontSize: fontSizes.h3,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  inputsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
  runArea: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
});
