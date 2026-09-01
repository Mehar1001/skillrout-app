import { Platform, StyleSheet, Text, View } from 'react-native';
import { type Colors, fontSizes, spacing } from '../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { buildReceiptLines, type LastClearedInfo } from '../helpers/receiptTemplate';
import { Visit } from '../types';

const monoFont = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'Courier New' });

export const ReceiptView = ({ visit, lastCleared }: { visit: Visit; lastCleared?: LastClearedInfo | null }) => {
  const colors = useColors();
  const styles = makeStyles(colors);
  const lines = buildReceiptLines(visit, lastCleared);
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
          <View style={styles.machineHeading}>
            <Text style={styles.machineTitle}>{machine.name}</Text>
            <Text style={styles.machineSerial}>#{machine.machineNumber}</Text>
          </View>
          <ReceiptRow label="In:" value={machine.inRange} strong />
          <ReceiptRow label="Out:" value={machine.outRange} strong />
          <ReceiptRow label="Cash" value={machine.cash} />
          <ReceiptRow label="Payout *" value={machine.payout} />
        </View>
      ))}

      <View style={styles.divider} />
      <ReceiptRow label="Money In" value={lines.moneyIn} strong />
      <ReceiptRow label="Money Out" value={lines.moneyOut} strong />
      <ReceiptRow label="Net" value={lines.net} strong />
      {lines.disclaimer ? <Text style={styles.disclaimer}>{lines.disclaimer}</Text> : null}

      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>NET SHARING</Text>
      {lines.sharing.map((share, index) => (
        <ReceiptRow key={index} label={share.label} value={share.amount} />
      ))}

      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>LAST CLEARED</Text>
      {lines.lastCleared ? (
        <>
          <ReceiptRow
            label={`${lines.lastCleared.date} ${lines.lastCleared.time}`}
            value={lines.lastCleared.amount}
            strong
          />
          <ReceiptRow label="Store" value={lines.lastCleared.storeAmount} />
          <ReceiptRow label="Games" value={lines.lastCleared.vendorAmount} />
        </>
      ) : (
        <Text style={styles.na}>No prior positive visit on record.</Text>
      )}

      <View style={styles.divider} />
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
    marginBottom: spacing.md,
  },
  machineHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  machineTitle: {
    color: colors.textPrimary,
    fontFamily: monoFont,
    fontSize: fontSizes.body,
    fontWeight: '700',
  },
  machineSerial: {
    color: colors.textMuted,
    fontFamily: monoFont,
    fontSize: 10,
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
  disclaimer: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontFamily: monoFont,
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  na: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontFamily: monoFont,
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
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
