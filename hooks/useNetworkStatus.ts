import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    let mounted = true;

    const update = (state: Network.NetworkState) => {
      if (!mounted) return;
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable));
    };

    const init = async () => {
      const state = await Network.getNetworkStateAsync();
      update(state);
      subscription = Network.addNetworkStateListener(update);
    };

    init();

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  return { isOnline };
}
