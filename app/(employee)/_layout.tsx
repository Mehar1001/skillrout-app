import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fontSizes, spacing } from '../../constants/designTokens';
import { useAuth } from '../../contexts/AuthContext';

export default function EmployeeLayout() {
  const { user, role, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !role)) router.replace('/owner');
  }, [user, role, loading, router]);

  if (loading || !user || !role) return null;

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
        headerRight: () => (
          <Pressable accessibilityRole="button" onPress={handleSignOut} style={styles.logout}>
            <Ionicons name="log-out-outline" size={20} color={colors.accentDark} />
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        ),
      }}
    >
      <Stack.Screen name="select-store" options={{ title: 'Select Store', headerBackVisible: false }} />
      <Stack.Screen name="visit" options={{ title: 'Run Visit' }} />
      <Stack.Screen name="results" options={{ title: 'Results' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.background,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  logout: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  logoutText: {
    color: colors.accentDark,
    fontSize: fontSizes.caption,
    fontWeight: '600',
  },
});
