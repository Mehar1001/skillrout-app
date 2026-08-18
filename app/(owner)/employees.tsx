import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { colors, spacing } from '../../constants/designTokens';
import { db, functions } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { Employee } from '../../types';

const createEmployeeFn = httpsCallable(functions, 'createEmployee');

export default function EmployeesScreen() {
  const { user, ownerId } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const fetchEmployees = async () => {
    if (!ownerId) return;
    const q = query(collection(db, 'employees'), where('ownerId', '==', ownerId));
    const snap = await getDocs(q);
    setEmployees(
      snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      } as Employee))
    );
  };

  useEffect(() => {
    if (!user || !ownerId) return;
    fetchEmployees();
  }, [user, ownerId]);

  const handleCreate = async () => {
    if (!ownerId || !name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Required', 'Name, email, and password are required.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    try {
      await createEmployeeFn({ email: email.trim(), name: name.trim(), password });
      Alert.alert('Created', `Employee ${name.trim()} added.`);
      setName('');
      setEmail('');
      setPassword('');
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
