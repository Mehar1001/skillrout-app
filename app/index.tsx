import { Redirect } from 'expo-router';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, spacing } from '../constants/designTokens';
import { useAuth } from '../contexts/AuthContext';

export default function IndexScreen() {
  const { user, role, loading } = useAuth();

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
  return <Redirect href={role === 'owner' ? '/dashboard' : '/select-store'} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  logo: {
    width: 89,
    height: 89,
    borderRadius: 21,
  },
  text: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
  },
});
