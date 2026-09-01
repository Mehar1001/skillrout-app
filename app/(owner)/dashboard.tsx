import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { type Colors, fontSizes, letterSpacings, lineHeights, radii, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate, formatTime } from '../../helpers/formatters';
import { listStores } from '../../services/stores';
import { listVisits } from '../../services/visits';
import { Visit } from '../../types';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isThisMonth(date: Date): boolean {
  const today = new Date();
  return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
}

function visitDate(visit: Visit): Date {
  return visit.timestamp?.toDate ? visit.timestamp.toDate() : new Date(visit.businessDate);
}

interface DashboardStats {
  totalStores: number;
  todayVisits: number;
  monthNet: number;
  pendingSubmissions: number;
  monthTotal: number;
  monthSubmitted: number;
  monthPrintedOnly: number;
  monthPending: number;
  monthNetTotal: number;
  monthSubmittedAmount: number;
  monthPendingAmount: number;
  avgPerVisit: number;
}

export default function OwnerDashboard() {
  const colors = useColors();
  const styles = makeStyles(colors);

  const StatusBadge = ({ status }: { status: 'Submitted' | 'Printed Only' | 'Pending' }) => {
    const palette = {
      Submitted: { bg: colors.success, fg: '#FFFFFF' },
      'Printed Only': { bg: colors.warning, fg: colors.textPrimary },
      Pending: { bg: colors.accent, fg: '#FFFFFF' },
    }[status];
    return (
      <View style={[styles.badge, { backgroundColor: palette.bg }]}>
        <Text style={[styles.badgeText, { color: palette.fg }]}>{status}</Text>
      </View>
    );
  };

  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [storeCount, setStoreCount] = useState(0);

  const ownerId = user?.uid ?? '';

  useEffect(() => {
    if (!ownerId) return;
    let mounted = true;
    const load = async () => {
      try {
        const [stores, allVisits] = await Promise.all([listStores(ownerId), listVisits(ownerId, 200)]);
        if (!mounted) return;
        setStoreCount(stores.length);
        setVisits(allVisits);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [ownerId]);

  const stats: DashboardStats = useMemo(() => {
    const todayVisits = visits.filter(v => isToday(visitDate(v))).length;
    const monthVisits = visits.filter(v => isThisMonth(visitDate(v)));
    const monthNet = monthVisits.reduce((sum, v) => sum + v.totalNet, 0);
    const pendingSubmissions = visits.filter(v => v.settlementStatus === 'not_submitted').length;
    const monthTotal = monthVisits.length;
    const monthSubmitted = monthVisits.filter(v => v.settlementStatus === 'submitted').length;
    const monthPrintedOnly = monthVisits.filter(v => v.settlementStatus === 'not_submitted' && v.printStatus === 'printed').length;
    const monthPending = monthVisits.filter(v => v.settlementStatus === 'not_submitted' && v.printStatus === 'not_printed').length;
    const monthNetTotal = monthVisits.reduce((sum, v) => sum + v.totalNet, 0);
    const monthSubmittedAmount = monthVisits
      .filter(v => v.settlementStatus === 'submitted')
      .reduce((sum, v) => sum + v.totalNet, 0);
    const monthPendingAmount = monthVisits
      .filter(v => v.settlementStatus === 'not_submitted')
      .reduce((sum, v) => sum + v.totalNet, 0);
    const avgPerVisit = monthTotal ? monthNetTotal / monthTotal : 0;
    return {
      totalStores: storeCount,
      todayVisits,
      monthNet,
      pendingSubmissions,
      monthTotal,
      monthSubmitted,
      monthPrintedOnly,
      monthPending,
      monthNetTotal,
      monthSubmittedAmount,
      monthPendingAmount,
      avgPerVisit,
    };
  }, [visits, storeCount]);

  const recentVisits = useMemo(() => visits.slice(0, 5), [visits]);

  const getStatus = (visit: Visit): 'Submitted' | 'Printed Only' | 'Pending' => {
    if (visit.settlementStatus === 'submitted') return 'Submitted';
    if (visit.printStatus === 'printed') return 'Printed Only';
    return 'Pending';
  };

  const displayName = user?.email ? user.email.split('@')[0] : 'Owner';

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading dashboard…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>
            {getGreeting()}, {displayName}! 👋
          </Text>
          <Text style={[styles.greetingSub, { color: colors.textSecondary }]}>
            Here is what is happening with your business today.
          </Text>
        </View>
        <Pressable style={styles.bell} onPress={() => router.push('/history' as any)}>
          <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.stats}>
        <Card style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="storefront-outline" size={22} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.totalStores}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Stores</Text>
        </Card>
        <Card style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="calendar-outline" size={22} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.todayVisits}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Today&apos;s Visits</Text>
        </Card>
        <Card style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="cash-outline" size={22} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatCurrency(stats.monthNet)}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Net (MTD)</Text>
        </Card>
        <Card style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="time-outline" size={22} color={colors.accent} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.pendingSubmissions}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending Submissions</Text>
        </Card>
      </View>

      <Card style={[styles.startCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.startCardText}>
          <Text style={[styles.startCardTitle, { color: colors.textPrimary }]}>Start a visit</Text>
          <Text style={[styles.startCardBody, { color: colors.textSecondary }]}>
            Select a store, enter machine readings, run calculations, then print or submit.
          </Text>
        </View>
        <Button
          title="Start Visit"
          onPress={() => router.push('/employee/login' as any)}
          variant="accent"
          iconName="arrow-forward"
        />
      </Card>

      <View style={styles.main}>
        <View style={styles.leftColumn}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Quick Actions</Text>
            <View style={styles.actions}>
              {[
                { title: 'View Stores', icon: 'storefront-outline', route: '/stores' },
                { title: "Today's Visits", icon: 'calendar-outline', route: '/history' },
                { title: 'Add Employee', icon: 'person-add-outline', route: '/employees' },
                { title: 'Reports', icon: 'bar-chart-outline', route: '/reports' },
                { title: 'Settings', icon: 'settings-outline', route: '/settings' },
              ].map(action => (
                <Pressable
                  key={action.title}
                  onPress={() => router.push(action.route as any)}
                  style={({ pressed }) => [
                    styles.action,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    pressed && { backgroundColor: colors.surfaceSecondary },
                  ]}
                  accessibilityRole="button"
                >
                  <Ionicons name={action.icon as any} size={22} color={colors.primary} />
                  <Text style={[styles.actionText, { color: colors.textPrimary }]}>{action.title}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Store Visits</Text>
            <Card style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.tableHeaderText, { color: colors.textMuted }]}>Store</Text>
                <Text style={[styles.tableHeaderText, { color: colors.textMuted }]}>Employee</Text>
                <Text style={[styles.tableHeaderText, { color: colors.textMuted }]}>Date & Time</Text>
                <Text style={[styles.tableHeaderText, { color: colors.textMuted }]}>Net</Text>
                <Text style={[styles.tableHeaderText, { color: colors.textMuted }]}>Status</Text>
              </View>
              {recentVisits.map(visit => (
                <Pressable
                  key={visit.id}
                  onPress={() => router.push('/history' as any)}
                  style={({ pressed }) => [
                    styles.tableRow,
                    { borderBottomColor: colors.border },
                    pressed && { backgroundColor: colors.surfaceSecondary },
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.tableCell, { color: colors.textPrimary }]} numberOfLines={1}>
                    {visit.storeName}
                  </Text>
                  <Text style={[styles.tableCell, { color: colors.textSecondary }]} numberOfLines={1}>
                    {visit.employeeName}
                  </Text>
                  <View>
                    <Text style={[styles.tableCell, { color: colors.textSecondary }]}>{formatDate(visitDate(visit))}</Text>
                    <Text style={[styles.tableCellTime, { color: colors.textMuted }]}>{formatTime(visitDate(visit))}</Text>
                  </View>
                  <Text style={[styles.tableCellNet, { color: visit.totalNet >= 0 ? colors.success : colors.error }]}>
                    {formatCurrency(visit.totalNet)}
                  </Text>
                  <StatusBadge status={getStatus(visit)} />
                </Pressable>
              ))}
              {recentVisits.length === 0 && (
                <Text style={[styles.empty, { color: colors.textMuted }]}>No visits yet.</Text>
              )}
            </Card>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Insights</Text>
            <Card style={[styles.insights, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.insightsPeriod, { color: colors.textMuted }]}>THIS MONTH</Text>
              <View style={styles.insightsRow}>
                <View style={styles.insight}>
                  <Text style={[styles.insightValue, { color: colors.textPrimary }]}>{stats.monthTotal}</Text>
                  <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Store Visits</Text>
                </View>
                <View style={styles.insight}>
                  <Text style={[styles.insightValue, { color: colors.textPrimary }]}>{stats.monthSubmitted}</Text>
                  <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Submitted</Text>
                </View>
                <View style={styles.insight}>
                  <Text style={[styles.insightValue, { color: colors.textPrimary }]}>{stats.monthPrintedOnly}</Text>
                  <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Printed Only</Text>
                </View>
                <View style={styles.insight}>
                  <Text style={[styles.insightValue, { color: colors.textPrimary }]}>{stats.monthPending}</Text>
                  <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Pending</Text>
                </View>
              </View>
              <View style={[styles.insightsTotals, { borderTopColor: colors.border }]}>
                <View style={styles.totals}>
                  <Text style={[styles.totalsLabel, { color: colors.textSecondary }]}>Total Net Amount</Text>
                  <Text style={[styles.totalsValue, { color: colors.textPrimary }]}>{formatCurrency(stats.monthNetTotal)}</Text>
                </View>
                <View style={styles.totals}>
                  <Text style={[styles.totalsLabel, { color: colors.textSecondary }]}>Submitted Amount</Text>
                  <Text style={[styles.totalsValue, { color: colors.success }]}>{formatCurrency(stats.monthSubmittedAmount)}</Text>
                </View>
                <View style={styles.totals}>
                  <Text style={[styles.totalsLabel, { color: colors.textSecondary }]}>Pending Amount</Text>
                  <Text style={[styles.totalsValue, { color: colors.accent }]}>{formatCurrency(stats.monthPendingAmount)}</Text>
                </View>
                <View style={styles.totals}>
                  <Text style={[styles.totalsLabel, { color: colors.textSecondary }]}>Average Per Visit</Text>
                  <Text style={[styles.totalsValue, { color: colors.textPrimary }]}>{formatCurrency(stats.avgPerVisit)}</Text>
                </View>
              </View>
            </Card>
          </View>
        </View>

        <View style={styles.rightColumn}>
          <Card style={[styles.ctaCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Text style={[styles.ctaTitle, { color: colors.textPrimary }]}>Need to add a new store?</Text>
            <Text style={[styles.ctaBody, { color: colors.textSecondary }]}>
              Add stores, machines, and employees to keep your records complete.
            </Text>
            <Button
              title="Add Store"
              onPress={() => router.push('/stores' as any)}
              variant="primary"
              iconName="add-circle-outline"
              compact
            />
          </Card>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Accountability</Text>
            <Card style={[styles.ruleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.ruleHeader}>
                <Ionicons name="shield-checkmark-outline" size={22} color={colors.success} />
                <Text style={[styles.ruleTitle, { color: colors.textPrimary }]}>RUN ≠ PRINT ≠ SUBMIT</Text>
              </View>
              <Text style={[styles.ruleBody, { color: colors.textSecondary }]}>
                RUN records the visit. PRINT produces the report. SUBMIT advances the settlement. Every action is
                timestamped and traceable.
              </Text>
            </Card>
          </View>
        </View>
      </View>

      <Card style={[styles.tip, { backgroundColor: colors.primarySubtle, borderColor: colors.border }]}>
        <Ionicons name="information-circle" size={20} color={colors.primary} />
        <Text style={[styles.tipText, { color: colors.textPrimary }]}>
          Tip: Keep your store data up to date for accurate reporting and insights.
        </Text>
      </Card>
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      backgroundColor: colors.background,
      minHeight: '100%',
    },
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      fontSize: fontSizes.body,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.xl,
    },
    greeting: {
      fontSize: fontSizes.h1,
      fontWeight: '700',
      lineHeight: lineHeights.h1,
    },
    greetingSub: {
      fontSize: fontSizes.body,
      marginTop: spacing.xs,
    },
    bell: {
      width: 44,
      height: 44,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    badge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radii.sm,
      alignSelf: 'flex-start',
    },
    badgeText: {
      fontSize: fontSizes.caption,
      fontWeight: '700',
    },
    stats: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    statCard: {
      flex: 1,
      minWidth: 140,
      padding: spacing.md,
      borderWidth: 1,
      gap: spacing.sm,
    },
    statValue: {
      fontSize: fontSizes.h2,
      fontWeight: '800',
    },
    statLabel: {
      fontSize: fontSizes.caption,
      fontWeight: '600',
    },
    startCard: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.lg,
      borderWidth: 1,
      marginBottom: spacing.xl,
      gap: spacing.md,
    },
    startCardText: {
      flex: 1,
      minWidth: 220,
    },
    startCardTitle: {
      fontSize: fontSizes.h2,
      fontWeight: '700',
      marginBottom: spacing.xs,
    },
    startCardBody: {
      fontSize: fontSizes.body,
      lineHeight: lineHeights.body,
    },
    main: {
      flexDirection: 'column',
      gap: spacing.xl,
      marginBottom: spacing.xl,
    },
    leftColumn: {
      flex: 1,
      gap: spacing.xl,
    },
    rightColumn: {
      width: '100%',
      gap: spacing.xl,
    },
    section: {
      gap: spacing.md,
    },
    sectionTitle: {
      fontSize: fontSizes.h2,
      fontWeight: '700',
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 48,
      minWidth: 140,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    actionText: {
      fontSize: fontSizes.body,
      fontWeight: '600',
    },
    tableCard: {
      padding: spacing.md,
      borderWidth: 1,
      overflow: 'hidden',
    },
    tableHeader: {
      flexDirection: 'row',
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      gap: spacing.sm,
    },
    tableHeaderText: {
      fontSize: fontSizes.caption,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: letterSpacings.wide,
      width: 100,
    },
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      gap: spacing.sm,
    },
    tableCell: {
      width: 100,
      fontSize: fontSizes.body,
      fontWeight: '500',
    },
    tableCellTime: {
      width: 100,
      fontSize: fontSizes.caption,
    },
    tableCellNet: {
      width: 100,
      fontSize: fontSizes.body,
      fontWeight: '700',
    },
    empty: {
      paddingVertical: spacing.lg,
      textAlign: 'center',
    },
    insights: {
      padding: spacing.lg,
      borderWidth: 1,
    },
    insightsPeriod: {
      fontSize: fontSizes.caption,
      fontWeight: '700',
      letterSpacing: letterSpacings.wide,
      marginBottom: spacing.md,
    },
    insightsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    insight: {
      flex: 1,
      minWidth: 100,
    },
    insightValue: {
      fontSize: fontSizes.h2,
      fontWeight: '800',
    },
    insightLabel: {
      fontSize: fontSizes.caption,
      color: colors.textSecondary,
    },
    insightsTotals: {
      borderTopWidth: 1,
      paddingTop: spacing.md,
      gap: spacing.md,
    },
    totals: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    totalsLabel: {
      fontSize: fontSizes.body,
      fontWeight: '600',
    },
    totalsValue: {
      fontSize: fontSizes.h3,
      fontWeight: '700',
    },
    ctaCard: {
      padding: spacing.lg,
      borderWidth: 1,
    },
    ctaTitle: {
      fontSize: fontSizes.h3,
      fontWeight: '700',
      marginBottom: spacing.xs,
    },
    ctaBody: {
      fontSize: fontSizes.body,
      lineHeight: lineHeights.body,
      marginBottom: spacing.md,
    },
    ruleCard: {
      padding: spacing.lg,
      borderWidth: 1,
    },
    ruleHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    ruleTitle: {
      fontSize: fontSizes.h3,
      fontWeight: '800',
    },
    ruleBody: {
      fontSize: fontSizes.body,
      lineHeight: lineHeights.body,
    },
    tip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderWidth: 1,
    },
    tipText: {
      fontSize: fontSizes.body,
      fontWeight: '500',
    },
  });
