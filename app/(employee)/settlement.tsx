import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { type Colors, fontSizes, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';
import { calculateVisit } from '../../helpers/calculations';
import { formatCurrency } from '../../helpers/formatters';
import { validatePercentages } from '../../helpers/validators';
import { useVisit } from '../../hooks/useVisit';
import { saveVisitSplit } from '../../services/visits';

export default function SettlementScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { visitId, storeId } = useLocalSearchParams<{ visitId: string; storeId: string }>();
  const { ownerId } = useAuth();
  const router = useRouter();
  const { visit, loading, error, refresh } = useVisit(ownerId, storeId, visitId);
  const [storePercent, setStorePercent] = useState('50');
  const [vendorPercent, setVendorPercent] = useState('50');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visit) return;
    setStorePercent(String(visit.storePercent));
    setVendorPercent(String(visit.vendorPercent));
  }, [visit]);

  const storeValue = Number(storePercent);
  const vendorValue = Number(vendorPercent);
  const validation = validatePercentages(storeValue, vendorValue);
  const calculated = useMemo(
    () => visit && !validation ? calculateVisit(visit.machines, storeValue) : null,
    [visit, validation, storeValue]
  );

  if (loading) return <Center text="Loading settlement split…" />;
  if (!visit) return <Center text={error || 'Visit not found.'} action={refresh} />;

  const handleContinue = async () => {
    if (!ownerId || validation) {
      Alert.alert('Invalid Split', validation || 'Unable to save this split.');
      return;
    }
    setSaving(true);
    try {
      await saveVisitSplit(ownerId, visit.storeId, visit.id, storeValue, vendorValue);
      router.push(`/outcome?visitId=${visit.id}&storeId=${visit.storeId}` as any);
    } catch (e: any) {
      Alert.alert('Split Error', e.message || 'The percentage split could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>RUN RESULTS · SETTLEMENT SPLIT</Text>
      <Text style={styles.title}>{visit.storeName}</Text>

      <Card style={styles.netCard}>
        <Text style={styles.netLabel}>Total Net</Text>
        <Text style={styles.netValue}>{formatCurrency(visit.totalNet)}</Text>
      </Card>

      <Card style={styles.splitCard}>
        <Text style={styles.sectionTitle}>Percentage split</Text>
        <View style={styles.inputs}>
          <View style={styles.half}>
            <Input
              label="Store %"
              value={storePercent}
              onChangeText={text => setStorePercent(text.replace(/[^\d.]/g, ''))}
              keyboardType="decimal-pad"
              error={validation || undefined}
            />
          </View>
          <View style={styles.half}>
            <Input
              label="Vendor %"
              value={vendorPercent}
              onChangeText={text => setVendorPercent(text.replace(/[^\d.]/g, ''))}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
        <View style={styles.totalCheck}>
          <Text style={styles.totalCheckLabel}>Total percentage</Text>
          <Text style={[styles.totalCheckValue, validation ? styles.invalid : styles.valid]}>
            {Number.isFinite(storeValue + vendorValue) ? storeValue + vendorValue : 0}% {validation ? '— must equal 100%' : '— valid'}
          </Text>
        </View>
      </Card>

      <View style={styles.amounts}>
        <Card style={styles.amountCard}>
          <Text style={styles.amountLabel}>Store amount</Text>
          <Text style={styles.amountValue}>{formatCurrency(calculated?.storeAmount ?? 0)}</Text>
        </Card>
        <Card style={styles.amountCard}>
          <Text style={styles.amountLabel}>Vendor amount</Text>
          <Text style={styles.amountValue}>{formatCurrency(calculated?.vendorAmount ?? 0)}</Text>
        </Card>
      </View>

      <Button
        title="Save Split and Continue"
        onPress={handleContinue}
        loading={saving}
        disabled={Boolean(validation) || saving}
      />
    </ScrollView>
  );
}

const Center = ({ text, action }: { text: string; action?: () => void }) => { const colors = useColors(); const styles = makeStyles(colors); return (
  <View style={styles.center}>
    {!action ? <ActivityIndicator size="large" color={colors.primary} /> : null}
    <Text style={action ? styles.error : styles.centerText}>{text}</Text>
    {action ? <Button title="Try Again" onPress={action} /> : null}
  </View>
); };

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
    minHeight: '100%',
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
  netCard: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    borderColor: colors.primary,
  },
  netLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.body,
  },
  netValue: {
    marginTop: spacing.sm,
    color: colors.primary,
    fontSize: fontSizes.h1,
    fontWeight: '700',
  },
  splitCard: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSizes.h2,
    fontWeight: '700',
  },
  inputs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  half: {
    flex: 1,
    minWidth: 160,
  },
  totalCheck: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalCheckLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.body,
  },
  totalCheckValue: {
    fontSize: fontSizes.body,
    fontWeight: '700',
  },
  valid: {
    color: colors.success,
  },
  invalid: {
    color: colors.error,
  },
  amounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  amountCard: {
    flex: 1,
    minWidth: 180,
  },
  amountLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.caption,
  },
  amountValue: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: fontSizes.h2,
    fontWeight: '700',
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
  centerText: {
    color: colors.textSecondary,
    fontSize: fontSizes.body,
  },
  error: {
    color: colors.error,
    fontSize: fontSizes.body,
  },
});
