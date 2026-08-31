import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { httpsCallable } from 'firebase/functions';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { type Colors, fontSizes, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { functions } from '../../firebaseConfig';

const getPendingOwnersFn = httpsCallable(functions, 'getPendingOwners');
const approveOwnerFn = httpsCallable(functions, 'approveOwner');

interface PendingOwner {
  id: string;
  businessName: string;
  email: string;
  status: string;
}

export default function PendingOwnersScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const [pending, setPending] = useState<PendingOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await getPendingOwnersFn();
      const data = res.data as { pendingOwners?: PendingOwner[] };
      setPending(data.pendingOwners || []);
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Could not load pending owners.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    setMessage(null);
    try {
      await approveOwnerFn({ pendingOwnerId: id });
      setPending(prev => prev.filter(p => p.id !== id));
      setMessage({ type: 'success', text: 'Owner approved successfully.' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Could not approve owner.' });
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Pending Owner Approvals</Text>
      <Text style={styles.subtitle}>Review and approve new business owner sign-up requests.</Text>

      {message ? (
        <View
          style={[
            styles.messageBox,
            { backgroundColor: message.type === 'error' ? colors.glowError : colors.glowSuccess },
          ]}
        >
          <Text style={[styles.messageText, { color: message.type === 'error' ? colors.error : colors.success }]}>
            {message.text}
          </Text>
        </View>
      ) : null}

      <View style={styles.list}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.centerText}>Loading pending requests…</Text>
          </View>
        ) : pending.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No pending requests</Text>
            <Text style={styles.emptyText}>New owner sign-ups will appear here for approval.</Text>
          </Card>
        ) : (
          pending.map(item => (
            <Card key={item.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.info}>
                  <Text style={styles.businessName}>{item.businessName}</Text>
                  <Text style={styles.email}>{item.email}</Text>
                  <Text style={styles.meta}>{item.status === 'pending' ? 'Pending approval' : item.status}</Text>
                </View>
                <Button
                  title="Approve"
                  onPress={() => handleApprove(item.id)}
                  loading={approvingId === item.id}
                  disabled={approvingId !== null && approvingId !== item.id}
                  compact
                />
              </View>
            </Card>
          ))
        )}
      </View>

      {!loading && pending.length > 0 ? (
        <Button title="Refresh" onPress={fetchPending} variant="secondary" />
      ) : null}
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
    minHeight: '100%',
    gap: spacing.md,
  },
  title: {
    fontSize: fontSizes.h1,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
  },
  messageBox: {
    padding: spacing.md,
    borderRadius: 13,
  },
  messageText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    textAlign: 'center',
  },
  list: {
    gap: spacing.md,
  },
  center: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  centerText: {
    color: colors.textSecondary,
    fontSize: fontSizes.body,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSizes.h2,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  businessName: {
    fontSize: fontSizes.h3,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  email: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
  },
  meta: {
    fontSize: fontSizes.caption,
    color: colors.textMuted,
  },
});
