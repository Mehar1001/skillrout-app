import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { CurrencyInput } from '../../components/CurrencyInput';
import { Input } from '../../components/Input';
import { type Colors, fontSizes, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';
import { getStore } from '../../services/stores';
import { employeeAddMachine, getNextMachineNumber, validateMachineNumberFormat, validateMachineNumberUnique } from '../../services/machines';
import { Store } from '../../types';

export default function AddMachineScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const { ownerId } = useAuth();
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);
  const [machineNumber, setMachineNumber] = useState('');
  const [name, setName] = useState('');
  const [lastSettledIn, setLastSettledIn] = useState<number | null>(null);
  const [lastSettledOut, setLastSettledOut] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!ownerId || !storeId) return;
    getStore(ownerId, storeId)
      .then(setStore)
      .catch(() => Alert.alert('Error', 'Store could not be loaded.'))
      .finally(() => setStoreLoading(false));
    getNextMachineNumber(ownerId, storeId)
      .then(setMachineNumber)
      .catch(() => {});
  }, [ownerId, storeId]);

  const validate = async () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Machine name is required.';

    const formatCheck = validateMachineNumberFormat(machineNumber);
    if (!formatCheck.valid) {
      next.machineNumber = formatCheck.error || 'Invalid machine number.';
    }

    if (lastSettledIn === null || lastSettledIn <= 0) {
      next.lastSettledIn = 'Initial IN must be greater than $0.00.';
    }
    if (lastSettledOut === null || lastSettledOut <= 0) {
      next.lastSettledOut = 'Initial OUT must be greater than $0.00.';
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return false;

    if (ownerId && storeId) {
      const uniquenessCheck = await validateMachineNumberUnique(ownerId, storeId, machineNumber);
      if (!uniquenessCheck.valid) {
        setErrors({ machineNumber: uniquenessCheck.error || 'Machine number already in use.' });
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    const isValid = await validate();
    if (!isValid || !ownerId || !storeId || !store) return;
    setSaving(true);
    try {
      await employeeAddMachine(ownerId, storeId, {
        machineNumber: machineNumber.trim(),
        name: name.trim(),
        lastSettledIn: lastSettledIn ?? 0,
        lastSettledOut: lastSettledOut ?? 0,
      });
      router.replace(`/store-detail?storeId=${storeId}` as any);
    } catch (e: any) {
      Alert.alert('Add Machine Error', e.message || 'The machine could not be added.');
    } finally {
      setSaving(false);
    }
  };

  if (storeLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.backRow}>
        <Button title="Back" onPress={() => router.back()} variant="secondary" compact />
      </View>
      <Text style={styles.eyebrow}>ADD MACHINE</Text>
      <Text style={styles.title}>{store ? store.name : 'Store'}</Text>
      <Text style={styles.subtitle}>
        Enter a machine number (positive integer), name, and the starting initial IN/OUT values.
      </Text>

      <Card style={styles.form}>
        <View style={styles.machineNumberField}>
          <Input
            label="Number"
            value={machineNumber}
            error={errors.machineNumber}
            placeholder="1"
            editable={true}
            keyboardType="numeric"
            onChangeText={setMachineNumber}
          />
        </View>
        <Input
          label="Machine name *"
          value={name}
          onChangeText={setName}
          error={errors.name}
          placeholder="e.g. Simon's"
        />
        <View style={styles.baselineRow}>
          <View style={styles.baselineField}>
            <CurrencyInput
              label="Initial IN *"
              value={lastSettledIn}
              onChangeValue={setLastSettledIn}
              error={errors.lastSettledIn}
              placeholder="0.00"
            />
          </View>
          <View style={styles.baselineField}>
            <CurrencyInput
              label="Initial OUT *"
              value={lastSettledOut}
              onChangeValue={setLastSettledOut}
              error={errors.lastSettledOut}
              placeholder="0.00"
            />
          </View>
        </View>
      </Card>

      <Button title="Save Machine" onPress={handleSave} loading={saving} disabled={saving} />
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
    minHeight: '100%',
  },
  center: {
    flex: 1,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  backRow: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
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
  subtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    color: colors.textSecondary,
    fontSize: fontSizes.body,
  },
  form: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  machineNumberField: {
    width: 120,
    maxWidth: '100%',
  },
  baselineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  baselineField: {
    flex: 1,
    minWidth: 140,
  },
});
