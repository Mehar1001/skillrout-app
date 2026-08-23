import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { type Colors, fontSizes, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../helpers/formatters';
import { useVisit } from '../../hooks/useVisit';

export default function CalculationScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const { ownerId } = useAuth();
  const router = useRouter();
  const { visit, loading, error, refresh } = useVisit(ownerId, visitId);

  if (loading) return <Center text="Calculating RUN…" />;
  if (!visit) return <Center text={error || 'Visit not found.'} action={refresh} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>RUN RESULTS · CALCULATION</Text>
      <Text style={styles.title}>{visit.storeName}</Text>
      <Text style={styles.subtitle}>New activity is calculated from Last Settled versus Credits In and Total Paid readings.</Text>

      <Card style={styles.card}>
        {visit.machines.map(machine => (
          <View key={machine.machineId} style={styles.machineRow}>
            <View style={styles.machineInfo}>
              <Text style={styles.machineName}>Machine {machine.machineNumber}</Text>
              {machine.name ? <Text style={styles.machineSubtitle}>{machine.name}</Text> : null}
            </View>
            <Amount label="New Credits In" value={machine.newIn} />
            <Amount label="New Total Paid" value={machine.newOut} />
            <Amount label="Net" value={machine.machineNet} emphasis />
          </View>
        ))}
      </Card>

      <Card style={styles.totalsCard}>
        <Text style={styles.totalsTitle}>Totals</Text>
        <View style={styles.totalRow}>
          <Amount label="Total Money In" value={visit.totalNewIn} />
          <Amount label="Total Money Out" value={visit.totalNewOut} />
          <Amount label="Total Net" value={visit.totalNet} emphasis />
        </View>
      </Card>

      <Button
        title="Continue to Settlement Split"
        onPress={() => router.push(`/settlement?visitId=${visit.id}` as any)}
      />
    </ScrollView>
  );
}

const Amount = ({ label, value, emphasis = false }: { label: string; value: number; emphasis?: boolean }) => { const colors = useColors(); const styles = makeStyles(colors); return (
  <View style={[styles.amount, emphasis ? styles.amountEmphasis : null]}>
    <Text style={styles.amountLabel}>{label}</Text>
    <Text style={[styles.amountValue, emphasis ? styles.amountValueEmphasis : null]}>{formatCurrency(value)}</Text>
  </View>
); };

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
  subtitle: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: fontSizes.body,
  },
  card: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  machineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  machineInfo: {
    flex: 1,
    minWidth: 140,
  },
  machineName: {
    color: colors.textPrimary,
    fontSize: fontSizes.body,
    fontWeight: '700',
  },
  machineSubtitle: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: fontSizes.caption,
  },
  amount: {
    minWidth: 115,
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.surfaceSecondary,
  },
  amountEmphasis: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  amountLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.caption,
  },
  amountValue: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: fontSizes.body,
    fontWeight: '700',
  },
  amountValueEmphasis: {
    color: colors.primary,
  },
  totalsCard: {
    marginBottom: spacing.lg,
    borderColor: colors.primary,
  },
  totalsTitle: {
    marginBottom: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSizes.h2,
    fontWeight: '700',
  },
  totalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
