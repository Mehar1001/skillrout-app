import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type Colors } from '@/constants/designTokens';

export const useColors = (): Colors => {
  const scheme = useColorScheme() ?? 'light';
  return (scheme === 'light' ? lightColors : darkColors) as Colors;
};
