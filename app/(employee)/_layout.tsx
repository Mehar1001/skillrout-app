import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function EmployeeLayout() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !role)) {
      router.replace('/owner');
    }
  }, [user, role, loading, router]);

  if (loading || !user || !role) return null;

  return (
    <Stack screenOptions={{ headerShown: true, headerStyle: { backgroundColor: '#F7F4F0' } }}>
      <Stack.Screen name="select-store" options={{ title: 'Select Store' }} />
      <Stack.Screen name="visit" options={{ title: 'Run Visit' }} />
      <Stack.Screen name="results" options={{ title: 'Results' }} />
      <Stack.Screen name="receipt" options={{ title: 'Receipt' }} />
      <Stack.Screen name="history" options={{ title: 'History' }} />
    </Stack>
  );
}
