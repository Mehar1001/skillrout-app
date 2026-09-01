import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { type Colors, fontSizes, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';

export default function EmployeeLayout() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { user, role, employeeName, mustChangePassword, loading, signOut } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || role !== 'employee') {
      router.replace('/');
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
    router.replace('/');
  };

  const navigationItems = [
    { label: 'Stores', route: '/select-store', icon: 'storefront-outline' },
    { label: 'Drafts', route: '/drafts', icon: 'document-outline' },
    { label: 'History', route: '/employee-history', icon: 'time-outline' },
    { label: 'Settings', route: '/settings', icon: 'settings-outline' },
  ];

  return (
    <View style={styles.shell}>
      {isDesktop && (
        <View style={[styles.sidebar, { width: sidebarCollapsed ? 76 : 220 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            onPress={() => setSidebarCollapsed(value => !value)}
            style={styles.sidebarToggle}
          >
            <Ionicons name={sidebarCollapsed ? 'chevron-forward' : 'chevron-back'} size={22} color={colors.primary} />
          </Pressable>
          {navigationItems.map(item => (
            <Pressable
              key={item.route}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => router.push(item.route as any)}
              style={styles.sidebarItem}
            >
              <Ionicons name={item.icon as any} size={22} color={colors.primary} />
              {!sidebarCollapsed && <Text style={styles.sidebarLabel}>{item.label}</Text>}
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" onPress={handleSignOut} style={styles.sidebarLogout}>
            <Ionicons name="log-out-outline" size={22} color={colors.error} />
            {!sidebarCollapsed && <Text style={styles.sidebarLogoutText}>Log out</Text>}
          </Pressable>
        </View>
      )}
      <View style={styles.content}>
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
          <View style={styles.headerRight}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/settings' as any)}
              style={styles.navIcon}
              accessibilityLabel="Settings"
            >
              <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
            </Pressable>
            {employeeName ? (
              <View style={styles.profile}>
                <Text style={styles.profileName}>{employeeName}</Text>
              </View>
            ) : null}
            <Pressable accessibilityRole="button" onPress={handleSignOut} style={styles.logout}>
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
              <Text style={styles.logoutText}>Log out</Text>
            </Pressable>
          </View>
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
          <Stack.Screen name="settings" options={{ title: 'Profile & Settings' }} />
        </Stack>
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  sidebar: {
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.lg,
  },
  sidebarToggle: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  sidebarItem: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  sidebarLabel: {
    color: colors.textPrimary,
    fontSize: fontSizes.body,
    fontWeight: '600',
  },
  sidebarLogout: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: 'auto',
  },
  sidebarLogoutText: {
    color: colors.error,
    fontSize: fontSizes.body,
    fontWeight: '700',
  },
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  profile: {
    paddingHorizontal: spacing.sm,
  },
  profileName: {
    color: colors.textPrimary,
    fontSize: fontSizes.caption,
    fontWeight: '600',
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
