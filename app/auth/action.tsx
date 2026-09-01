import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  confirmPasswordReset,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  verifyPasswordResetCode,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandMark } from '../../components/BrandMark';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { PasswordRequirements } from '../../components/PasswordRequirements';
import { type Colors, fontSizes, lineHeights, spacing } from '../../constants/designTokens';
import { auth, functions } from '../../firebaseConfig';
import { mapFirebaseError } from '../../helpers/firebaseErrors';
import { isPasswordValid } from '../../helpers/passwordValidation';
import { useColors } from '../../hooks/useColors';

const completePasswordReset = httpsCallable<undefined, { role: 'owner' | 'employee' }>(functions, 'completePasswordReset');

const firstParam = (value: string | string[] | undefined): string => Array.isArray(value) ? value[0] ?? '' : value ?? '';

const maskEmail = (email: string): string => {
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(2, name.length - 2))}@${domain}`;
};

export default function AuthActionScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[]; oobCode?: string | string[] }>();
  const mode = firstParam(params.mode);
  const oobCode = firstParam(params.oobCode);
  const [checking, setChecking] = useState(true);
  const [accountEmail, setAccountEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    const verify = async () => {
      if (mode !== 'resetPassword' || !oobCode) {
        if (active) {
          setMessage({ type: 'error', text: 'This password reset link is not valid.' });
          setChecking(false);
        }
        return;
      }
      try {
        const email = await verifyPasswordResetCode(auth, oobCode);
        if (active) setAccountEmail(email);
      } catch (error) {
        if (active) setMessage({ type: 'error', text: mapFirebaseError(error) });
      } finally {
        if (active) setChecking(false);
      }
    };
    verify();
    return () => { active = false; };
  }, [mode, oobCode]);

  const handleReset = async () => {
    setMessage(null);
    if (!isPasswordValid(password)) {
      setMessage({ type: 'error', text: 'Choose a password that meets every requirement below.' });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'The passwords do not match.' });
      return;
    }
    if (!accountEmail || !oobCode) {
      setMessage({ type: 'error', text: 'This password reset link is not valid.' });
      return;
    }

    setWorking(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      await signInWithEmailAndPassword(auth, accountEmail, password);
      const result = await completePasswordReset();
      await firebaseSignOut(auth);
      const path = result.data.role === 'employee' ? '/employee/login?reset=success' : '/owner/login?reset=success';
      router.replace(path as any);
    } catch (error) {
      if (auth.currentUser) await firebaseSignOut(auth).catch(() => undefined);
      setMessage({ type: 'error', text: mapFirebaseError(error) });
    } finally {
      setWorking(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => router.replace('/')} style={styles.backHome} accessibilityRole="button">
        <Ionicons name="arrow-back" size={20} color={colors.primary} />
        <Text style={styles.backHomeText}>Back to home</Text>
      </Pressable>

      <Card style={styles.card}>
        <View style={styles.brand}>
          <BrandMark size={55} />
          <Text style={styles.eyebrow}>BOOKKEEPING BY SKILLROUT</Text>
        </View>

        {checking ? (
          <View style={styles.checking}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.checkingText}>Checking your reset link…</Text>
          </View>
        ) : accountEmail ? (
          <>
            <Text style={styles.title}>Create your new password</Text>
            <Text style={styles.subtitle}>Resetting the password for {maskEmail(accountEmail)}.</Text>
            <Input
              label="New password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              placeholder="Enter a strong password"
            />
            <PasswordRequirements password={password} />
            <Input
              label="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              placeholder="Enter the same password again"
            />
            {message && (
              <View style={[styles.messageBox, { backgroundColor: message.type === 'error' ? colors.glowError : colors.glowSuccess }]}>
                <Text style={[styles.messageText, { color: message.type === 'error' ? colors.error : colors.success }]}>
                  {message.text}
                </Text>
              </View>
            )}
            <Button title="Update Password" onPress={handleReset} loading={working} disabled={working} />
          </>
        ) : (
          <>
            <Text style={styles.title}>Reset link unavailable</Text>
            <Text style={styles.subtitle}>{message?.text || 'This password reset link is invalid or has expired.'}</Text>
            <Button title="Employee Sign In" onPress={() => router.replace('/employee/login')} variant="secondary" />
            <Button title="Owner Sign In" onPress={() => router.replace('/owner/login')} variant="secondary" />
          </>
        )}
      </Card>
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  backHome: {
    alignSelf: 'flex-start',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  backHomeText: {
    color: colors.primary,
    fontSize: fontSizes.body,
    fontWeight: '700',
  },
  card: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: spacing.md,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: fontSizes.caption,
    fontWeight: '700',
  },
  checking: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  checkingText: {
    color: colors.textSecondary,
    fontSize: fontSizes.body,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSizes.h1,
    fontWeight: '800',
    lineHeight: lineHeights.h1,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
    marginBottom: spacing.sm,
  },
  messageBox: {
    padding: spacing.md,
    borderRadius: spacing.sm,
  },
  messageText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    textAlign: 'center',
  },
});
