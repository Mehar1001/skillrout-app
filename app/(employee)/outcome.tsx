import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { type Colors, fontSizes, lineHeights, radii, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../helpers/formatters';
import { useVisit } from '../../hooks/useVisit';
import { submitVisit } from '../../services/visits';
import { useState } from 'react';

export default function OutcomeScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const { user, ownerId } = useAuth();
  const router = useRouter();
  const { visit, loading, error, refresh } = useVisit(ownerId, visitId);
  const [working, setWorking] = useState(false);

  if (loading) return <Center text="Loading outcome…" />;
  if (!visit) return <Center text={error || 'Visit not found.'} action={refresh} />;

  const positive = visit.totalNet > 0;
  const zero = visit.totalNet === 0;

  const handlePrint = async () => {
    if (!user || !ownerId) return;
    setWorking(true);
    try {
      router.push(`/receipt?visitId=${visit.id}` as any);
    } catch (e: any) {
      Alert.alert('Print Error', e.message || 'Receipt preview could not be opened.');
    } finally {
      setWorking(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !ownerId || !positive) return;
    setWorking(true);
    try {
      await submitVisit(ownerId, visit.id, visit.storePercent, visit.vendorPercent);
      router.replace(`/receipt?visitId=${visit.id}` as any);
    } catch (e: any) {
      Alert.alert('Submit Error', e.message || 'Settlement could not be submitted.');
    } finally {
      setWorking(false);
    }
  };

  const outcomeColor = positive ? colors.success : colors.error;
  const outcomeTitle = positive ? 'Amounts are positive' : zero ? 'Net amount is zero' : 'Net amount is negative';
  const outcomeBody = positive
    ? 'You can submit the settlement and print, or print without submitting.'
    : 'This RUN is permanently saved. It can be printed, but it cannot be submitted.';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>RUN RESULTS · OUTCOME</Text>
      <Text style={styles.title}>{visit.storeName}</Text>

      <Card style={[styles.outcomeCard, { borderColor: outcomeColor }]}>
        <View style={[styles.statusIcon, { backgroundColor: outcomeColor }]}>
          <Text style={styles.statusIconText}>{positive ? '✓' : '−'}</Text>
        </View>
        <Text style={[styles.outcomeTitle, { color: outcomeColor }]}>{outcomeTitle}</Text>
        <Text style={styles.net}>{formatCurrency(visit.totalNet)}</Text>
        <Text style={styles.outcomeBody}>{outcomeBody}</Text>
      </Card>

      <Card style={styles.summary}>
        <Summary label={`Store ${visit.storePercent}%`} value={visit.storeAmount} />
        <Summary label={`Vendor ${visit.vendorPercent}%`} value={visit.vendorAmount} />
        <Summary label="Cash Due Location" value={visit.cashDueLocation} emphasis />
      </Card>

      <View style={styles.actions}>
        {positive && visit.settlementStatus !== 'submitted' ? (
          <Button title="Submit & Print" onPress={handleSubmit} loading={working} />
        ) : null}
        <Button title={visit.printStatus === 'printed' ? 'Reprint' : 'Print'} onPress={handlePrint} loading={working} variant="secondary" />
        <Button title="Cancel" onPress={() => router.replace('/select-store' as any)} variant="secondary" disabled={working} />
      </View>
      <Text style={styles.rule}>Only SUBMIT advances Last Settled readings. RUN and PRINT never change them.</Text>
    </ScrollView>
  );
}

const Summary = ({ label, value, emphasis = false }: { label: string; value: number; emphasis?: boolean }) => { const colors = useColors(); const styles = makeStyles(colors); return (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={[styles.summaryValue, emphasis ? styles.summaryEmphasis : null]}>{formatCurrency(value)}</Text>
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
  outcomeCard: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
  },
  statusIcon: {
    width: 55,
    height: 55,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
  },
  statusIconText: {
    color: colors.textOnPrimary,
    fontSize: fontSizes.h1,
    fontWeight: '700',
  },
  outcomeTitle: {
    marginTop: spacing.md,
    fontSize: fontSizes.h2,
    fontWeight: '700',
  },
  net: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: fontSizes.h1,
    fontWeight: '700',
  },
  outcomeBody: {
    maxWidth: 460,
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
    textAlign: 'center',
  },
  summary: {
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.body,
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: fontSizes.body,
    fontWeight: '700',
  },
  summaryEmphasis: {
    color: colors.primary,
  },
  actions: {
    gap: spacing.sm,
  },
  rule: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.sm,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceSecondary,
    fontSize: fontSizes.caption,
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
