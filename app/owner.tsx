import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import React, { useState } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { type Colors, fontSizes, letterSpacings, lineHeights, radii, spacing } from '../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '../contexts/AuthContext';
import { mapFirebaseError } from '../helpers/firebaseErrors';
import { auth, db, functions } from '../firebaseConfig';

const passwordComplexityRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,128}$/;
const registerOwnerProfile = httpsCallable(functions, 'registerOwnerProfile');
const provisionOwner = httpsCallable(functions, 'provisionOwner');

export default function OwnerScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { signOut: authSignOut } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const scheme = useColorScheme() ?? 'light';

  const clearMessage = () => setMessage(null);
  const ScreenContainer = Platform.OS === 'web' ? View : Pressable;

  const handleRegistration = async () => {
    clearMessage();
    if (!ownerName.trim() || email.trim() === '' || password.trim() === '') {
      setMessage({ type: 'error', text: 'Business name, email, and password are required.' });
      return;
    }
    if (ownerName.trim().length > 120) {
      setMessage({ type: 'error', text: 'Business name must be 120 characters or fewer.' });
      return;
    }

    if (!passwordComplexityRegex.test(password)) {
      setMessage({
        type: 'error',
        text: 'Password must be 10–128 characters and include at least one letter, one number, and one special character (e.g., @$!%*?&).',
      });
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const user = userCredential.user;
      try {
        await registerOwnerProfile({ businessName: ownerName.trim() });
      } catch (profileError) {
        await user.delete().catch(() => undefined);
        throw profileError;
      }
      setMessage({
        type: 'success',
        text: 'Your owner access request has been submitted. It must be approved before you can sign in.',
      });
      setEmail('');
      setPassword('');
      setOwnerName('');
      setIsRegistering(false);
    } catch (error: any) {
      const text =
        error.code === 'auth/email-already-in-use'
          ? 'This email is already registered. Try signing in.'
          : mapFirebaseError(error);
      setMessage({ type: 'error', text });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    clearMessage();
    if (email.trim() === '' || password.trim() === '') {
      setMessage({ type: 'error', text: 'Both email and password are required.' });
      return;
    }
    Keyboard.dismiss();
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      await user.reload();

      let ownerSnap = await getDoc(doc(db, 'owners', user.uid));
      if (ownerSnap.exists()) {
        await provisionOwner();
        ownerSnap = await getDoc(doc(db, 'owners', user.uid));
      }
      if (!ownerSnap.exists()) {
        const pendingSnap = await getDoc(doc(db, 'pendingOwners', user.uid));
        if (pendingSnap.exists()) {
          setMessage({
            type: 'error',
            text: 'Your owner access request is still pending approval. You will be able to sign in once an admin approves it.',
          });
          await authSignOut();
          setIsLoading(false);
          return;
        }
        const employeeSnap = await getDoc(doc(db, 'employees', user.uid));
        if (!employeeSnap.exists() || employeeSnap.data().active !== true) {
          setMessage({ type: 'error', text: 'Your account is not active in Skillrout.' });
          await authSignOut();
          setIsLoading(false);
          return;
        }
        router.replace((employeeSnap.data().mustChangePassword ? '/change-password' : '/select-store') as any);
        return;
      }

      const ownerData = ownerSnap.data();

      if (!user.emailVerified || ownerData.subscriptionStatus !== 'active') {
        if (!user.emailVerified) {
          await sendEmailVerification(user);
        }
        setMessage({
          type: 'error',
          text: !user.emailVerified
            ? 'Email not verified. A new verification link has been sent — check your inbox and click it before signing in.'
            : 'Your account is not active. Please contact support.',
        });
        await authSignOut();
        setIsLoading(false);
        return;
      }

      await AsyncStorage.multiRemove([
        `ownerPassword_${user.uid}`,
        `reportingPassword_${user.uid}`,
      ]);
      router.replace('/dashboard' as any);
    } catch (error: any) {
      const text =
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-credential'
          ? 'Invalid email or password. Please try again or register.'
          : mapFirebaseError(error);
      setMessage({ type: 'error', text });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = () => {
    clearMessage();
    if (!email.includes('@')) {
      setMessage({ type: 'error', text: 'Please enter a valid email address to reset your password.' });
      return;
    }

    sendPasswordResetEmail(auth, email.trim())
      .then(() => {
        setMessage({ type: 'success', text: `A reset link has been sent to ${email}.` });
      })
      .catch((error: any) => {
        setMessage({ type: 'error', text: mapFirebaseError(error) });
      });
  };

  return (
    <ScreenContainer
      {...(Platform.OS === 'web' ? {} : { onPress: Keyboard.dismiss })}
      style={{ flex: 1 }}
      accessible={false}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.header}>
            <Image
              source={require('../assets/images/skillrout-icon-blue.png')}
              style={styles.logo}
              accessibilityLabel="Skillrout"
            />
            <Text style={styles.tagline}>Bookkeeping by</Text>
            <Text style={styles.title}>Skillrout</Text>
            <Text style={styles.subtitle}>
              {isRegistering ? 'Request owner access' : 'Sign in to manage stores and visits'}
            </Text>
          </View>

          <View style={styles.form}>
            {isRegistering && (
              <Input
                label="Business name"
                placeholder="Your business"
                value={ownerName}
                onChangeText={setOwnerName}
                autoCapitalize="words"
              />
            )}
            <Input
              label="Email"
              placeholder="you@business.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Input
              label="Password"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoComplete="password"
            />

            {!isRegistering && (
              <Pressable onPress={handlePasswordReset} style={styles.forgot} accessibilityRole="button" accessibilityLabel="Forgot password">
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
            )}

            {message ? (
              <View
                style={[
                  styles.messageBox,
                  { backgroundColor: message.type === 'error' ? colors.glowError : colors.glowPrimary },
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    { color: message.type === 'error' ? colors.error : colors.primary },
                  ]}
                >
                  {message.text}
                </Text>
              </View>
            ) : null}

            <View style={styles.action}>
              <Button
                title={isRegistering ? 'Submit Request' : 'Sign In'}
                onPress={isRegistering ? handleRegistration : handleLogin}
                loading={isLoading}
                variant="primary"
              />
            </View>

            {isRegistering && (
              <View style={styles.requirements}>
                <Text style={styles.requirementsTitle}>Password requirements</Text>
                <Text style={styles.requirementsText}>
                  • At least 10 characters{'\n'}
                  • One letter, one number, one special character (@$!%*?&)
                </Text>
              </View>
            )}
          </View>

          <Pressable
            onPress={() => { setIsRegistering(v => !v); setMessage(null); }}
            style={styles.requestAccess}
            accessibilityRole="button"
          >
            <Text style={styles.requestAccessText}>
              {isRegistering ? 'Already have an account? Sign in' : 'Need an owner account? Request access'}
            </Text>
          </Pressable>

          <Text style={styles.footer}>Secure admin access — Skillrout</Text>
        </ScrollView>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    width: spacing.xxl,
    height: spacing.xxl,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagline: {
    fontSize: fontSizes.caption,
    color: colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: letterSpacings.wide,
    marginTop: spacing.xs,
    marginBottom: -spacing.xs,
  },
  title: {
    fontSize: fontSizes.h1,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: lineHeights.body,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderColor: colors.border,
  },
  tabActive: {
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: fontSizes.body,
    color: colors.textMuted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  forgot: {
    alignSelf: 'flex-end',
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  forgotText: {
    fontSize: fontSizes.body,
    color: colors.primary,
    fontWeight: '600',
  },
  action: {
    marginTop: spacing.sm,
  },
  messageBox: {
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  messageText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    textAlign: 'center',
  },
  requirements: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.md,
  },
  requirementsTitle: {
    fontSize: fontSizes.caption,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: letterSpacings.wide,
  },
  requirementsText: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    lineHeight: lineHeights.caption,
  },
  requestAccess: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  requestAccessText: {
    fontSize: fontSizes.body,
    color: colors.primary,
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    fontSize: fontSizes.caption,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
});
