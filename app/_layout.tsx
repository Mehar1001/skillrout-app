import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AuthProvider } from '../contexts/AuthContext';
import { DraftQueueProvider } from '../contexts/DraftQueueContext';

export default function RootLayout() {
  const [fontsLoaded] = useFonts(Ionicons.font);

  if (!fontsLoaded) {
    return null;
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
