import React from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

interface BrandMarkProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export const BrandMark = ({ size = 55, style }: BrandMarkProps) => (
  <Image
    source={require('../assets/images/skillrout-icon-green.png')}
    style={[{ width: size, height: size, resizeMode: 'contain' }, style]}
    accessibilityLabel="Skillrout"
  />
);
