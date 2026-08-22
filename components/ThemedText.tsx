import { StyleSheet, Text, type TextProps } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { fontSizes, lineHeights } from '@/constants/designTokens';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({ style, type = 'default', ...rest }: ThemedTextProps) {
  const colors = useColors();

  return (
    <Text
      style={[
        { color: colors.textPrimary },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? [styles.title, { color: colors.accent }] : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? [styles.subtitle, { color: colors.textSecondary }] : undefined,
        type === 'link' ? [styles.link, { color: colors.info }] : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
  },
  defaultSemiBold: {
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
    fontWeight: '600',
  },
  title: {
    fontSize: fontSizes.h1,
    fontWeight: 'bold',
    lineHeight: lineHeights.h1,
  },
  subtitle: {
    fontSize: fontSizes.h2,
    fontWeight: 'bold',
    lineHeight: lineHeights.h2,
  },
  link: {
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
  },
});
