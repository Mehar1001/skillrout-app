import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { type Colors, fontSizes, lineHeights, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate, formatTime } from '../../helpers/formatters';
import { useVisit } from '../../hooks/useVisit';
import { VisitMachine } from '../../types';

export default function ResultsScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { visitId, storeId } = useLocalSearchParams<{ visitId: string; storeId: string }>();
  const { ownerId } = useAuth();
  const router = useRouter();
  const { visit, loading, error, refresh } = useVisit(ownerId, storeId, visitId);

  if (loading) return <LoadingState />;
  if (!visit) return <ErrorState message={error} onRetry={refresh} />;
  const timestamp = visit.timestamp?.toDate?.();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>RUN RESULTS · COMPARISON</Text>
      <Text style={styles.title}>{visit.storeName}</Text>
      <View style={styles.runMeta}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>RUN DATE & TIME</Text>
          <Text style={styles.metaValue}>
            {timestamp ? `${formatDate(timestamp)} · ${formatTime(timestamp)}` : formatDate(visit.businessDate)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>EMPLOYEE</Text>
          <Text style={styles.metaValue}>{visit.employeeName}</Text>
        </View>
      </View>

      <ComparisonTable title="Last settled readings" machines={visit.machines} mode="last" />
      <ComparisonTable title="Present readings — this RUN" machines={visit.machines} mode="present" />

      <Text style={styles.guidance}>Confirm each machine’s Credits In and Total Paid values before continuing.</Text>
      <Button
        title="Continue to Calculations"
        onPress={() => router.push(`/calculation?visitId=${visit.id}&storeId=${visit.storeId}` as any)}
      />
    </ScrollView>
  );
}

const ComparisonTable = ({
  title,
  machines,
  mode,
}: {
  title: string;
  machines: VisitMachine[];
  mode: 'last' | 'present';
}) => { const colors = useColors(); const styles = makeStyles(colors); return (
  <Card style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.tableHeader}>
      <Text style={[styles.headerCell, styles.machineColumn, styles.machineHeader]}>MACHINE</Text>
      <Text style={[styles.headerCell, styles.valueColumn]}>{mode === 'last' ? 'LAST CREDITS IN' : 'PRESENT CREDITS IN'}</Text>
      <Text style={[styles.headerCell, styles.valueColumn]}>{mode === 'last' ? 'LAST TOTAL PAID' : 'PRESENT TOTAL PAID'}</Text>
    </View>
    {machines.map(machine => (
      <View key={machine.machineId} style={styles.tableRow}>
        <View style={styles.machineColumn}>
          <Text style={styles.machineName}>Machine {machine.machineNumber}</Text>
          {machine.name ? <Text style={styles.machineSubtitle}>{machine.name}</Text> : null}
          {mode === 'present' ? (
            machine.photoUrl ? (
              <Image
                source={{ uri: machine.photoUrl }}
                style={styles.photo}
                accessibilityLabel={`Machine ${machine.machineNumber} reading photo`}
              />
            ) : (
              <Text style={styles.noPhoto}>No photo</Text>
            )
          ) : null}
        </View>
        <Text style={[styles.amount, styles.valueColumn]}>
          {formatCurrency(mode === 'last' ? machine.lastSettledIn : machine.presentIn)}
        </Text>
        <Text style={[styles.amount, styles.valueColumn]}>
          {formatCurrency(mode === 'last' ? machine.lastSettledOut : machine.presentOut)}
        </Text>
      </View>
    ))}
  </Card>
); };

const LoadingState = () => { const colors = useColors(); const styles = makeStyles(colors); return (
  <View style={styles.center}>
    <ActivityIndicator size="large" color={colors.primary} />
    <Text style={styles.centerText}>Loading comparison…</Text>
  </View>
); };

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => { const colors = useColors(); const styles = makeStyles(colors); return (
  <View style={styles.center}>
    <Text style={styles.error}>{message || 'Visit not found.'}</Text>
    <Button title="Try Again" onPress={onRetry} />
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
  runMeta: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metaValue: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: fontSizes.caption,
    fontWeight: '600',
  },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSizes.h2,
    fontWeight: '700',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  machineColumn: {
    width: '42%',
    paddingHorizontal: spacing.sm,
  },
  valueColumn: {
    width: '29%',
    paddingHorizontal: spacing.xs,
  },
  headerCell: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'right',
  },
  machineHeader: {
    textAlign: 'left',
  },
  machineName: {
    color: colors.textPrimary,
    fontSize: fontSizes.caption,
    fontWeight: '700',
  },
  machineSubtitle: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 10,
  },
  noPhoto: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 10,
  },
  photo: {
    width: 34,
    height: 34,
    marginTop: spacing.xs,
    borderRadius: 6,
  },
  amount: {
    color: colors.textPrimary,
    fontSize: fontSizes.caption,
    fontWeight: '700',
    textAlign: 'right',
  },
  guidance: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    color: colors.textSecondary,
    fontSize: fontSizes.caption,
    lineHeight: lineHeights.caption,
    textAlign: 'center',
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
