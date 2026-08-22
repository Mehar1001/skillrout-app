import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { calculateMachine } from '../helpers/calculations';
import { formatCurrency } from '../helpers/formatters';
import { validatePresentReading } from '../helpers/validators';
import { Machine, MachineReadingDraft } from '../types';
import { type Colors, fontSizes, radii, spacing } from '../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { Card } from './Card';
import { CurrencyInput } from './CurrencyInput';

interface MachineReadingCardProps {
  machine: Machine;
  reading: MachineReadingDraft;
  onChange: (reading: MachineReadingDraft) => void;
  onTakePhoto: () => void;
  onUploadPhoto: () => void;
  onReadPhoto: () => void;
  onRemovePhoto: () => void;
  readingPhoto?: boolean;
  showRequiredErrors?: boolean;
}

export const MachineReadingCard = ({
  machine,
  reading,
  onChange,
  onTakePhoto,
  onUploadPhoto,
  onReadPhoto,
  onRemovePhoto,
  readingPhoto = false,
  showRequiredErrors = false,
}: MachineReadingCardProps) => {
  const colors = useColors();
  const styles = makeStyles(colors);
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
            <View style={styles.photoSelected}>
              <View style={styles.photoWrap}>
                <Image source={{ uri: reading.photoUri }} style={styles.photo} accessibilityLabel={`Photo for machine ${machine.machineNumber}`} />
                <Pressable accessibilityRole="button" onPress={onRemovePhoto} style={styles.removePhoto}>
                  <Ionicons name="close" color={colors.textOnPrimary} size={18} />
                </Pressable>
              </View>
              <Pressable accessibilityRole="button" onPress={onReadPhoto} disabled={readingPhoto} style={[styles.readPhotoButton, readingPhoto && styles.readPhotoDisabled]}>
                <Ionicons name="scan-outline" color={colors.textOnAccent} size={18} />
                <Text style={styles.readPhotoText}>{readingPhoto ? 'Reading…' : 'Read values'}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.photoActions}>
              <Pressable accessibilityRole="button" onPress={onTakePhoto} style={styles.cameraButton}>
                <Ionicons name="camera-outline" color={colors.accent} size={21} />
                <Text style={styles.cameraText}>Camera</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={onUploadPhoto} style={styles.cameraButton}>
                <Ionicons name="cloud-upload-outline" color={colors.accent} size={21} />
                <Text style={styles.cameraText}>Upload</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {reading.ocr ? (
        <View style={[styles.ocrStatus, reading.ocr.status === 'warning' && styles.ocrWarning]}>
          <Ionicons name="scan-outline" color={reading.ocr.status === 'warning' ? colors.warning : colors.success} size={18} />
          <Text style={styles.ocrStatusText}>
            {reading.ocr.status === 'reviewed' ? 'OCR applied — employee reviewed' : reading.ocr.status === 'warning' ? 'OCR warning — verify values' : 'OCR suggested — review required'}
          </Text>
        </View>
      ) : null}

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

const ActivityValue = ({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) => { const colors = useColors(); const styles = makeStyles(colors); return (
  <View style={styles.activityItem}>
    <Text style={styles.activityLabel}>{label}</Text>
    <Text style={[styles.activityValue, emphasis ? styles.activityEmphasis : null]}>{value}</Text>
  </View>
); };

const makeStyles = (colors: Colors) => StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    alignItems: 'flex-end',
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  cameraButton: {
    minHeight: 48,
    minWidth: 70,
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
  photoSelected: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  photoWrap: {
    position: 'relative',
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
  },
  readPhotoButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
  },
  readPhotoDisabled: {
    opacity: 0.55,
  },
  readPhotoText: {
    color: colors.textOnAccent,
    fontSize: fontSizes.caption,
    fontWeight: '700',
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
  ocrStatus: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.accentSubtle,
    borderWidth: 1,
    borderColor: colors.success,
  },
  ocrWarning: {
    borderColor: colors.warning,
  },
  ocrStatusText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSizes.caption,
    fontWeight: '600',
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
