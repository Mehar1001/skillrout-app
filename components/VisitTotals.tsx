import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, radii, spacing } from '../constants/designTokens';
import { formatCurrency } from '../helpers/formatters';
import { Card } from './Card';

interface VisitTotalsProps {
  presentIn: number;
  presentOut: number;
  presentNet: number;
  newIn: number;
  newOut: number;
  activityNet: number;
}

export const VisitTotals = ({
  presentIn,
  presentOut,
  presentNet,
  newIn,
  newOut,
  activityNet,
}: VisitTotalsProps) => (
  <Card style={styles.card}>
    <Text style={styles.title}>Live totals</Text>
    <Text style={styles.sectionLabel}>Present readings</Text>
    <View style={styles.row}>
      <Total label="Present IN" value={presentIn} />
      <Total label="Present OUT" value={presentOut} />
      <Total label="Present Net" value={presentNet} emphasis />
    </View>
    <Text style={styles.sectionLabel}>Activity since last settlement</Text>
    <View style={styles.row}>
      <Total label="New IN" value={newIn} />
      <Total label="New OUT" value={newOut} />
      <Total label="Net" value={activityNet} emphasis />
    </View>
  </Card>
);

const Total = ({ label, value, emphasis = false }: { label: string; value: number; emphasis?: boolean }) => (
  <View style={[styles.total, emphasis ? styles.totalEmphasis : null]}>
    <Text style={styles.label}>{label}</Text>
    <Text style={[styles.value, emphasis ? styles.valueEmphasis : null]}>{formatCurrency(value)}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderColor: colors.primary,
  },
  title: {
    marginBottom: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSizes.h2,
    fontWeight: '700',
  },
  sectionLabel: {
    marginBottom: spacing.sm,
    color: colors.textSecondary,
    fontSize: fontSizes.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  total: {
    flex: 1,
    minWidth: 120,
    padding: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSecondary,
  },
  totalEmphasis: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSizes.caption,
  },
  value: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: fontSizes.h3,
    fontWeight: '700',
  },
  valueEmphasis: {
    color: colors.primary,
  },
});
