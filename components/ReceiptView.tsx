import { Platform, StyleSheet, Text, View } from 'react-native';
import { type Colors, fontSizes, spacing } from '../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { buildReceiptLines } from '../helpers/receiptTemplate';
import { Visit } from '../types';

const monoFont = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'Courier New' });

export const ReceiptView = ({ visit }: { visit: Visit }) => {
  const colors = useColors();
  const styles = makeStyles(colors);
  const lines = buildReceiptLines(visit);
  return (
    <View style={styles.receipt}>
      <Text style={styles.brand}>{lines.title}</Text>
      <Text style={styles.store}>{lines.storeName}</Text>
      {lines.storeAddress ? <Text style={styles.storeAddress}>{lines.storeAddress}</Text> : null}

      <View style={styles.divider} />
      <ReceiptRow label="Date" value={lines.date} />
      {lines.time ? <ReceiptRow label="Time" value={lines.time} /> : null}
      <ReceiptRow label="Visit" value={lines.visitId} />
      <ReceiptRow label="Employee" value={lines.employee} />

      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>TOTAL VOUCHERS PRINTED</Text>
      <Text style={styles.bigTotal}>{lines.vouchersTotal}</Text>

      <View style={styles.divider} />
      {lines.machines.map((machine, index) => (
        <View key={index} style={styles.machineBlock}>
          <ReceiptRow label={machine.label} value={machine.creditsIn} />
          <ReceiptRow label="Total Paid" value={machine.totalPaid} />
        </View>
      ))}

      <View style={styles.divider} />
      <ReceiptRow label="Money In" value={lines.moneyIn} strong />
      <ReceiptRow label="Money Out" value={lines.moneyOut} strong />
      <ReceiptRow label="Net" value={lines.net} strong />

      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>NET SHARING</Text>
      {lines.sharing.map((share, index) => (
        <ReceiptRow key={index} label={share.label} value={share.amount} />
      ))}

      <View style={styles.divider} />
      <ReceiptRow label="Cash Due Location" value={lines.cashDue} strong />
      <Text style={styles.status}>{lines.status}</Text>
    </View>
  );
};

const ReceiptRow = ({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) => { const colors = useColors(); const styles = makeStyles(colors); return (
  <View style={styles.row}>
    <Text style={[styles.rowText, strong ? styles.strong : null]}>{label}</Text>
    <Text style={[styles.rowText, strong ? styles.strong : null]}>{value}</Text>
  </View>
); };

const makeStyles = (colors: Colors) => StyleSheet.create({
  receipt: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  brand: {
    color: colors.textPrimary,
    fontFamily: monoFont,
    fontSize: fontSizes.h2,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
  },
  store: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontFamily: monoFont,
    fontSize: fontSizes.body,
    textAlign: 'center',
  },
  storeAddress: {
    color: colors.textSecondary,
    fontFamily: monoFont,
    fontSize: fontSizes.caption,
    textAlign: 'center',
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontFamily: monoFont,
    fontSize: fontSizes.caption,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  bigTotal: {
    color: colors.textPrimary,
    fontFamily: monoFont,
    fontSize: fontSizes.h1,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
  },
  divider: {
    marginVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.textMuted,
    borderStyle: 'dashed',
  },
  machineBlock: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  rowText: {
    color: colors.textPrimary,
    fontFamily: monoFont,
    fontSize: fontSizes.caption,
  },
  strong: {
    fontWeight: '700',
  },
  status: {
    marginTop: spacing.md,
    color: colors.textPrimary,
    fontFamily: monoFont,
    fontSize: fontSizes.body,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
  },
});
