import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  sendEmailVerification,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, type DocumentSnapshot } from 'firebase/firestore';
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
  Switch,
  Text,
  View,
} from 'react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { type Colors, fontSizes, letterSpacings, lineHeights, radii, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { mapFirebaseError } from '../../helpers/firebaseErrors';
import { auth, db, functions } from '../../firebaseConfig';

const provisionOwner = httpsCallable(functions, 'provisionOwner');

export default function OwnerScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const scheme = useColorScheme() ?? 'light';

  const clearMessage = () => setMessage(null);
  const ScreenContainer = Platform.OS === 'web' ? View : Pressable;

  const getDocOrNull = async (collection: string, id: string): Promise<DocumentSnapshot | null> => {
    try {
      return await getDoc(doc(db, collection, id));
    } catch (error: any) {
      if (error.code === 'permission-denied') return null;
      throw error;
    }
  };

  const handleLogin = async () => {
    clearMessage();
    if (email.trim() === '' || password.trim() === '') {
      setMessage({ type: 'error', text: 'Enter your email and password.' });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setMessage({ type: 'error', text: 'Enter a valid email address.' });
      return;
    }
    Keyboard.dismiss();
    setIsLoading(true);
    try {
      if (Platform.OS === 'web') {
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence).catch(() => undefined);
      }

      const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const user = userCredential.user;
      const idToken = await user.getIdTokenResult(true);

      if (!idToken.claims.email_verified) {
        await sendEmailVerification(user);
        setMessage({
          type: 'error',
          text: 'Email not verified. A new verification link has been sent — check your inbox and click it before signing in.',
        });
        await firebaseSignOut(auth);
        setIsLoading(false);
        return;
      }

      let ownerSnap = await getDocOrNull('owners', user.uid);
      if (ownerSnap?.exists()) {
        await provisionOwner();
        ownerSnap = await getDoc(doc(db, 'owners', user.uid));
      }

      if (!ownerSnap?.exists()) {
        const pendingSnap = await getDocOrNull('pendingOwners', user.uid);
        if (pendingSnap?.exists()) {
          setMessage({
            type: 'error',
            text: 'Your owner access request is still pending approval. You will be able to sign in once an admin approves it.',
          });
          await firebaseSignOut(auth);
          setIsLoading(false);
          return;
        }
        setMessage({ type: 'error', text: 'Account not found for this role.' });
        await firebaseSignOut(auth);
        setIsLoading(false);
        return;
      }

      const ownerData = ownerSnap.data();

      if (ownerData.subscriptionStatus === 'inactive' || ownerData.status === 'inactive') {
        const errorText = ownerData.status === 'inactive'
          ? 'Your account has been deactivated. Please contact support.'
          : 'Your account is not active. Please contact support.';
        setMessage({ type: 'error', text: errorText });
        await firebaseSignOut(auth);
        setIsLoading(false);
        return;
      }

      await AsyncStorage.multiRemove([
        `ownerPassword_${user.uid}`,
        `reportingPassword_${user.uid}`,
      ]);
      router.replace('/dashboard' as any);
    } catch (error: any) {
      setMessage({ type: 'error', text: mapFirebaseError(error) });
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
          <Pressable onPress={() => router.replace('/')} style={styles.backHome} accessibilityRole="button">
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
            <Text style={styles.backHomeText}>Back to home</Text>
          </Pressable>
          <View style={styles.header}>
            <Image
              source={require('../../assets/images/skillrout-icon-green.png')}
              style={styles.logo}
              accessibilityLabel="Skillrout"
            />
            <Text style={styles.tagline}>Bookkeeping by</Text>
            <Text style={styles.title}>Skillrout</Text>
            <Text style={styles.subtitle}>Sign in to manage stores and visits</Text>
          </View>

          <View style={styles.form}>
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

            {Platform.OS === 'web' && (
              <View style={styles.remember}>
                <Switch
                  value={rememberMe}
                  onValueChange={setRememberMe}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={rememberMe ? colors.textOnPrimary : colors.textSecondary}
                />
                <Text style={styles.rememberText}>Keep me signed in</Text>
              </View>
            )}

            <Pressable onPress={handlePasswordReset} style={styles.forgot} accessibilityRole="button" accessibilityLabel="Forgot password">
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>

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
              <Button title="Sign In" onPress={handleLogin} loading={isLoading} />
            </View>
          </View>

          <Pressable
            onPress={() => router.push('/owner/register')}
            style={styles.requestAccess}
            accessibilityRole="button"
          >
            <Text style={styles.requestAccessText}>Need an owner account? Request access</Text>
          </Pressable>

          <Text style={styles.footer}>Secure admin access — Skillrout</Text>
        </ScrollView>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
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
      alignSelf: 'stretch',
      marginBottom: spacing.xl,
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
    logo: {
      width: spacing.xxl,
      height: spacing.xxl,
      borderRadius: radii.lg,
      marginBottom: spacing.md,
      alignSelf: 'center',
      resizeMode: 'contain',
    },
    tagline: {
      fontSize: fontSizes.caption,
      color: colors.primary,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: letterSpacings.wide,
      alignSelf: 'flex-start',
      textAlign: 'left',
      marginTop: spacing.xs,
      marginBottom: spacing.xs,
    },
    title: {
      fontSize: fontSizes.h1,
      color: colors.textPrimary,
      fontWeight: '800',
      alignSelf: 'flex-start',
      textAlign: 'left',
      marginBottom: spacing.xs,
      letterSpacing: letterSpacings.wide,
    },
    subtitle: {
      fontSize: fontSizes.body,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: lineHeights.body,
    },
    form: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      marginBottom: spacing.xl,
    },
    remember: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xs,
      marginBottom: spacing.xs,
    },
    rememberText: {
      fontSize: fontSizes.body,
      color: colors.textSecondary,
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
    action: {
      marginTop: spacing.sm,
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
