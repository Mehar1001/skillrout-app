import * as Print from 'expo-print';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { ReceiptView } from '../../components/ReceiptView';
import { ShareOptions } from '../../components/ShareOptions';
import { type Colors, fontSizes, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate, formatTime } from '../../helpers/formatters';
import { generateReceiptHtml, type LastClearedInfo } from '../../helpers/receiptTemplate';
import { useVisit } from '../../hooks/useVisit';
import { listAssignedStoreVisits, markPrinted } from '../../services/visits';
import { shareReceiptJpeg, shareReceiptPdf } from '../../helpers/shareReceipt';

export default function ReceiptScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { visitId, storeId } = useLocalSearchParams<{ visitId: string; storeId: string }>();
  const { user, ownerId } = useAuth();
  const router = useRouter();
  const { visit, loading, error, refresh } = useVisit(ownerId, storeId, visitId);
  const receiptRef = useRef<View>(null);
  const [working, setWorking] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState<{ text: string; error: boolean } | null>(null);
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
    let printFrame: any = null;
    try {
      await markPrinted(ownerId, visit.storeId, visit.id, user.uid);
      const html = generateReceiptHtml(visit, lastCleared);

      if (Platform.OS === 'web') {
        if (typeof document === 'undefined') return;
        printFrame = (document as any).createElement('iframe');
        printFrame.style.position = 'fixed';
        printFrame.style.left = '-9999px';
        printFrame.style.top = '-9999px';
        printFrame.style.width = '1px';
        printFrame.style.height = '1px';
        printFrame.setAttribute('aria-hidden', 'true');
        document.body.appendChild(printFrame);

        const doc = printFrame.contentWindow?.document;
        if (!doc) throw new Error('Print preview could not be prepared.');

        doc.open();
        doc.write(html);
        doc.close();

        setTimeout(() => {
          printFrame?.contentWindow?.focus();
          printFrame?.contentWindow?.print();
          // Remove the hidden frame after the user has time to print.
          setTimeout(() => printFrame?.remove(), 120000);
        }, 400);
        setWorking(false);
        return;
      }
      await Print.printAsync({ html });
    } catch (e: any) {
      printFrame?.remove();
      Alert.alert('Print Error', e.message || 'Receipt could not be printed.');
    } finally {
      setWorking(false);
    }
  };

  const handleShare = async (format: 'pdf' | 'jpeg') => {
    if (!visit || !user || !ownerId) return;
    setShareOpen(false);
    setShareMessage(null);
    setWorking(true);
    try {
      const result: unknown = format === 'pdf'
        ? await shareReceiptPdf(ownerId, visit, user.uid, lastCleared)
        : await shareReceiptJpeg(ownerId, visit, user.uid, receiptRef, lastCleared);
      if (Platform.OS === 'web') {
        setShareMessage({ text: result === 'shared' ? 'Receipt shared.' : 'Receipt downloaded. Open the file to send it with another app.', error: false });
      }
    } catch (e: any) {
      const message = e.message || 'Receipt could not be shared.';
      if (Platform.OS === 'web') setShareMessage({ text: message, error: true });
      else Alert.alert('Share Error', message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>THERMAL RECEIPT PREVIEW</Text>
      <Text style={styles.title}>Review before printing</Text>
      <ReceiptView ref={receiptRef} visit={visit} lastCleared={lastCleared} />
      {shareMessage ? (
        <Text accessibilityLiveRegion="polite" style={shareMessage.error ? styles.shareError : styles.shareSuccess}>
          {shareMessage.text}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button title="Print" onPress={handlePrint} loading={working} />
        <Button title="Share" onPress={() => setShareOpen(true)} variant="secondary" loading={working} />
        <Button title="Done" onPress={() => router.replace('/select-store' as any)} variant="secondary" disabled={working} />
      </View>
      <ShareOptions
        visible={shareOpen}
        loading={working}
        onClose={() => setShareOpen(false)}
        onSharePdf={() => handleShare('pdf')}
        onShareJpeg={() => handleShare('jpeg')}
      />
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
  shareSuccess: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    marginTop: spacing.md,
    color: colors.success,
    fontSize: fontSizes.body,
    textAlign: 'center',
  },
  shareError: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    marginTop: spacing.md,
    color: colors.error,
    fontSize: fontSizes.body,
    textAlign: 'center',
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
