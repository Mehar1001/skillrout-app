import { useRouter, Stack } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function OwnerLayout() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || role !== 'owner')) {
      router.replace('/owner');
    }
  }, [user, role, loading, router]);

  if (loading || !user || role !== 'owner') {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: true, headerStyle: { backgroundColor: '#F7F4F0' } }}>
      <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Stack.Screen name="stores" options={{ title: 'Stores' }} />
      <Stack.Screen name="machines" options={{ title: 'Machines' }} />
      <Stack.Screen name="employees" options={{ title: 'Employees' }} />
      <Stack.Screen name="history" options={{ title: 'History' }} />
      <Stack.Screen name="reports" options={{ title: 'Reports' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}
