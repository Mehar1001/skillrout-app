import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { Tabs, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { AppSidebar, type AppSidebarItem } from '../../components/AppSidebar';
import { type Colors, fontSizes, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';

const ownerNavigation: AppSidebarItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid-outline', activeIcon: 'grid' },
  { key: 'stores', label: 'Stores', icon: 'storefront-outline', activeIcon: 'storefront' },
  { key: 'machines', label: 'Machines', icon: 'hardware-chip-outline', activeIcon: 'hardware-chip' },
  { key: 'employees', label: 'Employees', icon: 'people-outline', activeIcon: 'people' },
  { key: 'history', label: 'History', icon: 'time-outline', activeIcon: 'time' },
  { key: 'reports', label: 'Reports and Adjustments', icon: 'document-text-outline', activeIcon: 'document-text' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline', activeIcon: 'settings' },
];

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
      tabBar={props =>
        isDesktop ? (
          <AppSidebar
            items={ownerNavigation}
            activeKey={props.state.routes[props.state.index]?.name ?? 'dashboard'}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(value => !value)}
            onNavigate={key => (props.navigation as any).navigate(key)}
            onLogout={handleSignOut}
          />
        ) : (
          <BottomTabBar {...props} />
        )
      }
      screenOptions={{
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerRight: isDesktop
          ? undefined
          : () => (
              <Pressable accessibilityRole="button" onPress={handleSignOut} style={styles.logout}>
                <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
                <Text style={styles.logoutText}>Log out</Text>
              </Pressable>
            ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarHideOnKeyboard: true,
        tabBarPosition: isDesktop ? 'left' : 'bottom',
        tabBarStyle: styles.tabBar,
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
          title: 'Reports and Adjustments',
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
  tabLabel: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    marginTop: 2,
  },
  tabIcon: {
    marginTop: spacing.xs,
  },
});
