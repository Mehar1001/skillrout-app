import { Stack, useRouter } from 'expo-router';
import * as Font from 'expo-font';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { DraftQueueProvider } from '../contexts/DraftQueueContext';

const ioniconsFont = require('../assets/fonts/ionicons.ttf');

const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes

function SessionManager() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const lastActivity = useRef(Date.now());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    lastActivity.current = Date.now();
  }, []);

  const checkInactivity = useCallback(async () => {
    if (!user) return;
    if (Date.now() - lastActivity.current >= INACTIVITY_LIMIT_MS) {
      await signOut();
      router.replace('/owner' as any);
    }
  }, [user, signOut, router]);

  useEffect(() => {
    resetTimer();
    const interval = setInterval(checkInactivity, 60000);
    return () => clearInterval(interval);
  }, [checkInactivity, resetTimer]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
      const handler = () => resetTimer();
      events.forEach(event => window.addEventListener(event, handler));
      return () => events.forEach(event => window.removeEventListener(event, handler));
    }
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        resetTimer();
      }
    });
    const id = setInterval(checkInactivity, 60000);
    return () => {
      subscription.remove();
      clearInterval(id);
    };
  }, [resetTimer, checkInactivity]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!user) return;
    lastActivity.current = Date.now();
    timer.current = setTimeout(async () => {
      await signOut();
      router.replace('/owner' as any);
    }, INACTIVITY_LIMIT_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [user, signOut, router]);

  return null;
}

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
        <SessionManager />
        <DraftQueueProvider>
          <Stack key={fontKey} screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ title: 'Skillrout' }} />
            <Stack.Screen name="owner" options={{ title: 'Skillrout Sign In' }} />
            <Stack.Screen name="request-access" options={{ title: 'Request Access' }} />
            <Stack.Screen name="employee-signin" options={{ title: 'Employee Sign In' }} />
            <Stack.Screen name="(owner)" />
            <Stack.Screen name="(employee)" />
          </Stack>
        </DraftQueueProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
