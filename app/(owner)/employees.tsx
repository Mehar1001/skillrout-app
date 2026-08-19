import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { colors, spacing } from '../../constants/designTokens';
import { db, functions } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { listStores } from '../../services/stores';
import { Employee, Store } from '../../types';

const createEmployeeFn = httpsCallable(functions, 'createEmployee');

export default function EmployeesScreen() {
  const { user, ownerId } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [assignedStoreIds, setAssignedStoreIds] = useState<string[]>([]);

  const fetchEmployees = useCallback(async () => {
    if (!ownerId) return;
    const q = query(collection(db, 'employees'), where('ownerId', '==', ownerId));
    const snap = await getDocs(q);
    setEmployees(
      snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      } as Employee))
    );
  }, [ownerId]);

  useEffect(() => {
    if (!user || !ownerId) return;
    fetchEmployees();
    listStores(ownerId).then(data => setStores(data.filter(store => store.active)));
  }, [user, ownerId, fetchEmployees]);

  const handleCreate = async () => {
    if (!ownerId || !name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Required', 'Name, email, and password are required.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    if (assignedStoreIds.length === 0) {
      Alert.alert('Required', 'Assign at least one store.');
      return;
    }
    setSaving(true);
    try {
      await createEmployeeFn({ email: email.trim(), name: name.trim(), password, assignedStoreIds });
      Alert.alert('Created', `Employee ${name.trim()} added.`);
      setName('');
      setEmail('');
      setPassword('');
      setAssignedStoreIds([]);
      fetchEmployees();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create employee.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Employees</Text>
      <View style={styles.form}>
        <Input
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Employee name"
        />
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="employee@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          secureTextEntry
        />
        <Text style={styles.fieldLabel}>Assigned stores</Text>
        <View style={styles.storeChoices}>
          {stores.map(store => {
            const selected = assignedStoreIds.includes(store.id);
            return (
              <Pressable
                key={store.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                onPress={() =>
                  setAssignedStoreIds(current =>
                    selected ? current.filter(id => id !== store.id) : [...current, store.id]
                  )
                }
                style={[styles.storeChoice, selected && styles.storeChoiceSelected]}
              >
                <Text style={[styles.storeChoiceText, selected && styles.storeChoiceTextSelected]}>
                  {selected ? 'Selected: ' : ''}{store.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Button
          title="Create Employee"
          onPress={handleCreate}
          disabled={saving}
          loading={saving}
        />
      </View>

      <Text style={styles.subtitle}>Existing employees</Text>
      <FlatList
        data={employees}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No employees yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowEmail}>{item.email}</Text>
              <Text style={styles.rowEmail}>{item.assignedStoreIds?.length || 0} store(s) assigned</Text>
            </View>
            <Text style={[styles.status, { color: item.active ? colors.success : colors.textMuted }]}>
              {item.active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  form: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  storeChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  storeChoice: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  storeChoiceSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  storeChoiceText: {
    color: colors.textPrimary,
  },
  storeChoiceTextSelected: {
    color: colors.surface,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowName: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  rowEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  status: {
    fontSize: 13,
    fontWeight: '600',
  },
  empty: {
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
