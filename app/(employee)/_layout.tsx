import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AppSidebar, type AppSidebarItem } from '../../components/AppSidebar';
import { type Colors, fontSizes, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';

const employeeNavigation: AppSidebarItem[] = [
  { key: 'select-store', label: 'Stores', icon: 'storefront-outline', activeIcon: 'storefront' },
  { key: 'activity', label: 'Activity', icon: 'pulse-outline', activeIcon: 'pulse' },
  { key: 'drafts', label: 'Drafts', icon: 'document-outline', activeIcon: 'document' },
  { key: 'employee-history', label: 'History', icon: 'time-outline', activeIcon: 'time' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline', activeIcon: 'settings' },
];

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

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/select-store');
  };

  const currentRoute = segments[segments.length - 1] ?? 'select-store';

  return (
    <View style={styles.shell}>
      {isDesktop && (
        <AppSidebar
          items={employeeNavigation}
          activeKey={currentRoute}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(value => !value)}
          onNavigate={key => router.push(`/${key}` as any)}
          onLogout={handleSignOut}
        />
      )}
      <View style={styles.content}>
        <Stack
          screenOptions={{
            headerStyle: styles.header,
            headerTitleStyle: styles.headerTitle,
            headerTintColor: colors.textPrimary,
            headerLeft: () => {
              const hideBack = currentRoute === 'select-store' || currentRoute === 'change-password';
              if (hideBack) return null;
              const isVisit = currentRoute === 'visit';
              return (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    onPress={handleBack}
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
                {!isDesktop && (
                  <Pressable accessibilityRole="button" onPress={handleSignOut} style={styles.logout}>
                    <Ionicons name="log-out-outline" size={20} color={colors.error} />
                    <Text style={styles.logoutText}>Log out</Text>
                  </Pressable>
                )}
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
          <Stack.Screen name="activity" options={{ title: 'Shift Activity' }} />
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
