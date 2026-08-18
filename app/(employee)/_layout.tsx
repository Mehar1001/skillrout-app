import { Stack } from 'expo-router';

export default function EmployeeLayout() {
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
