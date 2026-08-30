import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { type Colors, fontSizes, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';
import { calculateVisit } from '../../helpers/calculations';
import { formatCurrency } from '../../helpers/formatters';
import { useVisit } from '../../hooks/useVisit';
import { saveVisitSplit } from '../../services/visits';

export default function SettlementScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { visitId, storeId } = useLocalSearchParams<{ visitId: string; storeId: string }>();
  const { ownerId } = useAuth();
  const router = useRouter();
  const { visit, loading, error, refresh } = useVisit(ownerId, storeId, visitId);
  const [saving, setSaving] = useState(false);

  const storePercent = visit?.storePercent ?? 0;
  const vendorPercent = visit?.vendorPercent ?? 0;
  const calculated = useMemo(
    () => visit && calculateVisit(visit.machines, storePercent),
    [visit, storePercent]
  );

  if (loading) return <Center text="Loading settlement split…" />;
  if (!visit) return <Center text={error || 'Visit not found.'} action={refresh} />;

  const handleContinue = async () => {
    if (!ownerId) return;
    setSaving(true);
    try {
      await saveVisitSplit(ownerId, visit.storeId, visit.id, storePercent, vendorPercent);
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
        <Text style={styles.locked}>Contact the owner to change the split.</Text>
        <View style={styles.splitRow}>
          <View style={styles.splitBox}>
            <Text style={styles.splitLabel}>Store %</Text>
            <Text style={styles.splitValue}>{storePercent}%</Text>
          </View>
          <View style={styles.splitBox}>
            <Text style={styles.splitLabel}>Games %</Text>
            <Text style={styles.splitValue}>{vendorPercent}%</Text>
          </View>
        </View>
      </Card>

      <View style={styles.amounts}>
        <Card style={styles.amountCard}>
          <Text style={styles.amountLabel}>Store amount</Text>
          <Text style={styles.amountValue}>{formatCurrency(calculated?.storeAmount ?? 0)}</Text>
        </Card>
        <Card style={styles.amountCard}>
          <Text style={styles.amountLabel}>Games amount</Text>
          <Text style={styles.amountValue}>{formatCurrency(calculated?.vendorAmount ?? 0)}</Text>
        </Card>
      </View>

      <Button
        title="Save Split and Continue"
        onPress={handleContinue}
        loading={saving}
        disabled={saving}
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

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
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
      gap: spacing.sm,
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: fontSizes.h2,
      fontWeight: '700',
    },
    locked: {
      color: colors.textMuted,
      fontSize: fontSizes.caption,
    },
    splitRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    splitBox: {
      flex: 1,
      minWidth: 120,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.surface,
    },
    splitLabel: {
      color: colors.textSecondary,
      fontSize: fontSizes.caption,
    },
    splitValue: {
      marginTop: spacing.xs,
      color: colors.textPrimary,
      fontSize: fontSizes.h2,
      fontWeight: '700',
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
