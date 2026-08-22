import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { type Colors, fontSizes, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useDraftQueue } from '../../contexts/DraftQueueContext';
import { formatDate } from '../../helpers/formatters';

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  failed: 'Failed',
  conflict: 'Conflict',
};

export default function DraftsScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const router = useRouter();
  const { drafts, pendingCount, processing, processQueue, deleteDraft } = useDraftQueue();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Offline Drafts</Text>
          <Text style={styles.subtitle}>
            {pendingCount === 0
              ? 'No pending drafts.'
              : `${pendingCount} draft${pendingCount === 1 ? '' : 's'} waiting to submit.`}
          </Text>
        </View>
        <Button
          title="Retry All"
          onPress={processQueue}
          variant="secondary"
          loading={processing}
          disabled={processing || pendingCount === 0}
        />
      </View>

      {drafts.length === 0 ? (
        <Text style={styles.empty}>Start a visit while offline to save a draft here.</Text>
      ) : (
        drafts.map(draft => (
          <Card key={draft.id} style={styles.draftCard}>
            <View style={styles.row}>
              <View style={styles.info}>
                <Text style={styles.store}>{draft.storeName}</Text>
                <Text style={styles.meta}>Date: {formatDate(new Date(draft.businessDate))}</Text>
                <Text style={styles.meta}>Saved: {formatDate(new Date(draft.createdAt))}</Text>
                <Text style={[styles.status, styles[draft.status]]}>{statusLabel[draft.status]}</Text>
                {draft.lastError ? <Text style={styles.error}>{draft.lastError}</Text> : null}
              </View>
              <View style={styles.actions}>
                <Button
                  title="Delete"
                  onPress={() => deleteDraft(draft.id)}
                  variant="danger"
                />
                {draft.status === 'pending' || draft.status === 'failed' ? (
                  <Button
                    title="Retry"
                    onPress={processQueue}
                    variant="primary"
                    loading={processing}
                    disabled={processing}
                  />
                ) : null}
              </View>
            </View>
            {processing ? <ActivityIndicator style={styles.spinner} color={colors.primary} /> : null}
          </Card>
        ))
      )}

      <Button title="Back to Stores" onPress={() => router.back()} variant="secondary" />
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: fontSizes.h1,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  empty: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
    marginBottom: spacing.lg,
  },
  draftCard: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  info: {
    flex: 1,
    minWidth: 200,
  },
  store: {
    fontSize: fontSizes.h2,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  meta: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
  },
  status: {
    fontSize: fontSizes.caption,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  pending: {
    color: colors.accent,
  },
  failed: {
    color: colors.error,
  },
  conflict: {
    color: colors.warning,
  },
  error: {
    fontSize: fontSizes.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
    minWidth: 100,
  },
  spinner: {
    marginTop: spacing.md,
  },
});
