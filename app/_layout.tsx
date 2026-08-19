import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ title: 'Skillrout' }} />
        <Stack.Screen name="owner" options={{ title: 'Skillrout Sign In' }} />
        <Stack.Screen name="(owner)" />
        <Stack.Screen name="(employee)" />
      </Stack>
    </AuthProvider>
  );
}
