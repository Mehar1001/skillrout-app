import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { listStores } from '../../services/stores';
import { getNextMachineNumber, listMachines, saveMachine, setMachineActive } from '../../services/machines';
import { Store, Machine } from '../../types';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { CurrencyInput } from '../../components/CurrencyInput';
import { Card } from '../../components/Card';
import { type Colors, fontSizes, radii, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { confirm } from '../../helpers/alert';
import { formatCurrency } from '../../helpers/formatters';

export default function MachinesScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { user, ownerId } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
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
    if (!form.id) {
      getNextMachineNumber(ownerId, selectedStoreId).then(nextNumber =>
        setForm(prev => ({ ...prev, machineNumber: nextNumber }))
      );
    }
  }, [user, ownerId, selectedStoreId, form.id]);

  const resetForm = () => {
    setForm({
      id: '',
      machineNumber: '',
      name: '',
      lastSettledIn: 0,
      lastSettledOut: 0,
      active: true,
    });
    if (ownerId && selectedStoreId) {
      getNextMachineNumber(ownerId, selectedStoreId).then(nextNumber =>
        setForm(prev => ({ ...prev, machineNumber: nextNumber }))
      );
    }
  };

  const handleEdit = (machine: Machine) => setForm({ ...machine });

  const handleSave = async () => {
    setMessage(null);
    if (!user || !ownerId || !selectedStoreId) {
      setMessage({ type: 'error', text: 'Select a store first.' });
      return;
    }
    if (!form.name?.trim()) {
      setMessage({ type: 'error', text: 'Machine name is required.' });
      return;
    }
    setLoading(true);
    try {
      await saveMachine(ownerId, selectedStoreId, form);
      setMessage({ type: 'success', text: `Machine ${form.name?.trim()} saved.` });
      resetForm();
      listMachines(ownerId, selectedStoreId).then(setMachines);
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to save machine.' });
    } finally {
      setLoading(false);
    }
  };

  const handleActiveChange = (machine: Machine) => {
    if (!user || !ownerId || !selectedStoreId) return;
    setMessage(null);
    const nextActive = !machine.active;
    confirm(
      nextActive ? 'Reactivate Machine' : 'Deactivate Machine',
      nextActive
        ? `Reactivate machine ${machine.machineNumber}?`
        : `Deactivate machine ${machine.machineNumber}? Historical visits and settled readings will remain unchanged.`,
      async () => {
        try {
          await setMachineActive(ownerId, selectedStoreId, machine.id, nextActive);
          listMachines(ownerId, selectedStoreId).then(setMachines);
        } catch (e: any) {
          setMessage({ type: 'error', text: e.message || 'Failed to update machine.' });
        }
      }
    );
  };

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchText.toLowerCase()) ||
    (store.address || '').toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Machines</Text>

      <View style={styles.searchRow}>
        <TextInput
          style={[
            styles.searchInput,
            {
              borderColor: colors.border,
              color: colors.textPrimary,
              backgroundColor: colors.surface,
            },
          ]}
          placeholder="Search stores…"
          placeholderTextColor={colors.textMuted}
          value={searchText}
          onChangeText={setSearchText}
          accessibilityLabel="Search stores"
        />
      </View>

      <Text style={styles.sectionTitle}>Select a Store</Text>
      {filteredStores.length === 0 ? (
        <Text style={styles.empty}>No stores found.</Text>
      ) : (
        filteredStores.map(store => {
          const expanded = expandedStoreId === store.id;
          const isSelected = selectedStoreId === store.id;
          return (
            <Card
              key={store.id}
              style={[
                styles.storeCard,
                isSelected && styles.storeCardSelected,
              ]}
            >
              <Pressable
                onPress={() => {
                  setExpandedStoreId(expanded ? null : store.id);
                  if (!isSelected) {
                    setSelectedStoreId(store.id);
                    resetForm();
                  }
                }}
                style={styles.storeHeader}
                accessibilityRole="button"
                accessibilityState={{ expanded, selected: isSelected }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.storeName}>{store.name}</Text>
                  <Text style={styles.storeMeta}>
                    {store.active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
                <Ionicons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>

              {expanded && (
                <View style={styles.storeBody}>
                  <Card style={styles.formCard}>
                    <Text style={styles.sectionTitle}>
                      {form.id ? 'Edit Machine' : 'Add Machine'}
                    </Text>
                    <Input
                      label="Machine Number"
                      value={form.machineNumber}
                      onChangeText={text => setForm(prev => ({ ...prev, machineNumber: text }))}
                      placeholder="Auto-generated"
                      editable={!form.id}
                    />
                    <Input
                      label="Machine Name *"
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
                          helperText={
                            form.id
                              ? 'Settled readings cannot be changed during a normal edit.'
                              : undefined
                          }
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
                          helperText={
                            form.id
                              ? 'Settled readings cannot be changed during a normal edit.'
                              : undefined
                          }
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
                    {message ? (
                      <View
                        style={[
                          styles.messageBox,
                          { backgroundColor: message.type === 'error' ? colors.glowError : colors.glowSuccess },
                        ]}
                      >
                        <Text
                          style={[
                            styles.messageText,
                            { color: message.type === 'error' ? colors.error : colors.success },
                          ]}
                        >
                          {message.text}
                        </Text>
                      </View>
                    ) : null}
                  </Card>

                  <Text style={styles.sectionTitle}>Machines at this Store</Text>
                  {machines.length === 0 ? (
                    <Text style={styles.empty}>No machines yet. Add the first one above.</Text>
                  ) : (
                    machines.map(machine => (
                      <Card key={machine.id} style={styles.machineCard}>
                        <Text
                          style={[
                            styles.machineName,
                            !machine.active && { color: colors.textMuted },
                          ]}
                        >
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
                </View>
              )}
            </Card>
          );
        })
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
  searchRow: {
    marginBottom: spacing.md,
  },
  searchInput: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
    fontSize: fontSizes.body,
  },
  storeCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    gap: spacing.sm,
  },
  storeBody: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  storeMeta: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
  messageBox: {
    padding: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.md,
  },
  messageText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    textAlign: 'center',
  },
});
