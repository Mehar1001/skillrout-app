import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AuthProvider } from '../contexts/AuthContext';
import { DraftQueueProvider } from '../contexts/DraftQueueContext';
import { useColors } from '../hooks/useColors';

export default function RootLayout() {
  const [loaded] = useFonts({ ionicons: (Ionicons as any).font });
  const colors = useColors();

  if (!loaded) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textPrimary }]}>Skillrout</Text>
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <DraftQueueProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ title: 'Skillrout' }} />
            <Stack.Screen name="owner" options={{ title: 'Skillrout Sign In' }} />
            <Stack.Screen name="(owner)" />
            <Stack.Screen name="(employee)" />
          </Stack>
        </DraftQueueProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 34,
    fontWeight: '700',
  },
  spinner: {
    marginTop: 8,
  },
});
