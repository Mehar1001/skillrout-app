import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { type Colors, fontSizes, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';
import { useDraftQueue } from '../../contexts/DraftQueueContext';
import { listAssignedStores, listStores } from '../../services/stores';
import { Store } from '../../types';

export default function SelectStoreScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { user, ownerId, role, assignedStoreIds } = useAuth();
  const router = useRouter();
  const { pendingCount } = useDraftQueue();
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    if (!user || !ownerId) return;
    const request = role === 'owner'
      ? listStores(ownerId)
      : listAssignedStores(ownerId, assignedStoreIds);
    request.then(data => setStores(data));
  }, [user, ownerId, role, assignedStoreIds]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Where are you working today?</Text>
        <View style={styles.headerActions}>
          <Button title="Drafts" onPress={() => router.push('/drafts' as any)} variant={pendingCount > 0 ? 'primary' : 'secondary'} />
          <Button title="History" onPress={() => router.push('/employee-history' as any)} variant="secondary" />
          {role === 'employee' && (
            <Button title="Add Store" onPress={() => router.push('/onboard-store' as any)} variant="secondary" />
          )}
        </View>
      </View>
      {stores.every(store => !store.active) ? (
        <Text style={styles.empty}>
          All assigned stores are currently deactivated. Contact your admin to reactivate a store.
        </Text>
      ) : null}
      {stores.map(store => {
        const active = store.active;
        return (
          <Card
            key={store.id}
            style={[styles.storeCard, !active && { backgroundColor: colors.surfaceSecondary, opacity: 0.75 }]}
          >
            <View style={styles.storeRow}>
              <View style={styles.storeInfo}>
                <Text style={[styles.storeName, !active && { color: colors.textMuted }]}>
                  {store.name}
                </Text>
                {store.address ? (
                  <Text style={[styles.storeAddress, !active && { color: colors.textMuted }]}>
                    {store.address}
                  </Text>
                ) : null}
                {active ? (
                  <Text style={styles.split}>
                    Default split: {store.defaultStorePercent}% / {store.defaultVendorPercent}%
                  </Text>
                ) : (
                  <Text style={styles.inactiveHelp}>
                    This store has been deactivated. Contact admin to reactivate.
                  </Text>
                )}
              </View>
              <View style={styles.storeAction}>
                <Button
                  title="Start"
                  onPress={() => router.push(`/visit?storeId=${store.id}` as any)}
                  variant="primary"
                  disabled={!active}
                />
                {active ? (
                  <Button
                    title="Manage"
                    onPress={() => router.push(`/store-detail?storeId=${store.id}` as any)}
                    variant="secondary"
                    compact
                  />
                ) : null}
              </View>
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    minHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  greeting: {
    flex: 1,
    minWidth: 160,
    fontSize: fontSizes.h2,
    color: colors.textPrimary,
    fontWeight: '700',
    lineHeight: fontSizes.h2 + 8,
  },
  storeCard: {
    marginBottom: spacing.md,
  },
  storeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  storeInfo: {
    flex: 1,
    marginRight: spacing.md,
    marginBottom: spacing.sm,
  },
  storeName: {
    fontSize: fontSizes.h2,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  storeAddress: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  split: {
    fontSize: fontSizes.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  inactiveHelp: {
    fontSize: fontSizes.caption,
    color: colors.warning,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  storeAction: {
    gap: spacing.sm,
    alignItems: 'flex-end',
  },
  empty: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
  },
});
