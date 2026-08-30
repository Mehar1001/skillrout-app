import { Stack } from 'expo-router';
import * as Font from 'expo-font';
import { useEffect, useState } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AuthProvider } from '../contexts/AuthContext';
import { DraftQueueProvider } from '../contexts/DraftQueueContext';

const ioniconsFont = require('../assets/fonts/ionicons.ttf');

// Load the Ionicons font explicitly from a bundled asset, then force a remount
// of the root Stack so all glyph Text nodes render with the loaded font.
export default function RootLayout() {
  const [fontKey, setFontKey] = useState(0);

  useEffect(() => {
    Font.loadAsync({ ionicons: ioniconsFont })
      .then(() => setFontKey(k => k + 1))
      .catch(() => setFontKey(k => k + 1));
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
