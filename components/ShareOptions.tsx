import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { fontSizes, radii, spacing } from '../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { Button } from './Button';

interface ShareOptionsProps {
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onSharePdf: () => void;
  onShareJpeg: () => void;
}

export const ShareOptions = ({ visible, loading = false, onClose, onSharePdf, onShareJpeg }: ShareOptionsProps) => {
  const colors = useColors();
  const styles = makeStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Close share options">
        <Pressable style={styles.card} onPress={event => event.stopPropagation()}>
          <Text style={styles.title}>Share receipt</Text>
          <Text style={styles.subtitle}>Choose PDF or JPEG, then select WhatsApp, Mail, Messages, or another app from your device’s share sheet.</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share as PDF"
            disabled={loading}
            onPress={onSharePdf}
            style={({ pressed }) => [styles.option, pressed && styles.pressed, loading && styles.disabled]}
          >
            <Ionicons name="document-text-outline" size={22} color={colors.primary} />
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Share as PDF</Text>
              <Text style={styles.optionSubtitle}>Best for printing and records</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share as JPEG"
            disabled={loading}
            onPress={onShareJpeg}
            style={({ pressed }) => [styles.option, pressed && styles.pressed, loading && styles.disabled]}
          >
            <Ionicons name="image-outline" size={22} color={colors.accent} />
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Share as JPEG</Text>
              <Text style={styles.optionSubtitle}>Easy to send as an image</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          <Button title="Cancel" onPress={onClose} variant="secondary" disabled={loading} />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const makeStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: spacing.lg,
    backgroundColor: colors.overlay,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSizes.h2,
    fontWeight: '700',
  },
  subtitle: {
    marginBottom: spacing.sm,
    color: colors.textSecondary,
    fontSize: fontSizes.body,
  },
  option: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    color: colors.textPrimary,
    fontSize: fontSizes.body,
    fontWeight: '700',
  },
  optionSubtitle: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: fontSizes.caption,
  },
  pressed: {
    backgroundColor: colors.surfaceSecondary,
  },
  disabled: {
    opacity: 0.5,
  },
});
