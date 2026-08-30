import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { type Colors, fontSizes, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';

export default function OwnerLayout() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { user, role, loading, signOut } = useAuth();
  const router = useRouter();
  const [fontKey, setFontKey] = useState(0);

  useEffect(() => {
    (Ionicons as any)
      .loadFont()
      .then(() => setFontKey(k => k + 1))
      .catch(() => {});
  }, []);

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
      key={fontKey}
      screenOptions={{
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerRight: () => (
          <Pressable accessibilityRole="button" onPress={handleSignOut} style={styles.logout}>
            <Ionicons name="log-out-outline" size={20} color={colors.accent} />
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        ),
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.primary,
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
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="stores"
        options={{
          title: 'Stores',
          tabBarIcon: ({ color, size }) => <Ionicons name="storefront-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="machines"
        options={{
          title: 'Machines',
          tabBarIcon: ({ color, size }) => <Ionicons name="hardware-chip-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="employees"
        options={{
          title: 'Employees',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" color={color} size={size} />,
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
    color: colors.accent,
    fontSize: fontSizes.body,
    fontWeight: '600',
  },
  tabBar: {
    minHeight: 70,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  tabLabel: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    marginTop: 2,
  },
  tabIcon: {
    marginTop: spacing.xs,
  },
});
