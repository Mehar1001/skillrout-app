import { updatePassword } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { type Colors, fontSizes, lineHeights, spacing } from '../../constants/designTokens';
import { useAuth } from '../../contexts/AuthContext';
import { auth, functions } from '../../firebaseConfig';
import { useColors } from '../../hooks/useColors';

const passwordComplexity = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,128}$/;
const completePasswordChange = httpsCallable(functions, 'completeEmployeePasswordChange');

export default function ChangePasswordScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { user, mustChangePassword } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user || auth.currentUser?.uid !== user.uid) return;
    if (!passwordComplexity.test(password)) {
      Alert.alert('Strong Password Required', 'Use 10–128 characters with at least one letter, number, and special character.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords Do Not Match', 'Enter the same new password in both fields.');
      return;
    }
    setSaving(true);
    try {
      await updatePassword(auth.currentUser, password);
      await completePasswordChange();
      setPassword('');
      setConfirmPassword('');
      router.replace('/select-store' as any);
    } catch (error: any) {
      Alert.alert(
        'Password Change Failed',
        error?.code === 'auth/requires-recent-login'
          ? 'Sign out, sign in again with the temporary password, and retry.'
          : error?.message || 'Your password could not be changed.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.eyebrow}>FIRST LOGIN</Text>
        <Text style={styles.title}>Create your private password</Text>
        <Text style={styles.subtitle}>Your owner created a temporary password. Replace it before accessing stores or visits.</Text>
        <Input
          label="New password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder="10+ characters"
        />
        <Input
          label="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder="Repeat password"
        />
        <Button title="Save Password" onPress={handleSave} loading={saving} disabled={saving} />
        {!mustChangePassword ? (
          <Button title="Continue" onPress={() => router.replace('/select-store' as any)} variant="secondary" disabled={saving} />
        ) : null}
      </Card>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: fontSizes.caption,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSizes.h2,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
  },
});
