import React, { Component, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { type Colors, fontSizes, spacing } from '../constants/designTokens';
import { useColors } from '@/hooks/useColors';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundaryClass extends Component<Props & { colors: Colors }, State> {
  constructor(props: Props & { colors: Colors }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // In production this should be sent to a crash reporter, never to console logs with PII.
    console.error('Skillrout error boundary caught an error:', error, errorInfo);
  }

  private handleReload = () => {
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    } else {
      this.setState({ hasError: false, error: undefined });
    }
  };

  render() {
    if (this.state.hasError) {
      const { colors } = this.props;
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Something went wrong</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            We have logged the issue. Restart the app to continue working safely.
          </Text>
          <Button title="Reload Skillrout" onPress={this.handleReload} variant="primary" />
        </View>
      );
    }
    return this.props.children;
  }
}

export function ErrorBoundary({ children }: Props) {
  const colors = useColors();
  return <ErrorBoundaryClass colors={colors}>{children}</ErrorBoundaryClass>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSizes.h1,
    fontWeight: '700',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  body: {
    fontSize: fontSizes.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
});
