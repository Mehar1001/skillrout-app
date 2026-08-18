import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { colors, fontSizes, spacing } from '../../constants/designTokens';
import { useAuth } from '../../contexts/AuthContext';
import { listStores } from '../../services/stores';
import { Store } from '../../types';

export default function SelectStoreScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    if (!user) return;
    listStores(user.uid).then(data => setStores(data.filter(s => s.active)));
  }, [user]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.greeting}>Where are you working today?</Text>
      {stores.length === 0 ? (
        <Text style={styles.empty}>No active stores. Ask your owner to add one.</Text>
      ) : (
        stores.map(store => (
          <Card key={store.id} style={styles.storeCard}>
            <View style={styles.storeRow}>
              <View style={styles.storeInfo}>
                <Text style={styles.storeName}>{store.name}</Text>
                <Text style={styles.storeAddress}>{store.address}</Text>
                <Text style={styles.split}>
                  Default split: {store.defaultStorePercent}% / {store.defaultVendorPercent}%
                </Text>
              </View>
              <View style={styles.storeAction}>
                <Button
                  title="Start"
                  onPress={() => router.push(`/visit?storeId=${store.id}` as any)}
                  variant="primary"
                />
              </View>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    minHeight: '100%',
  },
  greeting: {
    fontSize: fontSizes.h1,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.lg,
    lineHeight: fontSizes.h1 + 8,
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
    color: colors.accent,
    fontWeight: '600',
  },
  storeAction: {
    minWidth: 90,
  },
  empty: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
  },
});
