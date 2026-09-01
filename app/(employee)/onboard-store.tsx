import { useRouter } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { type Colors, fontSizes, radii, spacing } from '../../constants/designTokens';
import { useAuth } from '../../contexts/AuthContext';
import { functions } from '../../firebaseConfig';
import { useColors } from '@/hooks/useColors';
import { validatePercentages } from '../../helpers/validators';

interface MachineRow {
  id: string;
  machineNumber: string;
  name: string;
  lastSettledIn: string;
  lastSettledOut: string;
}

const employeeOnboardStore = httpsCallable(functions, 'employeeOnboardStore');

export default function OnboardStoreScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const router = useRouter();
  useAuth();

  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [storePercent, setStorePercent] = useState('50');
  const [gamesPercent, setGamesPercent] = useState('50');
  const [machines, setMachines] = useState<MachineRow[]>([
    { id: '1', machineNumber: '1', name: '', lastSettledIn: '', lastSettledOut: '' },
  ]);
  const [nextId, setNextId] = useState(2);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const errors = useMemo(() => {
    const next: Record<string, string> = {};
    if (!submitted) return next;

    if (!storeName.trim()) next.name = 'Store name is required.';
    if (!address.trim()) next.address = 'Address is required.';

    const store = Number(storePercent);
    const games = Number(gamesPercent);
    const pctError = validatePercentages(store, games);
    if (pctError) next.percent = pctError;

    machines.forEach((machine, index) => {
      if (!machine.name.trim()) {
        next[`machineName_${index}`] = 'Machine name is required.';
      }
      const lastIn = Number(machine.lastSettledIn);
      const lastOut = Number(machine.lastSettledOut);
      if (machine.lastSettledIn.trim() === '' || isNaN(lastIn) || lastIn <= 0) {
        next[`lastSettledIn_${index}`] = 'Last IN must be greater than 0.';
      }
      if (machine.lastSettledOut.trim() === '' || isNaN(lastOut) || lastOut <= 0) {
        next[`lastSettledOut_${index}`] = 'Last OUT must be greater than 0.';
      }
    });

    return next;
  }, [submitted, storeName, address, storePercent, gamesPercent, machines]);

  const hasErrors = (): boolean => {
    const store = Number(storePercent);
    const games = Number(gamesPercent);
    return (
      !storeName.trim() ||
      !address.trim() ||
      !!validatePercentages(store, games) ||
      machines.some(m => {
        const lastIn = Number(m.lastSettledIn);
        const lastOut = Number(m.lastSettledOut);
        return (
          !m.name.trim() ||
          m.lastSettledIn.trim() === '' ||
          isNaN(lastIn) ||
          lastIn <= 0 ||
          m.lastSettledOut.trim() === '' ||
          isNaN(lastOut) ||
          lastOut <= 0
        );
      })
    );
  };

  const updateMachine = (id: string, field: keyof Omit<MachineRow, 'id'>, value: string) => {
    setMachines(prev =>
      prev.map(m => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const addMachine = () => {
    setMachines(prev => [
      ...prev,
      { id: String(nextId), machineNumber: String(prev.length + 1), name: '', lastSettledIn: '', lastSettledOut: '' },
    ]);
    setNextId(n => n + 1);
  };

  const removeMachine = (id: string) => {
    setMachines(prev =>
      prev.length > 1
        ? prev.filter(machine => machine.id !== id).map((machine, index) => ({ ...machine, machineNumber: String(index + 1) }))
        : prev
    );
  };

  const handleSave = async () => {
    setMessage(null);
    setSubmitted(true);

    if (hasErrors()) return;

    setSaving(true);
    try {
      await employeeOnboardStore({
        name: storeName.trim(),
        address: address.trim(),
        defaultStorePercent: Number(storePercent),
        defaultVendorPercent: Number(gamesPercent),
        machines: machines.map((m, index) => ({
          machineNumber: String(index + 1),
          name: m.name.trim(),
          lastSettledIn: Number(m.lastSettledIn),
          lastSettledOut: Number(m.lastSettledOut),
        })),
      });
      router.replace('/select-store' as any);
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to onboard store. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Onboard Store</Text>

      <Card style={styles.formCard}>
        <Input
          label="Store name"
          value={storeName}
          onChangeText={setStoreName}
          placeholder="Store name"
          error={errors.name}
        />
        <Input
          label="Address"
          value={address}
          onChangeText={setAddress}
          placeholder="Store address"
          error={errors.address}
        />

        <View style={styles.percentRow}>
          <View style={styles.half}>
            <Input
              label="Store %"
              value={storePercent}
              onChangeText={setStorePercent}
              keyboardType="numeric"
              error={errors.percent}
            />
          </View>
          <View style={styles.half}>
            <Input
              label="Games %"
              value={gamesPercent}
              onChangeText={setGamesPercent}
              keyboardType="numeric"
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>Machines</Text>
        {machines.map((machine, index) => (
          <View key={machine.id} style={styles.machineRow}>
            <View style={styles.machineInputs}>
              <View style={styles.machineNumberField}>
                <Input
                  style={styles.machineInput}
                  label={index === 0 ? 'Number' : undefined}
                  placeholder="1"
                  value={String(index + 1)}
                  editable={false}
                />
              </View>
              <Input
                style={styles.machineInput}
                label={index === 0 ? 'Machine name' : undefined}
                placeholder="Name"
                value={machine.name}
                onChangeText={text => updateMachine(machine.id, 'name', text)}
                error={errors[`machineName_${index}`]}
              />
              <Input
                style={styles.machineInput}
                label={index === 0 ? 'Last IN' : undefined}
                placeholder="Last IN"
                value={machine.lastSettledIn}
                onChangeText={text => updateMachine(machine.id, 'lastSettledIn', text)}
                keyboardType="decimal-pad"
                error={errors[`lastSettledIn_${index}`]}
              />
              <Input
                style={styles.machineInput}
                label={index === 0 ? 'Last OUT' : undefined}
                placeholder="Last OUT"
                value={machine.lastSettledOut}
                onChangeText={text => updateMachine(machine.id, 'lastSettledOut', text)}
                keyboardType="decimal-pad"
                error={errors[`lastSettledOut_${index}`]}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove machine ${index + 1}`}
              onPress={() => removeMachine(machine.id)}
              disabled={machines.length === 1}
              style={({ pressed }) => [
                styles.removeButton,
                {
                  opacity: machines.length === 1 ? 0.35 : pressed ? 0.6 : 1,
                },
              ]}
            >
              <Text style={styles.removeText}>×</Text>
            </Pressable>
          </View>
        ))}

        <Button
          title="Add another machine"
          onPress={addMachine}
          variant="secondary"
        />

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

        <View style={styles.saveButton}>
          <Button
            title="Save store & machines"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
          />
        </View>
      </Card>
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
  formCard: {
    marginBottom: spacing.md,
  },
  percentRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  half: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: fontSizes.h3,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  machineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  machineInputs: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  machineNumberField: {
    width: 120,
    maxWidth: '100%',
  },
  machineInput: {
    flex: 1,
    minWidth: 120,
  },
  removeButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  removeText: {
    fontSize: fontSizes.h2,
    color: colors.error,
    fontWeight: '700',
    lineHeight: fontSizes.h2,
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
  saveButton: {
    marginTop: spacing.lg,
  },
});
