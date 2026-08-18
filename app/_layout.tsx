import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="owner" options={{ title: 'Owner Login' }} />
        <Stack.Screen name="index" options={{ title: 'Home' }} />
        <Stack.Screen name="(owner)" options={{ headerShown: false }} />
        <Stack.Screen name="(employee)" options={{ headerShown: false }} />
        <Stack.Screen
          name="customerinfo"
          options={{ headerShown: true, title: 'Customer Info' }}
        />
        <Stack.Screen
          name="visithistory"
          options={{ headerShown: true, title: "Today's Visits" }}
        />
        <Stack.Screen
          name="employeeshift"
          options={{ headerShown: true, title: 'Employee Shift' }}
        />
        <Stack.Screen
          name="machinetracker"
          options={{ headerShown: true, title: 'Shift History' }}
        />
        <Stack.Screen
          name="profitloss"
          options={{ headerShown: true, title: 'Profit & Loss' }}
        />
        <Stack.Screen
          name="bulksms"
          options={{
            headerShown: true,
            title: 'Send Bulk Message',
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
