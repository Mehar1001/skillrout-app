import { StyleSheet, Text, View } from 'react-native';
import { type Colors, fontSizes, spacing } from '../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { formatCurrency, formatDate, formatTime } from '../helpers/formatters';
import { Visit } from '../types';

export const ReceiptView = ({ visit }: { visit: Visit }) => {
  const colors = useColors();
  const styles = makeStyles(colors);
  const timestamp = visit.timestamp?.toDate?.();
  return (
    <View style={styles.receipt}>
      <Text style={styles.brand}>SKILLROUT</Text>
      <Text style={styles.store}>{visit.storeName}</Text>
      <Text style={styles.meta}>Visit {visit.id}</Text>
      <Text style={styles.meta}>Employee: {visit.employeeName}</Text>
      <Text style={styles.meta}>Business date: {formatDate(visit.businessDate)}</Text>
      {timestamp ? <Text style={styles.meta}>RUN: {formatDate(timestamp)} {formatTime(timestamp)}</Text> : null}

      <View style={styles.divider} />
      {visit.machines.map(machine => (
        <View key={machine.machineId} style={styles.machine}>
          <Text style={styles.machineName}>Machine {machine.machineNumber}{machine.name ? ` · ${machine.name}` : ''}</Text>
          <ReceiptRow label="Last IN" value={formatCurrency(machine.lastSettledIn)} />
          <ReceiptRow label="Present IN" value={formatCurrency(machine.presentIn)} />
          <ReceiptRow label="New IN" value={formatCurrency(machine.newIn)} />
          <ReceiptRow label="Last OUT" value={formatCurrency(machine.lastSettledOut)} />
          <ReceiptRow label="Present OUT" value={formatCurrency(machine.presentOut)} />
          <ReceiptRow label="New OUT" value={formatCurrency(machine.newOut)} />
          <ReceiptRow label="Machine Net" value={formatCurrency(machine.machineNet)} strong />
        </View>
      ))}

      <View style={styles.divider} />
      <ReceiptRow label="Total New IN" value={formatCurrency(visit.totalNewIn)} />
      <ReceiptRow label="Total New OUT" value={formatCurrency(visit.totalNewOut)} />
      <ReceiptRow label="Total Net" value={formatCurrency(visit.totalNet)} strong />
      <ReceiptRow label={`Store ${visit.storePercent}%`} value={formatCurrency(visit.storeAmount)} />
      <ReceiptRow label={`Vendor ${visit.vendorPercent}%`} value={formatCurrency(visit.vendorAmount)} />
      <ReceiptRow label="Cash Due Location" value={formatCurrency(visit.cashDueLocation)} strong />

      <View style={styles.status}>
        <Text style={styles.statusText}>
          {visit.settlementStatus === 'submitted' ? 'SUBMITTED' : 'PRINTED — NOT SUBMITTED'}
        </Text>
      </View>
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
    color: colors.primary,
    fontSize: fontSizes.h2,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
  },
  store: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: fontSizes.h3,
    fontWeight: '700',
    textAlign: 'center',
  },
  meta: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: fontSizes.caption,
    textAlign: 'center',
  },
  divider: {
    marginVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.textMuted,
    borderStyle: 'dashed',
  },
  machine: {
    marginBottom: spacing.md,
  },
  machineName: {
    marginBottom: spacing.sm,
    color: colors.textPrimary,
    fontSize: fontSizes.body,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 3,
  },
  rowText: {
    color: colors.textPrimary,
    fontSize: fontSizes.caption,
  },
  strong: {
    fontWeight: '700',
  },
  status: {
    marginTop: spacing.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  statusText: {
    color: colors.primary,
    fontSize: fontSizes.caption,
    fontWeight: '700',
    textAlign: 'center',
  },
});
