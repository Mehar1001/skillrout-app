import * as Print from 'expo-print';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { ReceiptView } from '../../components/ReceiptView';
import { type Colors, fontSizes, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';
import { generateReceiptHtml } from '../../helpers/receiptTemplate';
import { useVisit } from '../../hooks/useVisit';
import { markPrinted } from '../../services/visits';
import { useState } from 'react';

export default function ReceiptScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { visitId, storeId } = useLocalSearchParams<{ visitId: string; storeId: string }>();
  const { user, ownerId } = useAuth();
  const router = useRouter();
  const { visit, loading, error, refresh } = useVisit(ownerId, storeId, visitId);
  const [printing, setPrinting] = useState(false);

  if (loading) return <Center text="Loading receipt…" />;
  if (!visit) return <Center text={error || 'Receipt not found.'} action={refresh} />;

  const handlePrint = async () => {
    if (!user || !ownerId) return;
    setPrinting(true);
    try {
      await Print.printAsync({ html: generateReceiptHtml(visit) });
      await markPrinted(ownerId, visit.storeId, visit.id, user.uid);
    } catch (e: any) {
      Alert.alert('Print Error', e.message || 'Receipt could not be printed.');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.backRow}>
        <Button title="Back" onPress={() => router.back()} variant="secondary" compact />
      </View>
      <Text style={styles.eyebrow}>THERMAL RECEIPT PREVIEW</Text>
      <Text style={styles.title}>Review before printing</Text>
      <ReceiptView visit={visit} />
      <View style={styles.actions}>
        <Button title="Print Receipt" onPress={handlePrint} loading={printing} />
        <Button title="Done" onPress={() => router.replace('/select-store' as any)} variant="secondary" disabled={printing} />
      </View>
    </ScrollView>
  );
}

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
    marginBottom: spacing.lg,
    color: colors.textPrimary,
    fontSize: fontSizes.h1,
    fontWeight: '700',
  },
  actions: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  backRow: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
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
