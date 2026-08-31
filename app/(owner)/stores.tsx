import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { listStores, saveStore, setStoreActive } from '../../services/stores';
import { Store } from '../../types';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { type Colors, fontSizes, radii, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { confirm } from '../../helpers/alert';
import { validatePercentages } from '../../helpers/validators';

export default function StoresScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { user, ownerId } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<Partial<Store>>({
    id: '',
    name: '',
    address: '',
    phone: '',
    active: true,
    defaultStorePercent: 50,
    defaultVendorPercent: 50,
  });

  const fetchStores = useCallback(async () => {
    if (!user || !ownerId) return;
    setLoading(true);
    const data = await listStores(ownerId);
    setStores(data);
    setLoading(false);
  }, [user, ownerId]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const resetForm = () => {
    setForm({
      id: '',
      name: '',
      address: '',
      phone: '',
      active: true,
      defaultStorePercent: 50,
      defaultVendorPercent: 50,
    });
    setAddOpen(false);
  };

  const handleEdit = (store: Store) => {
    setAddOpen(false);
    setExpandedStoreId(store.id);
    setForm({ ...store });
  };

  const handleSave = async () => {
    setMessage(null);
    if (!user || !ownerId || !form.name?.trim()) {
      setMessage({ type: 'error', text: 'Store name is required.' });
      return;
    }
    const pctError = validatePercentages(
      Number(form.defaultStorePercent) || 0,
      Number(form.defaultVendorPercent) || 0
    );
    if (pctError) {
      setMessage({ type: 'error', text: pctError });
      return;
    }
    try {
      await saveStore(ownerId, form);
      setMessage({ type: 'success', text: `Store ${form.name?.trim()} saved.` });
      resetForm();
      fetchStores();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to save store.' });
    }
  };

  const handleActiveChange = (store: Store) => {
    if (!user || !ownerId) return;
    setMessage(null);
    const nextActive = !store.active;
    confirm(
      nextActive ? 'Reactivate Store' : 'Deactivate Store',
      nextActive
        ? `Reactivate ${store.name}?`
        : `Deactivate ${store.name}? Historical visits will remain available, but employees cannot start new visits here.`,
      async () => {
        try {
          await setStoreActive(ownerId, store.id, nextActive);
          fetchStores();
        } catch (e: any) {
          setMessage({ type: 'error', text: e.message || 'Failed to update store.' });
        }
      }
    );
  };

  const filteredStores = stores.filter(store => {
    const matchesSearch =
      store.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (store.address || '').toLowerCase().includes(searchText.toLowerCase());
    const matchesFilter =
      activeFilter === 'all' ? true : activeFilter === 'active' ? store.active : !store.active;
    return matchesSearch && matchesFilter;
  });

  const StoreForm = () => (
    <Card style={styles.formCard}>
      <Input
        label="Store Name *"
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
      <Input
        label="Phone (optional)"
        value={form.phone}
        onChangeText={text => setForm(prev => ({ ...prev, phone: text }))}
        placeholder="(555) 123-4567"
        keyboardType="phone-pad"
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
            label="Games %"
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
        <Button title="Cancel" onPress={resetForm} variant="secondary" />
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
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Stores</Text>

      {addOpen ? <StoreForm /> : (
        <Button
          title="Add New Store"
          onPress={() => { resetForm(); setAddOpen(true); }}
          variant="primary"
        />
      )}

      <View style={styles.searchRow}>
        <TextInput
          style={[styles.searchInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
          placeholder="Search stores…"
          placeholderTextColor={colors.textMuted}
          value={searchText}
          onChangeText={setSearchText}
          accessibilityLabel="Search stores"
        />
        <View style={styles.filterRow}>
          {(['all', 'active', 'inactive'] as const).map(filter => (
            <Pressable
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[
                styles.filterChip,
                activeFilter === filter && { backgroundColor: colors.primary },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: activeFilter === filter }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === filter && { color: colors.textOnPrimary },
                ]}
              >
                {filter === 'all' ? 'All' : filter === 'active' ? 'Active' : 'Inactive'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Existing Stores</Text>
      {filteredStores.length === 0 && !loading ? (
        <Text style={styles.empty}>
          {stores.length === 0 ? 'No stores yet.' : 'No stores match your search.'}
        </Text>
      ) : (
        filteredStores.map(store => {
          const editing = form.id === store.id;
          const expanded = editing || expandedStoreId === store.id;
          return (
            <View key={store.id} style={styles.storeCard}>
              <Card style={styles.storeCardInner}>
                <Pressable
                  onPress={() => setExpandedStoreId(editing || expanded ? null : store.id)}
                  style={styles.storeHeader}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.storeName}>{store.name}</Text>
                    <Text style={styles.storeSplit}>
                      Store {store.defaultStorePercent}% · Games {store.defaultVendorPercent}% · {store.active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>
                {expanded ? (
                  <View style={styles.storeBody}>
                    {store.address ? <Text style={styles.storeAddress}>{store.address}</Text> : null}
                    {store.phone ? <Text style={styles.storePhone}>{store.phone}</Text> : null}
                    <View style={styles.actions}>
                      <Button title={editing ? 'Close' : 'Edit'} onPress={() => handleEdit(store)} variant="secondary" />
                      <Button
                        title={store.active ? 'Deactivate' : 'Reactivate'}
                        onPress={() => handleActiveChange(store)}
                        variant={store.active ? 'danger' : 'accent'}
                      />
                    </View>
                  </View>
                ) : null}
              </Card>
              {editing ? <StoreForm /> : null}
            </View>
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
    gap: spacing.sm,
  },
  storeCardInner: {
    padding: spacing.md,
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
  storePhone: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  storeSplit: {
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    fontWeight: '700',
  },
  searchRow: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
    fontSize: fontSizes.body,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterChip: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  filterChipText: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'capitalize',
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
    gap: spacing.xs,
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
