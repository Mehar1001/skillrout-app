import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { ReceiptView } from '../../components/ReceiptView';
import { type Colors, fontSizes, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate, formatTime } from '../../helpers/formatters';
import { generateReceiptHtml, type LastClearedInfo } from '../../helpers/receiptTemplate';
import { useVisit } from '../../hooks/useVisit';
import { listAssignedStoreVisits, markPrinted } from '../../services/visits';

export default function ReceiptScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { visitId, storeId } = useLocalSearchParams<{ visitId: string; storeId: string }>();
  const { user, ownerId } = useAuth();
  const router = useRouter();
  const { visit, loading, error, refresh } = useVisit(ownerId, storeId, visitId);
  const [working, setWorking] = useState(false);
  const [lastCleared, setLastCleared] = useState<LastClearedInfo | null>(null);

  const fetchLastCleared = useCallback(async () => {
    if (!ownerId || !visit) return;
    try {
      const visits = await listAssignedStoreVisits(ownerId, [visit.storeId], 100);
      const previous = visits
        .filter(v => v.id !== visit.id && v.settlementStatus === 'submitted' && v.totalNet > 0)
        .sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0))[0];
      if (previous?.timestamp) {
        const ts = previous.timestamp.toDate();
        setLastCleared({
          date: formatDate(previous.businessDate),
          time: formatTime(ts),
          amount: formatCurrency(previous.totalNet),
          storeAmount: formatCurrency(previous.storeAmount || 0),
          vendorAmount: formatCurrency(previous.vendorAmount || 0),
        });
      } else {
        setLastCleared(null);
      }
    } catch {
      setLastCleared(null);
    }
  }, [ownerId, visit]);

  useEffect(() => {
    fetchLastCleared();
  }, [fetchLastCleared]);

  if (loading) return <Center text="Loading receipt…" />;
  if (!visit) return <Center text={error || 'Receipt not found.'} action={refresh} />;

  const handlePrint = async () => {
    if (!user || !ownerId || !visit) return;
    setWorking(true);
    try {
      await markPrinted(ownerId, visit.storeId, visit.id, user.uid);
      await Print.printAsync({ html: generateReceiptHtml(visit, lastCleared) });
    } catch (e: any) {
      Alert.alert('Print Error', e.message || 'Receipt could not be printed.');
    } finally {
      setWorking(false);
    }
  };

  const handleShare = async () => {
    if (!visit || !user || !ownerId) return;
    setWorking(true);
    try {
      await markPrinted(ownerId, visit.storeId, visit.id, user.uid);
      if (Platform.OS === 'web') {
        await Print.printAsync({ html: generateReceiptHtml(visit, lastCleared) });
        return;
      }
      const { uri } = await Print.printToFileAsync({
        html: generateReceiptHtml(visit, lastCleared),
      });
      const pdfUri = `${FileSystem.cacheDirectory}skillrout-receipt-${visit.id}.pdf`;
      await FileSystem.moveAsync({ from: uri, to: pdfUri });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
      }
    } catch (e: any) {
      Alert.alert('Save/Share Error', e.message || 'Receipt could not be saved or shared.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>THERMAL RECEIPT PREVIEW</Text>
      <Text style={styles.title}>Review before printing</Text>
      <ReceiptView visit={visit} lastCleared={lastCleared} />
      <View style={styles.actions}>
        <Button title="Print" onPress={handlePrint} loading={working} />
        <Button title="Save / Share" onPress={handleShare} variant="secondary" loading={working} />
        <Button title="Done" onPress={() => router.replace('/select-store' as any)} variant="secondary" disabled={working} />
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
