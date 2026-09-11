import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { type Colors, fontSizes, lineHeights, radii, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate, formatTime } from '../../helpers/formatters';
import { listActivities } from '../../services/activities';
import { Activity, ActivityAction } from '../../types';

const ACTION_OPTIONS: { label: string; value: ActivityAction | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Run', value: 'visit_run' },
  { label: 'Submit', value: 'visit_submitted' },
  { label: 'Adjust', value: 'visit_adjusted' },
  { label: 'Store', value: 'store_created' },
  { label: 'Machine', value: 'machine_created' },
  { label: 'Baseline', value: 'machine_baseline_rewritten' },
];

export default function ActivityHistoryScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { ownerId } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ visitId?: string; storeId?: string; machineId?: string }>();
  const preselectedVisitId = params?.visitId;
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<ActivityAction | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    setError('');
    try {
      setActivities(await listActivities(ownerId, {
        action: actionFilter === 'all' ? undefined : actionFilter,
        visitId: preselectedVisitId,
      }));
    } catch (e: any) {
      setError(e.message || 'Unable to load activity history.');
    } finally {
      setLoading(false);
    }
  }, [ownerId, actionFilter, preselectedVisitId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return activities;
    return activities.filter(a =>
      (a.storeName?.toLowerCase().includes(term) ?? false) ||
      (a.actorName?.toLowerCase().includes(term) ?? false) ||
      (a.action?.toLowerCase().includes(term) ?? false) ||
      (a.machineNumber?.toLowerCase().includes(term) ?? false) ||
      (a.visitId?.toLowerCase().includes(term) ?? false)
    );
  }, [activities, search]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.headingText}>
          {preselectedVisitId ? (
            <>
              <Text style={styles.title}>Visit Activity</Text>
              <Text style={styles.subtitle}>Audit log for visit {preselectedVisitId.slice(-8).toUpperCase()}.</Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>Activity History</Text>
              <Text style={styles.subtitle}>Audit log of changes across stores, machines, and visits.</Text>
            </>
          )}
        </View>
        <View style={styles.headingActions}>
          {preselectedVisitId ? (
            <Button title="Back" onPress={() => router.back()} variant="secondary" compact />
          ) : null}
          <Button title="Refresh" onPress={fetchActivities} variant="secondary" disabled={loading} compact />
        </View>
      </View>

      <View style={styles.filterRow}>
        {ACTION_OPTIONS.map(option => (
          <Button
            key={option.value}
            title={option.label}
            variant={actionFilter === option.value ? 'primary' : 'secondary'}
            onPress={() => setActionFilter(option.value)}
            compact
          />
        ))}
      </View>

      <TextInput
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
        placeholder="Search by store, actor, machine, visit…"
        placeholderTextColor={colors.textMuted}
      />

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Loading activity…</Text>
        </View>
      ) : error ? (
        <Card style={styles.stateCard}>
          <Text style={styles.errorTitle}>Activity unavailable</Text>
          <Text style={styles.stateText}>{error}</Text>
          <Button title="Try Again" onPress={fetchActivities} />
        </Card>
      ) : filtered.length === 0 ? (
        <Card style={styles.stateCard}>
          <Text style={styles.emptyTitle}>No activity found</Text>
          <Text style={styles.stateText}>Complete RUN, SUBMIT, or ADJUST actions to build the audit log.</Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {filtered.map(activity => {
            const timestamp = activity.createdAt?.toDate?.();
            const expanded = expandedId === activity.id;
            return (
              <Card key={activity.id} style={styles.card}>
                <Pressable onPress={() => setExpandedId(expanded ? null : activity.id)} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.action}>{actionLabel(activity.action)}</Text>
                    <Text style={styles.meta}>
                      {timestamp ? `${formatDate(timestamp)} at ${formatTime(timestamp)}` : '—'}
                    </Text>
                    <Text style={styles.meta}>By {activity.actorName || activity.actorId} · {activity.actorRole}</Text>
                  </View>
                  <View style={styles.rowRight}>
                    {activity.storeName ? <Text style={styles.store}>{activity.storeName}</Text> : null}
                    {activity.machineNumber ? <Text style={styles.machine}>#{activity.machineNumber}</Text> : null}
                  </View>
                </Pressable>
                {expanded ? <ActivityDetails activity={activity} colors={colors} /> : null}
              </Card>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const actionLabel = (action: string) =>
  ACTION_OPTIONS.find(o => o.value === action)?.label || action.replace(/_/g, ' ');

const ActivityDetails = ({ activity, colors }: { activity: Activity; colors: Colors }) => {
  const styles = detailStyles(colors);
  const before = activity.before ?? {};
  const after = activity.after ?? {};
  return (
    <View style={styles.container}>
      {activity.visitId ? <Text style={styles.line}>Visit: {activity.visitId}</Text> : null}
      {activity.machineId ? <Text style={styles.line}>Machine ID: {activity.machineId}</Text> : null}
      {activity.reason ? <Text style={styles.line}>Reason: {activity.reason}</Text> : null}
      {activity.note ? <Text style={styles.line}>Note: {activity.note}</Text> : null}
      {Object.keys(before).length > 0 || Object.keys(after).length > 0 ? (
        <View style={styles.changes}>
          {Object.entries(before).map(([key, value]) => (
            <Text key={`before-${key}`} style={styles.line}>Before {key}: {formatValue(value)}</Text>
          ))}
          {Object.entries(after).map(([key, value]) => (
            <Text key={`after-${key}`} style={styles.line}>After {key}: {formatValue(value)}</Text>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const formatValue = (value: unknown): string => {
  if (typeof value === 'number') return formatCurrency(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map(formatValue).join(', ');
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).map(([k, v]) => `${k}: ${formatValue(v)}`).join(', ');
  }
  return String(value ?? '—');
};

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xxl, backgroundColor: colors.background, minHeight: '100%' },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xl },
  headingText: { flex: 1, minWidth: 220 },
  headingActions: { flexDirection: 'row', gap: spacing.sm },
  title: { fontSize: fontSizes.h1, color: colors.textPrimary, fontWeight: '700' },
  subtitle: { marginTop: spacing.xs, fontSize: fontSizes.body, lineHeight: lineHeights.body, color: colors.textSecondary },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    fontSize: fontSizes.body,
  },
  centerState: { minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  stateCard: { gap: spacing.md },
  stateText: { color: colors.textSecondary, fontSize: fontSizes.body },
  errorTitle: { color: colors.error, fontSize: fontSizes.h2, fontWeight: '700' },
  emptyTitle: { color: colors.textPrimary, fontSize: fontSizes.h2, fontWeight: '700' },
  list: { gap: spacing.md },
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  rowLeft: { flex: 1 },
  rowRight: { alignItems: 'flex-end' },
  action: { fontSize: fontSizes.h3, fontWeight: '700', color: colors.textPrimary, textTransform: 'capitalize' },
  meta: { marginTop: spacing.xs, fontSize: fontSizes.caption, color: colors.textSecondary },
  store: { fontSize: fontSizes.body, fontWeight: '600', color: colors.textPrimary },
  machine: { marginTop: spacing.xs, fontSize: fontSizes.caption, color: colors.textSecondary },
});

const detailStyles = (colors: Colors) => StyleSheet.create({
  container: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.xs },
  changes: { gap: spacing.xs },
  line: { fontSize: fontSizes.caption, color: colors.textSecondary },
});
