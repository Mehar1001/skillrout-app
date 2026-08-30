import { Redirect } from 'expo-router';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { type Colors, fontSizes, radii, spacing } from '../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../contexts/AuthContext';

export default function IndexScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { user, role, mustChangePassword, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.container}>
        <Image
          source={require('../assets/images/skillrout-icon.png')}
          style={styles.logo}
          accessibilityLabel="Skillrout"
        />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.text}>Loading Skillrout…</Text>
      </View>
    );
  }

  if (!user || !role) return <Redirect href="/owner" />;
  return <Redirect href={role === 'owner' ? '/dashboard' : mustChangePassword ? '/change-password' as any : '/select-store'} />;
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  logo: {
    width: spacing.xxl,
    height: spacing.xxl,
    borderRadius: radii.xl,
  },
  text: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
  },
});
