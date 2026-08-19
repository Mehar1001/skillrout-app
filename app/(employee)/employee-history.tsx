import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { colors, fontSizes, spacing } from '../../constants/designTokens';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate, formatTime } from '../../helpers/formatters';
import { listAssignedStoreVisits, listVisits } from '../../services/visits';
import { Visit } from '../../types';
import { useRouter } from 'expo-router';

export default function EmployeeHistoryScreen() {
  const { ownerId, role, assignedStoreIds } = useAuth();
  const router = useRouter();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchVisits = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    setError('');
    try {
      setVisits(role === 'owner' ? await listVisits(ownerId) : await listAssignedStoreVisits(ownerId, assignedStoreIds));
    } catch (e: any) {
      setError(e.message || 'Unable to load history.');
    } finally {
      setLoading(false);
    }
  }, [ownerId, role, assignedStoreIds]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heading}>
        <View style={styles.headingText}>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>All recorded RUNs for your assigned stores.</Text>
        </View>
        <Button title="Refresh" onPress={fetchVisits} variant="secondary" disabled={loading} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Loading history…</Text>
        </View>
      ) : error ? (
        <Card style={styles.stateCard}>
          <Text style={styles.error}>{error}</Text>
          <Button title="Try Again" onPress={fetchVisits} />
        </Card>
      ) : visits.length === 0 ? (
        <Card style={styles.stateCard}>
          <Text style={styles.emptyTitle}>No visits yet</Text>
          <Text style={styles.stateText}>Every completed RUN will appear here.</Text>
        </Card>
      ) : (
        visits.map(visit => {
          const timestamp = visit.timestamp?.toDate?.();
          return (
            <Card key={visit.id} style={styles.visitCard}>
              <View style={styles.visitHeader}>
                <View style={styles.visitHeaderText}>
                  <Text style={styles.store}>{visit.storeName}</Text>
                  <Text style={styles.meta}>
                    {timestamp ? `${formatDate(timestamp)} at ${formatTime(timestamp)}` : formatDate(visit.businessDate)}
                  </Text>
                  <Text style={styles.meta}>{visit.employeeName}</Text>
                </View>
                <Text style={[styles.net, visit.totalNet < 0 ? styles.negative : styles.positive]}>
                  {formatCurrency(visit.totalNet)}
                </Text>
              </View>
              <View style={styles.statuses}>
                <Text style={styles.status}>Result: {visit.result}</Text>
                <Text style={styles.status}>Settlement: {visit.settlementStatus === 'submitted' ? 'Submitted' : 'Not submitted'}</Text>
                <Text style={styles.status}>Receipt: {visit.printStatus === 'printed' ? 'Printed' : 'Not printed'}</Text>
              </View>
              <Button title="View Receipt" onPress={() => router.push(`/receipt?visitId=${visit.id}` as any)} variant="secondary" />
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
    minHeight: '100%',
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headingText: {
    flex: 1,
    minWidth: 220,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSizes.h1,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: fontSizes.body,
  },
  center: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  stateCard: {
    gap: spacing.md,
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: fontSizes.body,
  },
  error: {
    color: colors.error,
    fontSize: fontSizes.body,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: fontSizes.h2,
    fontWeight: '700',
  },
  visitCard: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  visitHeaderText: {
    flex: 1,
  },
  store: {
    color: colors.textPrimary,
    fontSize: fontSizes.h2,
    fontWeight: '700',
  },
  meta: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: fontSizes.caption,
  },
  net: {
    fontSize: fontSizes.h2,
    fontWeight: '700',
  },
  positive: {
    color: colors.success,
  },
  negative: {
    color: colors.error,
  },
  statuses: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  status: {
    color: colors.textSecondary,
    fontSize: fontSizes.caption,
    textTransform: 'capitalize',
  },
});
