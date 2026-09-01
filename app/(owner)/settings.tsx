import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { PasswordRequirements } from '../../components/PasswordRequirements';
import { type Colors, fontSizes, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';
import { isPasswordValid } from '../../helpers/passwordValidation';
import { mapFirebaseError } from '../../helpers/firebaseErrors';
import { sendSkillroutPasswordReset } from '../../helpers/passwordReset';
import { auth } from '../../firebaseConfig';

export default function OwnerSettingsScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const router = useRouter();
  const { user, businessName, email } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleUpdatePassword = async () => {
    setMessage(null);
    if (!currentPassword.trim() || !newPassword.trim() || newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'All fields are required and passwords must match.' });
      return;
    }
    if (!isPasswordValid(newPassword)) {
      setMessage({
        type: 'error',
        text: 'Password must be 10–128 characters with at least one letter, one number, and one special character.',
      });
      return;
    }
    if (!user?.email) {
      setMessage({ type: 'error', text: 'No signed-in user.' });
      return;
    }
    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setMessage({ type: 'success', text: 'Password updated.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      setMessage({ type: 'error', text: mapFirebaseError(e) });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      await sendSkillroutPasswordReset(auth, user.email, 'owner');
      Alert.alert('Reset link sent', `Check your inbox at ${user.email}.`);
    } catch (e) {
      Alert.alert('Error', mapFirebaseError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profile & Settings</Text>

      <Card style={styles.card}>
        <Text style={styles.label}>Business</Text>
        <Text style={styles.value}>{businessName || '—'}</Text>

        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{email || '—'}</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Update Password</Text>
        <Input
          label="Current password"
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Enter current password"
        />
        <Input
          label="New password"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="At least 10 characters with letter, number, special"
        />
        <PasswordRequirements password={newPassword} />
        <Input
          label="Confirm new password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter new password"
        />
        <Button title="Update Password" onPress={handleUpdatePassword} loading={loading} />
        <Button title="I forgot my password" onPress={handleForgotPassword} variant="secondary" disabled={loading} />
        {message ? (
          <View
            style={[
              styles.messageBox,
              { backgroundColor: message.type === 'error' ? colors.glowError : colors.glowSuccess },
            ]}
          >
            <Text style={[styles.messageText, { color: message.type === 'error' ? colors.error : colors.success }]}>
              {message.text}
            </Text>
          </View>
        ) : null}
      </Card>

      <Button title="Done" onPress={() => router.back()} variant="secondary" />
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
    minHeight: '100%',
    gap: spacing.md,
  },
  title: {
    fontSize: fontSizes.h1,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  card: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSizes.h2,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  value: {
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  messageBox: {
    padding: spacing.md,
    borderRadius: 13,
    marginTop: spacing.md,
  },
  messageText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    textAlign: 'center',
  },
});
