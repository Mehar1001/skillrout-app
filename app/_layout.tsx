import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AuthProvider } from '../contexts/AuthContext';
import { DraftQueueProvider } from '../contexts/DraftQueueContext';

// Load the Ionicons font on web and force a remount once it's available
// so the glyph Text nodes re-render with the loaded font.
export default function RootLayout() {
  const [fontKey, setFontKey] = useState(0);

  useEffect(() => {
    (Ionicons as any)
      .loadFont()
      .then(() => setFontKey(k => k + 1))
      .catch(() => {});
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <DraftQueueProvider>
          <Stack key={fontKey} screenOptions={{ headerShown: false }}>
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
