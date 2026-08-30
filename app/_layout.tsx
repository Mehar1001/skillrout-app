import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AuthProvider } from '../contexts/AuthContext';
import { DraftQueueProvider } from '../contexts/DraftQueueContext';

// Load the Ionicons icon font on web so glyphs render instead of blank boxes.
export default function RootLayout() {
  useEffect(() => {
    (Ionicons as any).loadFont().catch(() => {});
  }, []);

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
