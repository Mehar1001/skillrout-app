import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fontSizes, radii, spacing } from '@/constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { BrandMark } from './BrandMark';

export interface AppSidebarItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon?: keyof typeof Ionicons.glyphMap;
}

interface AppSidebarProps {
  items: AppSidebarItem[];
  activeKey: string;
  collapsed: boolean;
  onToggle: () => void;
  onNavigate: (key: string) => void;
  onLogout: () => void;
}

export const AppSidebar = ({
  items,
  activeKey,
  collapsed,
  onToggle,
  onNavigate,
  onLogout,
}: AppSidebarProps) => {
  const colors = useColors();
  const styles = makeStyles(colors);

  return (
    <View style={[styles.sidebar, { width: collapsed ? 76 : 220 }]}>
      <View style={styles.brandRow}>
        <BrandMark size={44} />
        {!collapsed && (
          <View>
            <Text style={styles.brandEyebrow}>BOOKKEEPING BY</Text>
            <Text style={styles.brandName}>Skillrout</Text>
          </View>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        onPress={onToggle}
        style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
      >
        <Ionicons name={collapsed ? 'chevron-forward' : 'chevron-back'} size={20} color={colors.primary} />
        {!collapsed && <Text style={styles.toggleText}>Collapse</Text>}
      </Pressable>

      <View style={styles.navigation}>
        {items.map(item => {
          const active = item.key === activeKey;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              onPress={() => onNavigate(item.key)}
              style={({ pressed }) => [
                styles.item,
                active && styles.itemActive,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={active ? item.activeIcon ?? item.icon : item.icon}
                size={22}
                color={active ? colors.primary : colors.textSecondary}
              />
              {!collapsed && <Text style={[styles.itemLabel, active && styles.itemLabelActive]}>{item.label}</Text>}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log out"
        onPress={onLogout}
        style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
      >
        <Ionicons name="log-out-outline" size={22} color={colors.error} />
        {!collapsed && <Text style={styles.logoutText}>Log out</Text>}
      </Pressable>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    sidebar: {
      height: '100%',
      backgroundColor: colors.surface,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.lg,
    },
    brandRow: {
      minHeight: 55,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      marginBottom: spacing.md,
      overflow: 'hidden',
    },
    brandEyebrow: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    brandName: {
      color: colors.textPrimary,
      fontSize: fontSizes.h3,
      fontWeight: '800',
    },
    toggle: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
      marginBottom: spacing.md,
    },
    toggleText: {
      color: colors.primary,
      fontSize: fontSizes.caption,
      fontWeight: '700',
    },
    navigation: {
      gap: spacing.xs,
    },
    item: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
      borderLeftWidth: 3,
      borderLeftColor: 'transparent',
      overflow: 'hidden',
    },
    itemActive: {
      backgroundColor: colors.primarySubtle,
      borderLeftColor: colors.accent,
    },
    itemLabel: {
      color: colors.textSecondary,
      fontSize: fontSizes.body,
      fontWeight: '600',
    },
    itemLabelActive: {
      color: colors.textPrimary,
      fontWeight: '800',
    },
    logout: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
      marginTop: 'auto',
      overflow: 'hidden',
    },
    logoutText: {
      color: colors.error,
      fontSize: fontSizes.body,
      fontWeight: '700',
    },
    pressed: {
      opacity: 0.7,
    },
  });
