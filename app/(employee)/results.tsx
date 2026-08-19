import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { colors, fontSizes, lineHeights, spacing } from '../../constants/designTokens';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate, formatTime } from '../../helpers/formatters';
import { useVisit } from '../../hooks/useVisit';

export default function ResultsScreen() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const { ownerId } = useAuth();
  const router = useRouter();
  const { visit, loading, error, refresh } = useVisit(ownerId, visitId);

  if (loading) return <LoadingState />;
  if (!visit) return <ErrorState message={error} onRetry={refresh} />;
  const timestamp = visit.timestamp?.toDate?.();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>RUN RESULTS · COMPARISON</Text>
      <Text style={styles.title}>{visit.storeName}</Text>
      <Text style={styles.meta}>
        Business date: {formatDate(visit.businessDate)}
        {timestamp ? ` · Recorded ${formatDate(timestamp)} at ${formatTime(timestamp)}` : ''}
      </Text>
      <Text style={styles.meta}>Employee: {visit.employeeName}</Text>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Last settled readings</Text>
        {visit.machines.map(machine => (
          <View key={machine.machineId} style={styles.machineRow}>
            <View style={styles.machineInfo}>
              <Text style={styles.machineName}>Machine {machine.machineNumber}</Text>
              {machine.name ? <Text style={styles.machineSubtitle}>{machine.name}</Text> : null}
            </View>
            <Reading label="Last IN" value={machine.lastSettledIn} />
            <Reading label="Last OUT" value={machine.lastSettledOut} />
          </View>
        ))}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Present readings — this RUN</Text>
        {visit.machines.map(machine => (
          <View key={machine.machineId} style={styles.machineRow}>
            <View style={styles.machineInfo}>
              <Text style={styles.machineName}>Machine {machine.machineNumber}</Text>
              {machine.photoUrl ? (
                <Image source={{ uri: machine.photoUrl }} style={styles.photo} accessibilityLabel={`Machine ${machine.machineNumber} reading photo`} />
              ) : (
                <Text style={styles.noPhoto}>No photo</Text>
              )}
            </View>
            <Reading label="Present IN" value={machine.presentIn} />
            <Reading label="Present OUT" value={machine.presentOut} />
          </View>
        ))}
      </Card>

      <Button
        title="Continue to Calculations"
        onPress={() => router.push(`/calculation?visitId=${visit.id}` as any)}
      />
    </ScrollView>
  );
}

const Reading = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.reading}>
    <Text style={styles.readingLabel}>{label}</Text>
    <Text style={styles.readingValue}>{formatCurrency(value)}</Text>
  </View>
);

const LoadingState = () => (
  <View style={styles.center}>
    <ActivityIndicator size="large" color={colors.primary} />
    <Text style={styles.centerText}>Loading comparison…</Text>
  </View>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <View style={styles.center}>
    <Text style={styles.error}>{message || 'Visit not found.'}</Text>
    <Button title="Try Again" onPress={onRetry} />
  </View>
);

const styles = StyleSheet.create({
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
  meta: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
  },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSizes.h2,
    fontWeight: '700',
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
  noPhoto: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: fontSizes.caption,
  },
  photo: {
    width: 44,
    height: 44,
    marginTop: spacing.xs,
    borderRadius: 8,
  },
  reading: {
    minWidth: 120,
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.surfaceSecondary,
  },
  readingLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.caption,
  },
  readingValue: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: fontSizes.body,
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
