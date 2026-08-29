import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { type Colors, fontSizes, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';

export default function EmployeeLayout() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { user, role, mustChangePassword, loading, signOut } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    if (!user || role !== 'employee') {
      router.replace('/owner');
      return;
    }
    const currentRoute = segments[segments.length - 1];
    if (role === 'employee' && mustChangePassword && currentRoute !== 'change-password') {
      router.replace('/change-password' as any);
    }
  }, [user, role, mustChangePassword, loading, router, segments]);

  if (loading || !user || role !== 'employee') return null;

  const handleSignOut = async () => {
    await signOut();
    router.replace('/owner');
  };

  return (
    <Stack
      screenOptions={{
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerTintColor: colors.textPrimary,
        headerLeft: () => {
          const currentRoute = segments[segments.length - 1];
          const hideBack = currentRoute === 'select-store' || currentRoute === 'change-password';
          if (hideBack) return null;
          const isVisit = currentRoute === 'visit';
          return (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={() => router.back()}
                style={styles.navIcon}
                hitSlop={spacing.xs}
              >
                <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
              </Pressable>
              {isVisit && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Stores"
                  onPress={() => router.replace('/select-store')}
                  style={styles.navIcon}
                  hitSlop={spacing.xs}
                >
                  <Ionicons name="storefront-outline" size={22} color={colors.textPrimary} />
                </Pressable>
              )}
            </>
          );
        },
        headerRight: () => (
          <Pressable accessibilityRole="button" onPress={handleSignOut} style={styles.logout}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        ),
      }}
    >
      <Stack.Screen name="change-password" options={{ title: 'Secure Your Account', headerBackVisible: false }} />
      <Stack.Screen name="onboard-store" options={{ title: 'Onboard Store' }} />
      <Stack.Screen name="select-store" options={{ title: 'Select Store', headerBackVisible: false }} />
      <Stack.Screen name="drafts" options={{ title: 'Offline Drafts' }} />
      <Stack.Screen name="visit" options={{ title: 'Enter Readings' }} />
      <Stack.Screen name="results" options={{ title: 'Comparison' }} />
      <Stack.Screen name="calculation" options={{ title: 'Calculation' }} />
      <Stack.Screen name="settlement" options={{ title: 'Settlement Split' }} />
      <Stack.Screen name="outcome" options={{ title: 'Outcome' }} />
      <Stack.Screen name="receipt" options={{ title: 'Receipt Preview' }} />
      <Stack.Screen name="employee-history" options={{ title: 'History' }} />
    </Stack>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  header: {
    backgroundColor: colors.background,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  navIcon: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logout: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  logoutText: {
    color: colors.error,
    fontSize: fontSizes.caption,
    fontWeight: '600',
  },
});
