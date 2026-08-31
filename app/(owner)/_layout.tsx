import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { type Colors, fontSizes, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';

export default function OwnerLayout() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { user, role, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || role !== 'owner')) router.replace('/owner');
  }, [user, role, loading, router]);

  if (loading || !user || role !== 'owner') return null;

  const handleSignOut = async () => {
    await signOut();
    router.replace('/owner');
  };

  return (
    <Tabs
      screenOptions={{
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerRight: () => (
          <Pressable accessibilityRole="button" onPress={handleSignOut} style={styles.logout}>
            <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarHideOnKeyboard: true,
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
      <Tabs.Screen
        name="pending-owners"
        options={{
          title: 'Approvals',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'person-add' : 'person-add-outline'} color={color} size={size} />
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
