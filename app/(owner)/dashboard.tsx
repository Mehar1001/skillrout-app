import { useRouter } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { type Colors, fontSizes, lineHeights, spacing } from '../../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';

export default function OwnerDashboard() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { user } = useAuth();
  const router = useRouter();

  const actions = [
    { title: 'Stores', body: 'Manage locations and default split.', route: '/stores' },
    { title: 'Machines', body: 'Add and onboard machines.', route: '/machines' },
    { title: 'Employees', body: 'Create employee accounts.', route: '/employees' },
    { title: 'History', body: 'Visits, settlements, reprints.', route: '/history' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Skillrout</Text>
        <Text style={styles.subtitle}>{user?.email}</Text>
      </View>

      <Card style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>Start a visit</Text>
          <Text style={styles.heroBody}>
            Select a store, enter machine readings, RUN, then print or submit.
          </Text>
        </View>
        <Button title="Start Visit" onPress={() => router.push('/select-store' as any)} variant="accent" />
      </Card>

      <Text style={styles.sectionTitle}>Manage</Text>
      <View style={styles.bento}>
        {actions.map(action => (
          <Card key={action.title} style={styles.bentoCard}>
            <Text style={styles.cardTitle}>{action.title}</Text>
            <Text style={styles.cardBody}>{action.body}</Text>
            <Button
              title="Open"
              onPress={() => router.push(action.route as any)}
              variant="primary"
            />
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    minHeight: '100%',
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSizes.display,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.xs,
    lineHeight: fontSizes.display,
  },
  subtitle: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
  },
  hero: {
    marginBottom: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  heroText: {
    flex: 1,
    minWidth: 220,
    marginRight: spacing.md,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    fontSize: fontSizes.h2,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  heroBody: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    lineHeight: lineHeights.body,
  },
  sectionTitle: {
    fontSize: fontSizes.h2,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  bento: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  bentoCard: {
    width: '48%',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: fontSizes.h3,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  cardBody: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: lineHeights.body,
  },
});
