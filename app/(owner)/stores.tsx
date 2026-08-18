import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { listStores, saveStore, deleteStore } from '../../services/stores';
import { Store } from '../../types';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { colors, fontSizes, spacing } from '../../constants/designTokens';
import { validatePercentages } from '../../helpers/validators';

export default function StoresScreen() {
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Partial<Store>>({
    id: '',
    name: '',
    address: '',
    active: true,
    defaultStorePercent: 50,
    defaultVendorPercent: 50,
  });

  const fetchStores = async () => {
    if (!user) return;
    setLoading(true);
    const data = await listStores(user.uid);
    setStores(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchStores();
  }, [user]);

  const resetForm = () => {
    setForm({
      id: '',
      name: '',
      address: '',
      active: true,
      defaultStorePercent: 50,
      defaultVendorPercent: 50,
    });
  };

  const handleEdit = (store: Store) => setForm({ ...store });

  const handleSave = async () => {
    if (!user || !form.name?.trim()) {
      Alert.alert('Required', 'Store name is required.');
      return;
    }
    const pctError = validatePercentages(
      Number(form.defaultStorePercent) || 0,
      Number(form.defaultVendorPercent) || 0
    );
    if (pctError) {
      Alert.alert('Validation', pctError);
      return;
    }
    await saveStore(user.uid, form);
    resetForm();
    fetchStores();
  };

  const handleDelete = (id: string) => {
    if (!user) return;
    Alert.alert('Confirm', 'Delete this store?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteStore(user.uid, id);
          fetchStores();
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Stores</Text>

      <Card style={styles.formCard}>
        <Input
          label="Store Name"
          value={form.name}
          onChangeText={text => setForm(prev => ({ ...prev, name: text }))}
          placeholder="Store XYZ"
        />
        <Input
          label="Address"
          value={form.address}
          onChangeText={text => setForm(prev => ({ ...prev, address: text }))}
          placeholder="123 Main Street"
        />
        <View style={styles.row}>
          <View style={styles.half}>
            <Input
              label="Store %"
              value={String(form.defaultStorePercent ?? 50)}
              onChangeText={text =>
                setForm(prev => ({ ...prev, defaultStorePercent: Number(text) }))
              }
              keyboardType="numeric"
            />
          </View>
          <View style={styles.half}>
            <Input
              label="Vendor %"
              value={String(form.defaultVendorPercent ?? 50)}
              onChangeText={text =>
                setForm(prev => ({ ...prev, defaultVendorPercent: Number(text) }))
              }
              keyboardType="numeric"
            />
          </View>
        </View>
        <View style={styles.actions}>
          <Button title={form.id ? 'Update Store' : 'Add Store'} onPress={handleSave} loading={loading} />
          {form.id ? <Button title="Cancel" onPress={resetForm} variant="secondary" /> : null}
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Existing Stores</Text>
      {stores.length === 0 && !loading ? (
        <Text style={styles.empty}>No stores yet.</Text>
      ) : (
        stores.map(store => (
          <Card key={store.id} style={styles.storeCard}>
            <Text style={styles.storeName}>{store.name}</Text>
            <Text style={styles.storeAddress}>{store.address}</Text>
            <Text style={styles.storeSplit}>
              Store {store.defaultStorePercent}% · Vendor {store.defaultVendorPercent}%
            </Text>
            <View style={styles.actions}>
              <Button title="Edit" onPress={() => handleEdit(store)} variant="secondary" />
              <Button title="Delete" onPress={() => handleDelete(store.id)} variant="danger" />
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    marginTop: spacing.xl,
    marginBottom: spacing.md,
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
  storeCard: {
    marginBottom: spacing.md,
  },
  storeName: {
    fontSize: fontSizes.h2,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  storeAddress: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  storeSplit: {
    fontSize: fontSizes.body,
    color: colors.accent,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  empty: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
  },
});
