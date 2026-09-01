import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { type Colors, fontSizes, radii, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../helpers/formatters';
import { listMachines } from '../../services/machines';
import { getStore } from '../../services/stores';
import { Machine, Store } from '../../types';

export default function StoreDetailScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const { ownerId } = useAuth();
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ownerId || !storeId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [s, m] = await Promise.all([getStore(ownerId, storeId), listMachines(ownerId, storeId)]);
        if (cancelled) return;
        setStore(s);
        setMachines(m.filter(machine => machine.active));
      } catch (e: any) {
        if (cancelled) return;
        setError(e.message || 'Unable to load store details.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ownerId, storeId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Button title="Back" onPress={() => router.back()} variant="secondary" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.backRow}>
        <Button title="Back" onPress={() => router.back()} variant="secondary" compact />
      </View>
      {store ? (
        <>
          <Text style={styles.eyebrow}>STORE DETAILS</Text>
          <Text style={styles.title}>{store.name}</Text>
          <Text style={styles.address}>{store.address}</Text>
          <Text style={styles.split}>
            Default split: {store.defaultStorePercent}% / {store.defaultVendorPercent}%
          </Text>
        </>
      ) : null}

      <View style={styles.actions}>
        <Button
          title="Add Machine"
          onPress={() => router.push(`/add-machine?storeId=${storeId}` as any)}
        />
      </View>

      <Text style={styles.sectionTitle}>Machines</Text>
      {machines.length === 0 ? (
        <Card>
          <Text style={styles.empty}>No machines yet. Add the first one above.</Text>
        </Card>
      ) : (
        machines.map(machine => (
          <Card key={machine.id} style={styles.machineCard}>
            <View style={styles.machineRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.machineName}>{machine.name}</Text>
                <Text style={styles.machineNumber}>{machine.machineNumber}</Text>
              </View>
              <View style={styles.baselineGroup}>
                <View style={styles.baselineBox}>
                  <Text style={styles.baselineLabel}>Last IN</Text>
                  <Text style={styles.baselineValue}>{formatCurrency(machine.lastSettledIn)}</Text>
                </View>
                <View style={styles.baselineBox}>
                  <Text style={styles.baselineLabel}>Last OUT</Text>
                  <Text style={styles.baselineValue}>{formatCurrency(machine.lastSettledOut)}</Text>
                </View>
              </View>
            </View>
          </Card>
        ))
      )}
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
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  error: {
    color: colors.error,
    fontSize: fontSizes.body,
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
  address: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: fontSizes.body,
  },
  split: {
    marginTop: spacing.xs,
    color: colors.primary,
    fontSize: fontSizes.caption,
    fontWeight: '600',
  },
  actions: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSizes.h2,
    fontWeight: '700',
  },
  empty: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
  },
  machineCard: {
    marginBottom: spacing.md,
  },
  machineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  machineNumber: {
    color: colors.textMuted,
    fontSize: fontSizes.caption,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  machineName: {
    color: colors.textPrimary,
    fontSize: fontSizes.h3,
    fontWeight: '700',
  },
  baselineGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  baselineBox: {
    minWidth: 120,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    alignItems: 'flex-end',
  },
  baselineLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.caption,
    fontWeight: '600',
  },
  baselineValue: {
    color: colors.textPrimary,
    fontSize: fontSizes.body,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
});
