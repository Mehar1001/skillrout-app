import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { calculateMachine } from '../helpers/calculations';
import { formatCurrency } from '../helpers/formatters';
import { validatePresentReading } from '../helpers/validators';
import { Machine, MachineReadingDraft } from '../types';
import { colors, fontSizes, radii, spacing } from '../constants/designTokens';
import { Card } from './Card';
import { CurrencyInput } from './CurrencyInput';

interface MachineReadingCardProps {
  machine: Machine;
  reading: MachineReadingDraft;
  onChange: (reading: MachineReadingDraft) => void;
  onTakePhoto: () => void;
  onRemovePhoto: () => void;
  showRequiredErrors?: boolean;
}

export const MachineReadingCard = ({
  machine,
  reading,
  onChange,
  onTakePhoto,
  onRemovePhoto,
  showRequiredErrors = false,
}: MachineReadingCardProps) => {
  const inError = reading.presentIn === null && !showRequiredErrors
    ? null
    : validatePresentReading(reading.presentIn, machine.lastSettledIn, 'IN');
  const outError = reading.presentOut === null && !showRequiredErrors
    ? null
    : validatePresentReading(reading.presentOut, machine.lastSettledOut, 'OUT');
  const valid = reading.presentIn !== null && reading.presentOut !== null && !inError && !outError;
  const activity = valid
    ? calculateMachine(machine.lastSettledIn, machine.lastSettledOut, reading.presentIn!, reading.presentOut!)
    : null;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.number}>Machine {machine.machineNumber}</Text>
          {machine.name ? <Text style={styles.name}>{machine.name}</Text> : null}
        </View>
        <View style={styles.photoArea}>
          {reading.photoUri ? (
            <View style={styles.photoWrap}>
              <Image source={{ uri: reading.photoUri }} style={styles.photo} accessibilityLabel={`Photo for machine ${machine.machineNumber}`} />
              <Pressable accessibilityRole="button" onPress={onRemovePhoto} style={styles.removePhoto}>
                <Ionicons name="close" color={colors.textOnPrimary} size={18} />
              </Pressable>
            </View>
          ) : (
            <Pressable accessibilityRole="button" onPress={onTakePhoto} style={styles.cameraButton}>
              <Ionicons name="camera-outline" color={colors.primary} size={22} />
              <Text style={styles.cameraText}>Photo</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.baselines}>
        <View style={styles.baseline}>
          <Text style={styles.baselineLabel}>Last Settled IN</Text>
          <Text style={styles.baselineValue}>{formatCurrency(machine.lastSettledIn)}</Text>
        </View>
        <View style={styles.baseline}>
          <Text style={styles.baselineLabel}>Last Settled OUT</Text>
          <Text style={styles.baselineValue}>{formatCurrency(machine.lastSettledOut)}</Text>
        </View>
      </View>

      <View style={styles.inputs}>
        <View style={styles.inputHalf}>
          <CurrencyInput
            label="Present IN"
            value={reading.presentIn}
            onChangeValue={presentIn => onChange({ ...reading, presentIn })}
            error={inError}
            helperText={`Minimum ${formatCurrency(machine.lastSettledIn)}`}
          />
        </View>
        <View style={styles.inputHalf}>
          <CurrencyInput
            label="Present OUT"
            value={reading.presentOut}
            onChangeValue={presentOut => onChange({ ...reading, presentOut })}
            error={outError}
            helperText={`Minimum ${formatCurrency(machine.lastSettledOut)}`}
          />
        </View>
      </View>

      <View style={styles.activity}>
        <ActivityValue label="New IN" value={activity ? formatCurrency(activity.newIn) : '—'} />
        <ActivityValue label="New OUT" value={activity ? formatCurrency(activity.newOut) : '—'} />
        <ActivityValue label="Machine Net" value={activity ? formatCurrency(activity.machineNet) : '—'} emphasis />
      </View>
    </Card>
  );
};

const ActivityValue = ({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) => (
  <View style={styles.activityItem}>
    <Text style={styles.activityLabel}>{label}</Text>
    <Text style={[styles.activityValue, emphasis ? styles.activityEmphasis : null]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  number: {
    color: colors.textPrimary,
    fontSize: fontSizes.h2,
    fontWeight: '700',
  },
  name: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: fontSizes.body,
  },
  photoArea: {
    minWidth: 76,
    alignItems: 'flex-end',
  },
  cameraButton: {
    minHeight: 48,
    minWidth: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSecondary,
  },
  cameraText: {
    color: colors.primary,
    fontSize: fontSizes.caption,
    fontWeight: '600',
  },
  photoWrap: {
    position: 'relative',
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
  },
  removePhoto: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.error,
  },
  baselines: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  baseline: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSecondary,
  },
  baselineLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.caption,
  },
  baselineValue: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: fontSizes.h3,
    fontWeight: '700',
  },
  inputs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  inputHalf: {
    flex: 1,
    minWidth: 180,
  },
  activity: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  activityItem: {
    flex: 1,
    minWidth: 100,
  },
  activityLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.caption,
  },
  activityValue: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: fontSizes.body,
    fontWeight: '600',
  },
  activityEmphasis: {
    color: colors.primary,
    fontWeight: '700',
  },
});
