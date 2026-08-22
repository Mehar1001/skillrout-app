import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { listStores } from '../../services/stores';
import { listMachines, saveMachine, setMachineActive } from '../../services/machines';
import { Store, Machine } from '../../types';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { CurrencyInput } from '../../components/CurrencyInput';
import { Card } from '../../components/Card';
import { type Colors, fontSizes, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { formatCurrency } from '../../helpers/formatters';

export default function MachinesScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { user, ownerId } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Partial<Machine>>({
    id: '',
    machineNumber: '',
    name: '',
    lastSettledIn: 0,
    lastSettledOut: 0,
    active: true,
  });

  useEffect(() => {
    if (!user || !ownerId) return;
    listStores(ownerId).then(setStores);
  }, [user, ownerId]);

  useEffect(() => {
    if (!user || !ownerId || !selectedStoreId) return;
    listMachines(ownerId, selectedStoreId).then(setMachines);
  }, [user, ownerId, selectedStoreId]);

  const resetForm = () => {
    setForm({
      id: '',
      machineNumber: '',
      name: '',
      lastSettledIn: 0,
      lastSettledOut: 0,
      active: true,
    });
  };

  const handleEdit = (machine: Machine) => setForm({ ...machine });

  const handleSave = async () => {
    if (!user || !ownerId || !selectedStoreId || !form.machineNumber?.trim()) {
      Alert.alert('Required', 'Select a store and enter a machine number.');
      return;
    }
    setLoading(true);
    await saveMachine(ownerId, selectedStoreId, form);
    setLoading(false);
    resetForm();
    listMachines(ownerId, selectedStoreId).then(setMachines);
  };

  const handleActiveChange = (machine: Machine) => {
    if (!user || !ownerId || !selectedStoreId) return;
    const nextActive = !machine.active;
    Alert.alert(
      nextActive ? 'Reactivate Machine' : 'Deactivate Machine',
      nextActive
        ? `Reactivate machine ${machine.machineNumber}?`
        : `Deactivate machine ${machine.machineNumber}? Historical visits and settled readings will remain unchanged.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: nextActive ? 'Reactivate' : 'Deactivate',
          style: nextActive ? 'default' : 'destructive',
          onPress: async () => {
            await setMachineActive(ownerId, selectedStoreId, machine.id, nextActive);
            listMachines(ownerId, selectedStoreId).then(setMachines);
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Machines</Text>

      <Text style={styles.sectionTitle}>Select a Store</Text>
      {stores.map(store => (
        <Card
          key={store.id}
          style={[
            styles.storeCard,
            selectedStoreId === store.id && styles.storeCardSelected,
          ]}
        >
          <Text style={styles.storeName}>{store.name}</Text>
          <Button
            title={selectedStoreId === store.id ? 'Selected' : 'Select'}
            onPress={() => {
              setSelectedStoreId(store.id);
              resetForm();
            }}
            variant={selectedStoreId === store.id ? 'primary' : 'secondary'}
          />
        </Card>
      ))}

      {selectedStoreId && (
        <>
          <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>
              {form.id ? 'Edit Machine' : 'Add Machine'}
            </Text>
            <Input
              label="Machine Number"
              value={form.machineNumber}
              onChangeText={text => setForm(prev => ({ ...prev, machineNumber: text }))}
              placeholder="1"
            />
            <Input
              label="Machine Name (optional)"
              value={form.name || ''}
              onChangeText={text => setForm(prev => ({ ...prev, name: text }))}
              placeholder="Front left"
            />
            <View style={styles.row}>
              <View style={styles.half}>
                <CurrencyInput
                  label="Initial / Last Settled IN"
                  value={form.lastSettledIn ?? 0}
                  onChangeValue={lastSettledIn =>
                    setForm(prev => ({ ...prev, lastSettledIn: lastSettledIn ?? 0 }))
                  }
                  disabled={Boolean(form.id)}
                  helperText={form.id ? 'Settled readings cannot be changed during a normal edit.' : undefined}
                />
              </View>
              <View style={styles.half}>
                <CurrencyInput
                  label="Initial / Last Settled OUT"
                  value={form.lastSettledOut ?? 0}
                  onChangeValue={lastSettledOut =>
                    setForm(prev => ({ ...prev, lastSettledOut: lastSettledOut ?? 0 }))
                  }
                  disabled={Boolean(form.id)}
                  helperText={form.id ? 'Settled readings cannot be changed during a normal edit.' : undefined}
                />
              </View>
            </View>
            <View style={styles.actions}>
              <Button
                title={form.id ? 'Update Machine' : 'Add Machine'}
                onPress={handleSave}
                loading={loading}
              />
              {form.id ? (
                <Button title="Cancel" onPress={resetForm} variant="secondary" />
              ) : null}
            </View>
          </Card>

          <Text style={styles.sectionTitle}>Machines at this Store</Text>
          {machines.length === 0 ? (
            <Text style={styles.empty}>No machines yet.</Text>
          ) : (
            machines.map(machine => (
              <Card key={machine.id} style={styles.machineCard}>
                <Text style={styles.machineName}>
                  {machine.machineNumber} {machine.name ? `— ${machine.name}` : ''}
                </Text>
                <Text style={styles.machineReadings}>
                  Last Settled IN: {formatCurrency(machine.lastSettledIn)} · OUT: {formatCurrency(machine.lastSettledOut)} · {machine.active ? 'Active' : 'Inactive'}
                </Text>
                <View style={styles.actions}>
                  <Button title="Edit" onPress={() => handleEdit(machine)} variant="secondary" />
                  <Button
                    title={machine.active ? 'Deactivate' : 'Reactivate'}
                    onPress={() => handleActiveChange(machine)}
                    variant={machine.active ? 'danger' : 'accent'}
                  />
                </View>
              </Card>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    minHeight: '100%',
  },
  title: {
    fontSize: fontSizes.h1,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.h2,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  storeCard: {
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  storeCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  storeName: {
    fontSize: fontSizes.h3,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  formCard: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  machineCard: {
    marginBottom: spacing.md,
  },
  machineName: {
    fontSize: fontSizes.h2,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  machineReadings: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  empty: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
  },
});
