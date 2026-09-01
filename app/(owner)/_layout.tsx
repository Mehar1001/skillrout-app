import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { type Colors, fontSizes, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';

export default function OwnerLayout() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { user, role, loading, signOut } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && (!user || role !== 'owner')) router.replace('/');
  }, [user, role, loading, router]);

  if (loading || !user || role !== 'owner') return null;

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  return (
    <Tabs
      screenOptions={{
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerLeft: isDesktop
          ? () => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
                onPress={() => setSidebarCollapsed(value => !value)}
                style={styles.sidebarToggle}
              >
                <Ionicons
                  name={sidebarCollapsed ? 'chevron-forward' : 'chevron-back'}
                  size={22}
                  color={colors.primary}
                />
              </Pressable>
            )
          : undefined,
        headerRight: () => (
          <Pressable accessibilityRole="button" onPress={handleSignOut} style={styles.logout}>
            <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarHideOnKeyboard: true,
        tabBarPosition: isDesktop ? 'left' : 'bottom',
        tabBarShowLabel: !isDesktop || !sidebarCollapsed,
        tabBarStyle: [
          styles.tabBar,
          isDesktop && styles.sidebar,
          isDesktop && { width: sidebarCollapsed ? 76 : 220 },
        ],
        tabBarItemStyle: isDesktop ? styles.sidebarItem : undefined,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIconStyle: styles.tabIcon,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="stores"
        options={{
          title: 'Stores',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'storefront' : 'storefront-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="machines"
        options={{
          title: 'Machines',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'hardware-chip' : 'hardware-chip-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="employees"
        options={{
          title: 'Employees',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'time' : 'time-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'document-text' : 'document-text-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} color={color} size={size} />
          ),
        }}
      />
    </Tabs>
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
  sidebarToggle: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  logout: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  logoutText: {
    color: colors.textPrimary,
    fontSize: fontSizes.body,
    fontWeight: '600',
  },
  tabBar: {
    minHeight: 70,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  sidebar: {
    minHeight: '100%',
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderTopWidth: 0,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  sidebarItem: {
    minHeight: 54,
  },
  tabLabel: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    marginTop: 2,
  },
  tabIcon: {
    marginTop: spacing.xs,
  },
});
