import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { createUserWithEmailAndPassword } from 'firebase/auth';
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
import { mapFirebaseError } from '../helpers/firebaseErrors';
import { auth, functions } from '../firebaseConfig';

const passwordComplexityRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,128}$/;
const registerOwnerProfile = httpsCallable(functions, 'registerOwnerProfile');

export default function RequestAccessScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
            <Text style={styles.subtitle}>Request owner access</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Business name"
              placeholder="Your business"
              value={ownerName}
              onChangeText={setOwnerName}
              autoCapitalize="words"
            />
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
              autoComplete="new-password"
            />

            <View style={styles.requirements}>
              <Text style={styles.requirementsTitle}>Password requirements</Text>
              <Text style={styles.requirementsText}>
                • At least 10 characters{'\n'}
                • One letter, one number, one special character (@$!%*?&)
              </Text>
            </View>

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
              <Button title="Submit Request" onPress={handleRegistration} loading={isLoading} />
            </View>
          </View>

          <Pressable
            onPress={() => router.push('/owner')}
            style={styles.requestAccess}
            accessibilityRole="button"
          >
            <Text style={styles.requestAccessText}>Already have an account? Sign in</Text>
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
    logo: {
      width: spacing.xxl,
      height: spacing.xxl,
      borderRadius: radii.lg,
      marginBottom: spacing.md,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
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
    requirements: {
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radii.md,
      marginBottom: spacing.md,
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
