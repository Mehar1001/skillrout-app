import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { type Colors, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { db, functions } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { listStores } from '../../services/stores';
import { Employee, Store } from '../../types';

const createEmployeeFn = httpsCallable(functions, 'createEmployee');
const updateEmployeeAssignmentsFn = httpsCallable(functions, 'updateEmployeeAssignments');
const setEmployeeActiveFn = httpsCallable(functions, 'setEmployeeActive');
const resetEmployeeTemporaryPasswordFn = httpsCallable(functions, 'resetEmployeeTemporaryPassword');

const passwordComplexity = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,128}$/;

export default function EmployeesScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { user, ownerId } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
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

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setAssignedStoreIds([]);
    setEditingEmployee(null);
  };

  const startEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setName(employee.name || '');
    setEmail(employee.email || '');
    setPassword('');
    setAssignedStoreIds(employee.assignedStoreIds || []);
  };

  const handleSave = async () => {
    if (!ownerId || !name.trim() || assignedStoreIds.length === 0) {
      Alert.alert('Required', 'Name and at least one assigned store are required.');
      return;
    }
    if (editingEmployee) {
      if (password && !passwordComplexity.test(password)) {
        Alert.alert('Weak Password', 'New temporary password must be 10–128 characters with a letter, number, and special character.');
        return;
      }
      setSaving(true);
      try {
        await updateEmployeeAssignmentsFn({ employeeId: editingEmployee.id, name: name.trim(), assignedStoreIds });
        if (password) {
          await resetEmployeeTemporaryPasswordFn({ employeeId: editingEmployee.id, password });
        }
        Alert.alert('Updated', `${name.trim()} has been updated.`);
        resetForm();
        fetchEmployees();
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to update employee.');
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!email.trim() || !passwordComplexity.test(password)) {
      Alert.alert('Required', 'Email and a strong temporary password (10–128 chars) are required.');
      return;
    }
    setSaving(true);
    try {
      await createEmployeeFn({ email: email.trim(), name: name.trim(), password, assignedStoreIds });
      Alert.alert('Created', `Employee ${name.trim()} added.`);
      resetForm();
      fetchEmployees();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create employee.');
    } finally {
      setSaving(false);
    }
  };

  const handleActiveChange = (employee: Employee) => {
    if (!ownerId) return;
    const nextActive = !employee.active;
    Alert.alert(
      nextActive ? 'Reactivate Employee' : 'Deactivate Employee',
      nextActive
        ? `Reactivate ${employee.name}?`
        : `Deactivate ${employee.name}? They will not be able to sign in or run visits until reactivated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: nextActive ? 'Reactivate' : 'Deactivate',
          style: nextActive ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await setEmployeeActiveFn({ employeeId: employee.id, active: nextActive });
              fetchEmployees();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to update employee status.');
            }
          },
        },
      ]
    );
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
          editable={!editingEmployee}
        />
        <Input
          label={editingEmployee ? 'New temporary password (optional)' : 'Temporary password'}
          value={password}
          onChangeText={setPassword}
          placeholder={editingEmployee ? 'Only when resetting' : 'At least 10 characters with letter, number, and special'}
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
          title={editingEmployee ? 'Update Employee' : 'Create Employee'}
          onPress={handleSave}
          disabled={saving}
          loading={saving}
        />
        {editingEmployee ? (
          <Button title="Cancel" onPress={resetForm} variant="secondary" disabled={saving} />
        ) : null}
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
              <Text style={styles.rowEmail}>{item.assignedStoreIds?.length || 0} store(s) assigned · {item.active ? 'Active' : 'Inactive'}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <Button title="Edit" onPress={() => startEdit(item)} variant="secondary" />
              <Button
                title={item.active ? 'Deactivate' : 'Reactivate'}
                onPress={() => handleActiveChange(item)}
                variant={item.active ? 'danger' : 'accent'}
              />
            </View>
          </View>
        )}
      />
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
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
  empty: {
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
