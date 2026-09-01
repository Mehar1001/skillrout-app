import { Redirect, useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { type Colors, fontSizes, letterSpacings, lineHeights, radii, spacing } from '../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../contexts/AuthContext';

export default function IndexScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const router = useRouter();
  const { user, role, mustChangePassword, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.container}>
        <Image
          source={require('../assets/images/skillrout-icon.png')}
          style={styles.logo}
          accessibilityLabel="Skillrout"
        />
        <Text style={styles.text}>Loading Skillrout…</Text>
      </View>
    );
  }

  if (user && role) {
    return <Redirect href={role === 'owner' ? '/dashboard' : (mustChangePassword ? '/change-password' : '/select-store')} />;
  }

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/skillrout-icon.png')}
        style={styles.logo}
        accessibilityLabel="Skillrout"
      />
      <Text style={styles.tagline}>Bookkeeping by</Text>
      <Text style={styles.title}>Skillrout</Text>
      <Text style={styles.subtitle}>Sign in to manage stores and visits</Text>

      <View style={styles.actions}>
        <Button
          title="Admin"
          onPress={() => router.push('/owner')}
          iconName="briefcase-outline"
        />
        <Button
          title="Employee"
          onPress={() => router.push('/employee-signin')}
          variant="secondary"
          iconName="people-outline"
        />
      </View>

      <Pressable
        onPress={() => router.push('/request-access')}
        style={styles.requestAccess}
        accessibilityRole="button"
      >
        <Text style={styles.requestAccessText}>Need an owner account? Request access</Text>
      </Pressable>

      <Text style={styles.footer}>Secure admin & employee access — Skillrout</Text>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      backgroundColor: colors.background,
    },
    logo: {
      width: spacing.xxl,
      height: spacing.xxl,
      borderRadius: radii.xl,
    },
    tagline: {
      fontSize: fontSizes.caption,
      color: colors.primary,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: letterSpacings.wide,
    },
    title: {
      fontSize: fontSizes.display,
      color: colors.textPrimary,
      fontWeight: '800',
      letterSpacing: letterSpacings.wide,
    },
    subtitle: {
      fontSize: fontSizes.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.lg,
      lineHeight: lineHeights.body,
    },
    actions: {
      width: '100%',
      maxWidth: 320,
      gap: spacing.sm,
    },
    requestAccess: {
      minHeight: 44,
      justifyContent: 'center',
      paddingVertical: spacing.sm,
      marginTop: spacing.md,
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
      marginTop: spacing.xl,
    },
    text: {
      fontSize: fontSizes.body,
      color: colors.textSecondary,
    },
  });
