import { sendPasswordResetEmail } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { type Colors, fontSizes, radii, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { auth, db, functions } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { listStores } from '../../services/stores';
import { Employee, Store } from '../../types';

const createEmployeeFn = httpsCallable(functions, 'createEmployee');
const updateEmployeeAssignmentsFn = httpsCallable(functions, 'updateEmployeeAssignments');
const setEmployeeActiveFn = httpsCallable(functions, 'setEmployeeActive');
const resetEmployeeTemporaryPasswordFn = httpsCallable(functions, 'resetEmployeeTemporaryPassword');
const deleteEmployeeFn = httpsCallable(functions, 'deleteEmployee');

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
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [confirming, setConfirming] = useState<{ employee: Employee; nextActive: boolean } | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);

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
    setAddOpen(false);
  };

  const startEdit = (employee: Employee) => {
    if (editingEmployee?.id === employee.id) {
      resetForm();
      return;
    }
    setAddOpen(false);
    setEditingEmployee(employee);
    setName(employee.name || '');
    setEmail(employee.email || '');
    setPassword('');
    setAssignedStoreIds(employee.assignedStoreIds || []);
  };

  const handleSave = async () => {
    setMessage(null);
    if (!ownerId || !name.trim() || assignedStoreIds.length === 0) {
      setMessage({ type: 'error', text: 'Name and at least one assigned store are required.' });
      return;
    }
    if (editingEmployee) {
      if (password && !passwordComplexity.test(password)) {
        setMessage({
          type: 'error',
          text: 'New temporary password must be 10–128 characters with a letter, number, and special character.',
        });
        return;
      }
      setSaving(true);
      try {
        await updateEmployeeAssignmentsFn({ employeeId: editingEmployee.id, name: name.trim(), assignedStoreIds });
        if (password) {
          await resetEmployeeTemporaryPasswordFn({ employeeId: editingEmployee.id, password });
        }
        setMessage({ type: 'success', text: `${name.trim()} has been updated.` });
        resetForm();
        fetchEmployees();
      } catch (e: any) {
        setMessage({ type: 'error', text: e.message || 'Failed to update employee.' });
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!email.trim() || !passwordComplexity.test(password)) {
      setMessage({
        type: 'error',
        text: 'Email and a strong temporary password (10–128 chars with a letter, number, and special character) are required.',
      });
      return;
    }
    setSaving(true);
    try {
      await createEmployeeFn({ email: email.trim(), name: name.trim(), password, assignedStoreIds });
      setMessage({ type: 'success', text: `Employee ${name.trim()} added.` });
      resetForm();
      fetchEmployees();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to create employee.' });
    } finally {
      setSaving(false);
    }
  };

  const handleActiveChange = (employee: Employee) => {
    if (!ownerId) return;
    setMessage(null);
    setConfirming({ employee, nextActive: !employee.active });
  };

  const confirmActiveChange = async () => {
    if (!confirming || !ownerId) return;
    const { employee, nextActive } = confirming;
    setConfirming(null);
    try {
      await setEmployeeActiveFn({ employeeId: employee.id, active: nextActive });
      setMessage({ type: 'success', text: `${employee.name} is now ${nextActive ? 'active' : 'inactive'}.` });
      fetchEmployees();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to update employee status.' });
    }
  };

  const handleDelete = async () => {
    if (!deletingEmployee || !ownerId) return;
    const employee = deletingEmployee;
    setDeletingEmployee(null);
    setMessage(null);
    try {
      await deleteEmployeeFn({ employeeId: employee.id });
      setMessage({ type: 'success', text: `${employee.name} deleted.` });
      fetchEmployees();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to delete employee.' });
    }
  };

  const handlePasswordLink = async (employee: Employee) => {
    setMessage(null);
    try {
      await sendPasswordResetEmail(auth, employee.email);
      setMessage({ type: 'success', text: `Password setup link sent to ${employee.email}.` });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to send password link.' });
    }
  };

  const employeeForm = (isEditing: boolean) => (
    <Card style={styles.formCard}>
      <Input
        label="Name *"
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
        editable={!isEditing}
      />
      <Input
        label={isEditing ? 'New temporary password (optional)' : 'Temporary password *'}
        value={password}
        onChangeText={setPassword}
        placeholder={isEditing ? 'Only when resetting' : 'At least 10 characters with letter, number, and special'}
        secureTextEntry
      />
      <Text style={styles.fieldLabel}>Assigned stores</Text>
      <Text style={styles.fieldHint}>
        Inactive stores already assigned remain assigned. To remove one, deselect it.
      </Text>
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
        title={isEditing ? 'Update Employee' : 'Create Employee'}
        onPress={handleSave}
        disabled={saving}
        loading={saving}
      />
      <Button title="Cancel" onPress={resetForm} variant="secondary" disabled={saving} />
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
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Employees</Text>
      {!addOpen && !editingEmployee ? (
        <Button title="Add New Employee" onPress={() => { resetForm(); setAddOpen(true); }} variant="primary" />
      ) : null}
      {addOpen ? employeeForm(false) : null}

      {confirming ? (
        <View style={[styles.confirmBox, { backgroundColor: colors.glowAccent }]}>
          <Text style={styles.confirmText}>
            {confirming.nextActive
              ? `Reactivate ${confirming.employee.name}?`
              : `Deactivate ${confirming.employee.name}? They will not be able to sign in or run visits until reactivated.`}
          </Text>
          <View style={styles.confirmActions}>
            <Button title="Cancel" onPress={() => setConfirming(null)} variant="secondary" />
            <Button
              title={confirming.nextActive ? 'Reactivate' : 'Deactivate'}
              onPress={confirmActiveChange}
              variant={confirming.nextActive ? 'accent' : 'danger'}
            />
          </View>
        </View>
      ) : null}

      {deletingEmployee ? (
        <View style={[styles.confirmBox, { backgroundColor: colors.glowError }]}>
          <Text style={styles.confirmText}>
            Delete {deletingEmployee.name}? This cannot be undone.
          </Text>
          <View style={styles.confirmActions}>
            <Button title="Cancel" onPress={() => setDeletingEmployee(null)} variant="secondary" />
            <Button title="Delete" onPress={handleDelete} variant="danger" />
          </View>
        </View>
      ) : null}

      <Text style={styles.subtitle}>Existing employees</Text>
      {employees.length === 0 ? (
        <Text style={styles.empty}>No employees yet.</Text>
      ) : (
        employees.map(item => {
          const editing = editingEmployee?.id === item.id;
          return (
            <View key={item.id} style={styles.employeeCard}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.rowEmail}>{item.email}</Text>
                  <Text style={styles.rowMeta}>{item.assignedStoreIds?.length || 0} store(s) assigned · {item.active ? 'Active' : 'Inactive'}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
                  <Button title={editing ? 'Close' : 'Edit'} onPress={() => startEdit(item)} variant="secondary" compact />
                  <Button
                    title={item.active ? 'Deactivate' : 'Reactivate'}
                    onPress={() => handleActiveChange(item)}
                    variant={item.active ? 'danger' : 'accent'}
                    compact
                  />
                  <Button title="Link" onPress={() => handlePasswordLink(item)} variant="secondary" compact />
                  <Button title="Delete" onPress={() => setDeletingEmployee(item)} variant="danger" compact />
                </View>
              </View>
              {editing ? employeeForm(true) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: fontSizes.h1,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  formCard: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    padding: spacing.md,
  },
  fieldLabel: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  fieldHint: {
    fontSize: fontSizes.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
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
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
  },
  storeChoiceSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  storeChoiceText: {
    color: colors.textPrimary,
    fontSize: fontSizes.body,
  },
  storeChoiceTextSelected: {
    color: colors.textOnPrimary,
    fontWeight: '600',
    fontSize: fontSizes.body,
  },
  subtitle: {
    fontSize: fontSizes.h2,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowName: {
    fontSize: fontSizes.h3,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  rowEmail: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  rowMeta: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  employeeCard: {
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  empty: {
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  messageBox: {
    padding: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.sm,
  },
  messageText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmBox: {
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  confirmText: {
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
