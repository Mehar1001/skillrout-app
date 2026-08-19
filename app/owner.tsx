import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  Alert,
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
import { colors, fontSizes, lineHeights, radii, spacing } from '../constants/designTokens';
import { auth, db } from '../firebaseConfig';

const passwordComplexityRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;

export default function OwnerScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();
  const ScreenContainer = Platform.OS === 'web' ? View : Pressable;

  const handleRegistration = async () => {
    if (email.trim() === '' || password.trim() === '') {
      Alert.alert('Validation Error', 'Both Email and Password are required.');
      return;
    }

    if (!passwordComplexityRegex.test(password)) {
      Alert.alert(
        'Weak Password',
        'Password must be at least 6 characters long and include at least one letter, one number, and one special character (e.g., @$!%*?&).'
      );
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      await sendEmailVerification(user);
      await setDoc(doc(db, 'owners', user.uid), {
        email: user.email,
        businessName: ownerName.trim(),
        subscriptionStatus: 'active',
      });
      Alert.alert(
        'Verification Email Sent!',
        'Your account has been created. Please check your email and click the verification link.'
      );
      setEmail('');
      setPassword('');
      setOwnerName('');
      setIsRegistering(false);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('Registration Failed', 'This email is already registered. Please try logging in.');
      } else if (error.code === 'auth/weak-password') {
        Alert.alert('Registration Failed', 'Password is too weak. Please use a stronger password.');
      } else {
        Alert.alert('System Error', 'An unexpected error occurred during registration.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (email.trim() === '' || password.trim() === '') {
      Alert.alert('Validation Error', 'Both Email and Password are required.');
      return;
    }
    Keyboard.dismiss();
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      await user.reload();

      if (!user.emailVerified) {
        Alert.alert(
          'Email Not Verified',
          'Please check your inbox and click the verification link. Resend it?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Resend Email', onPress: () => sendEmailVerification(user) },
          ]
        );
        auth.signOut();
        setIsLoading(false);
        return;
      }

      const ownerSnap = await getDoc(doc(db, 'owners', user.uid));
      if (!ownerSnap.exists()) {
        const employeeSnap = await getDoc(doc(db, 'employees', user.uid));
        if (!employeeSnap.exists() || employeeSnap.data().active !== true) {
          Alert.alert('Access Denied', 'Your account is not active in Skillrout.');
          auth.signOut();
          setIsLoading(false);
          return;
        }
        Alert.alert('Welcome Back!', `Logged in as ${employeeSnap.data().name || 'Employee'}.`);
        router.replace('/select-store' as any);
        return;
      }

      const ownerData = ownerSnap.data();
      const fetchedOwnerName = ownerData.businessName || 'Admin';

      if (ownerData.subscriptionStatus !== 'active') {
        Alert.alert('Subscription Inactive', 'Your account is not active. Please contact support.');
        auth.signOut();
        setIsLoading(false);
        return;
      }

      const ownerPasswordKey = `ownerPassword_${user.uid}`;
      const reportingPasswordKey = `reportingPassword_${user.uid}`;
      const lastKnownPassword = await AsyncStorage.getItem(ownerPasswordKey);
      if (lastKnownPassword && lastKnownPassword !== password) {
        await AsyncStorage.removeItem(reportingPasswordKey);
      }
      await AsyncStorage.setItem(ownerPasswordKey, password);
      Alert.alert('Welcome Back!', `Logged in as ${fetchedOwnerName}.`);
      router.replace('/dashboard' as any);
    } catch (error: any) {
      if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-credential'
      ) {
        Alert.alert('Login Failed', 'Invalid email or password. Please try again or register.');
      } else {
        Alert.alert('System Error', 'An unexpected error occurred during login.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = () => {
    if (!email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address to reset your password.');
      return;
    }

    sendPasswordResetEmail(auth, email.trim())
      .then(() => {
        Alert.alert('Check Your Email', `A reset link has been sent to ${email}.`);
      })
      .catch(() => {
        Alert.alert('Error', 'Could not send reset email. Make sure the email is correct.');
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
              source={require('../assets/images/skillrout-icon.png')}
              style={styles.logo}
              accessibilityLabel="Skillrout"
            />
            <Text style={styles.title}>Skillrout</Text>
            <Text style={styles.subtitle}>
              {isRegistering ? 'Create your admin account' : 'Sign in to manage stores and visits'}
            </Text>
          </View>

          <View style={styles.tabs}>
            <Pressable
              onPress={() => setIsRegistering(false)}
              style={[styles.tab, !isRegistering && styles.tabActive]}
            >
              <Text style={[styles.tabText, !isRegistering && styles.tabTextActive]}>Sign In</Text>
            </Pressable>
            <Pressable
              onPress={() => setIsRegistering(true)}
              style={[styles.tab, isRegistering && styles.tabActive]}
            >
              <Text style={[styles.tabText, isRegistering && styles.tabTextActive]}>Create Account</Text>
            </Pressable>
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
              <Pressable onPress={handlePasswordReset} style={styles.forgot}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
            )}

            <View style={styles.action}>
              <Button
                title={isRegistering ? 'Create Account' : 'Sign In'}
                onPress={isRegistering ? handleRegistration : handleLogin}
                loading={isLoading}
                variant="primary"
              />
            </View>

            {isRegistering && (
              <View style={styles.requirements}>
                <Text style={styles.requirementsTitle}>Password requirements</Text>
                <Text style={styles.requirementsText}>
                  • At least 6 characters{'\n'}
                  • One letter, one number, one special character (@$!%*?&)
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.footer}>Secure admin access — Skillrout</Text>
        </ScrollView>
        <StatusBar style="dark" />
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
    width: 89,
    height: 89,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
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
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  forgotText: {
    fontSize: fontSizes.body,
    color: colors.accent,
    fontWeight: '600',
  },
  action: {
    marginTop: spacing.sm,
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
    letterSpacing: 0.5,
  },
  requirementsText: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    lineHeight: lineHeights.caption,
  },
  footer: {
    textAlign: 'center',
    fontSize: fontSizes.caption,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
});
