import { Ionicons } from '@expo/vector-icons';
import { Link, Redirect } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { BrandMark } from '../components/BrandMark';
import { Card } from '../components/Card';
import { type Colors, fontSizes, letterSpacings, lineHeights, radii, spacing } from '../constants/designTokens';
import { useAuth } from '../contexts/AuthContext';
import { useColors } from '@/hooks/useColors';

type SectionKey = 'how' | 'features' | 'security' | 'roles';

const workflowSteps = [
  { title: 'Select store', body: 'Open an assigned location.', icon: 'storefront-outline' },
  { title: 'Scan or enter', body: 'Capture each machine reading.', icon: 'scan-outline' },
  { title: 'Review', body: 'Confirm readings and calculations.', icon: 'checkmark-circle-outline' },
  { title: 'Submit', body: 'Advance an eligible settlement.', icon: 'paper-plane-outline' },
  { title: 'History', body: 'Keep every visit permanently traceable.', icon: 'time-outline' },
] as const;

const features = [
  {
    title: 'OCR-assisted scanning',
    body: 'Capture meter readings with the camera, review the result, and stay in control before anything is accepted.',
    icon: 'scan-outline',
    large: true,
    badge: 'Coming soon',
  },
  {
    title: 'Smart calculations',
    body: 'Automatically compare current readings with the last settled baseline.',
    icon: 'calculator-outline',
  },
  {
    title: 'Visit history',
    body: 'Know who visited, when it happened, and exactly what was recorded.',
    icon: 'time-outline',
  },
  {
    title: 'Reports & insights',
    body: 'See settlement totals, pending work, activity, trends, and exceptions.',
    icon: 'bar-chart-outline',
    large: true,
  },
  {
    title: 'Receipt-ready records',
    body: 'Generate clear thermal receipts from the permanent visit snapshot.',
    icon: 'receipt-outline',
  },
  {
    title: 'Photos & evidence',
    body: 'Attach machine evidence directly to the relevant visit.',
    icon: 'camera-outline',
  },
] as const;

const RouteButton = ({
  href,
  label,
  variant = 'primary',
  icon,
}: {
  href: '/owner/login' | '/employee/login' | '/owner/register';
  label: string;
  variant?: 'primary' | 'secondary';
  icon?: keyof typeof Ionicons.glyphMap;
}) => {
  const colors = useColors();
  const primary = variant === 'primary';
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        style={({ pressed }) => [
          styles.routeButton,
          {
            backgroundColor: primary ? colors.primary : colors.surface,
            borderColor: primary ? colors.primary : colors.border,
            opacity: pressed ? 0.78 : 1,
          },
        ]}
      >
        <Text style={[styles.routeButtonText, { color: primary ? colors.textOnPrimary : colors.textPrimary }]}>
          {label}
        </Text>
        {icon && <Ionicons name={icon} size={18} color={primary ? colors.textOnPrimary : colors.primary} />}
      </Pressable>
    </Link>
  );
};

const LivePreview = ({ colors }: { colors: Colors }) => (
  <View style={[styles.previewShell, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.previewTop}>
      <View>
        <Text style={[styles.previewEyebrow, { color: colors.textMuted }]}>LIVE STORE VISIT</Text>
        <Text style={[styles.previewStore, { color: colors.textPrimary }]}>ABC Market</Text>
      </View>
      <View style={[styles.liveBadge, { backgroundColor: colors.primarySubtle }]}>
        <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
        <Text style={[styles.liveText, { color: colors.primary }]}>Live preview</Text>
      </View>
    </View>

    <View style={[styles.scanPanel, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={[styles.scanIcon, { backgroundColor: colors.primary }]}>
        <Ionicons name="scan" size={28} color={colors.textOnPrimary} />
      </View>
      <View style={styles.scanCopy}>
        <Text style={[styles.scanTitle, { color: colors.textPrimary }]}>Machine 12 scanned</Text>
        <Text style={[styles.scanBody, { color: colors.textSecondary }]}>Readings recognized and ready to review</Text>
      </View>
      <Ionicons name="checkmark-circle" size={24} color={colors.success} />
    </View>

    <View style={styles.readingGrid}>
      <View style={[styles.readingCard, { backgroundColor: colors.surfaceSecondary }]}>
        <Text style={[styles.readingLabel, { color: colors.textMuted }]}>LAST SETTLED IN</Text>
        <Text style={[styles.readingValue, { color: colors.textPrimary }]}>10,000</Text>
      </View>
      <View style={[styles.readingCard, { backgroundColor: colors.primarySubtle }]}>
        <Text style={[styles.readingLabel, { color: colors.textMuted }]}>PRESENT IN</Text>
        <Text style={[styles.readingValue, { color: colors.textPrimary }]}>10,850</Text>
      </View>
      <View style={[styles.readingCard, { backgroundColor: colors.surfaceSecondary }]}>
        <Text style={[styles.readingLabel, { color: colors.textMuted }]}>LAST SETTLED OUT</Text>
        <Text style={[styles.readingValue, { color: colors.textPrimary }]}>7,500</Text>
      </View>
      <View style={[styles.readingCard, { backgroundColor: colors.primarySubtle }]}>
        <Text style={[styles.readingLabel, { color: colors.textMuted }]}>PRESENT OUT</Text>
        <Text style={[styles.readingValue, { color: colors.textPrimary }]}>8,100</Text>
      </View>
    </View>

    <View style={[styles.calculation, { borderTopColor: colors.border }]}>
      <View>
        <Text style={[styles.calculationLabel, { color: colors.textMuted }]}>AUTOMATIC CALCULATION</Text>
        <Text style={[styles.calculationFormula, { color: colors.textSecondary }]}>New IN 850 − New OUT 600</Text>
      </View>
      <Text style={[styles.netValue, { color: colors.accent }]}>+$250</Text>
    </View>

    <View style={[styles.readyBar, { backgroundColor: colors.primary }]}>
      <Ionicons name="shield-checkmark" size={20} color={colors.textOnPrimary} />
      <Text style={[styles.readyText, { color: colors.textOnPrimary }]}>Settlement ready for review</Text>
    </View>
  </View>
);

export default function IndexScreen() {
  const colors = useColors();
  const { user, role, loading } = useAuth();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Partial<Record<SectionKey, number>>>({});
  const [signInOpen, setSignInOpen] = useState(false);
  const isDesktop = width >= 900;

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <BrandMark size={55} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading Skillrout…</Text>
      </View>
    );
  }

  if (user && role) return <Redirect href={role === 'owner' ? '/dashboard' : '/select-store'} />;

  const scrollTo = (section: SectionKey) => {
    const y = sectionOffsets.current[section];
    if (typeof y === 'number') scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
  };

  const sectionLayout = (section: SectionKey) => (event: any) => {
    sectionOffsets.current[section] = event.nativeEvent.layout.y;
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.nav, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <View style={styles.brand}>
          <BrandMark size={44} />
          <View>
            <Text style={[styles.brandEyebrow, { color: colors.primary }]}>BOOKKEEPING BY</Text>
            <Text style={[styles.brandName, { color: colors.textPrimary }]}>Skillrout</Text>
          </View>
        </View>

        {isDesktop && (
          <View style={styles.navLinks}>
            <Pressable onPress={() => scrollTo('features')} style={styles.navLink} accessibilityRole="button">
              <Text style={[styles.navLinkText, { color: colors.textSecondary }]}>Features</Text>
            </Pressable>
            <Pressable onPress={() => scrollTo('how')} style={styles.navLink} accessibilityRole="button">
              <Text style={[styles.navLinkText, { color: colors.textSecondary }]}>How It Works</Text>
            </Pressable>
            <Pressable onPress={() => scrollTo('security')} style={styles.navLink} accessibilityRole="button">
              <Text style={[styles.navLinkText, { color: colors.textSecondary }]}>Security</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.navActions}>
          <View style={styles.signInMenu}>
            <Pressable
              onPress={() => setSignInOpen(value => !value)}
              style={styles.signInTrigger}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              accessibilityState={{ expanded: signInOpen }}
            >
              <Text style={[styles.signInText, { color: colors.textPrimary }]}>Sign In</Text>
              <Ionicons name={signInOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textPrimary} />
            </Pressable>
            {signInOpen && (
              <View style={[styles.signInDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Link href="/owner/login" asChild>
                  <Pressable onPress={() => setSignInOpen(false)} style={styles.signInOption} accessibilityRole="link">
                    <Ionicons name="briefcase-outline" size={19} color={colors.primary} />
                    <View>
                      <Text style={[styles.signInOptionTitle, { color: colors.textPrimary }]}>Owner Sign In</Text>
                      <Text style={[styles.signInOptionBody, { color: colors.textMuted }]}>Manage your business</Text>
                    </View>
                  </Pressable>
                </Link>
                <Link href="/employee/login" asChild>
                  <Pressable onPress={() => setSignInOpen(false)} style={styles.signInOption} accessibilityRole="link">
                    <Ionicons name="people-outline" size={19} color={colors.primary} />
                    <View>
                      <Text style={[styles.signInOptionTitle, { color: colors.textPrimary }]}>Employee Sign In</Text>
                      <Text style={[styles.signInOptionBody, { color: colors.textMuted }]}>Complete store visits</Text>
                    </View>
                  </Pressable>
                </Link>
              </View>
            )}
          </View>
          <Link
            href="/owner/register"
            style={[styles.topCta, { backgroundColor: colors.accent, color: colors.textOnAccent }]}
            accessibilityRole="link"
          >
            {isDesktop ? 'Get Started  →' : 'Start  →'}
          </Link>
        </View>
      </View>

      <View style={[styles.hero, { flexDirection: isDesktop ? 'row' : 'column' }]}>
        <View style={styles.heroCopy}>
          <View style={[styles.kicker, { backgroundColor: colors.primarySubtle }]}>
            <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
            <Text style={[styles.kickerText, { color: colors.primary }]}>A calmer way to run store visits</Text>
          </View>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
            Every Store Visit.{`\n`}Every Machine.{`\n`}
            <Text style={{ color: colors.accent }}>Every Settlement.</Text>{`\n`}Accounted for.
          </Text>
          <Text style={[styles.heroBody, { color: colors.textSecondary }]}>
            Replace spreadsheets, paper logs, and manual math with a clean operational system built for stores,
            machines, employees, and settlements.
          </Text>
          <View style={styles.heroActions}>
            <RouteButton href="/owner/register" label="Create Owner Account" icon="arrow-forward" />
            <Pressable onPress={() => scrollTo('how')} style={styles.textAction} accessibilityRole="button">
              <Text style={[styles.textActionLabel, { color: colors.textPrimary }]}>See how it works</Text>
              <Ionicons name="arrow-down" size={18} color={colors.primary} />
            </Pressable>
          </View>
          <View style={styles.trustRow}>
            {['Every visit recorded', 'Automatic calculations', 'Traceable history'].map(item => (
              <View key={item} style={styles.trustItem}>
                <Ionicons name="checkmark-circle" size={17} color={colors.success} />
                <Text style={[styles.trustText, { color: colors.textSecondary }]}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.heroPreview}>
          <LivePreview colors={colors} />
        </View>
      </View>

      <View style={[styles.proofBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.proofLead, { color: colors.textPrimary }]}>One system. One reliable record.</Text>
        {[
          { value: 'RUN', label: 'records the visit' },
          { value: 'PRINT', label: 'creates the report' },
          { value: 'SUBMIT', label: 'advances settlement' },
        ].map(item => (
          <View key={item.value} style={styles.proofItem}>
            <Text style={[styles.proofValue, { color: colors.accent }]}>{item.value}</Text>
            <Text style={[styles.proofLabel, { color: colors.textMuted }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section} onLayout={sectionLayout('how')}>
        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>HOW IT WORKS</Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>From store visit to permanent history.</Text>
          <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>
            A clear workflow guides employees while preserving the controls owners depend on.
          </Text>
        </View>
        <View style={styles.workflowSteps}>
          {workflowSteps.map((step, index) => (
            <View key={step.title} style={styles.workflowStep}>
              <View style={[styles.stepIcon, { backgroundColor: index === 1 ? colors.accentSubtle : colors.primarySubtle }]}>
                <Ionicons name={step.icon} size={23} color={index === 1 ? colors.accent : colors.primary} />
              </View>
              <Text style={[styles.stepNumber, { color: colors.textMuted }]}>0{index + 1}</Text>
              <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>{step.title}</Text>
              <Text style={[styles.stepBody, { color: colors.textSecondary }]}>{step.body}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section} onLayout={sectionLayout('features')}>
        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>BUILT FOR REAL OPERATIONS</Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Powerful without feeling complicated.</Text>
          <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>
            The details your business needs, organized into one calm workspace.
          </Text>
        </View>
        <View style={styles.bentoGrid}>
          {features.map(feature => (
            <Card
              key={feature.title}
              style={[
                styles.featureCard,
                'large' in feature && feature.large && styles.featureCardLarge,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.featureTop}>
                <View style={[styles.featureIcon, { backgroundColor: colors.primarySubtle }]}>
                  <Ionicons name={feature.icon} size={25} color={colors.primary} />
                </View>
                {'badge' in feature && feature.badge && (
                  <View style={[styles.featureBadge, { backgroundColor: colors.accentSubtle }]}>
                    <Text style={[styles.featureBadgeText, { color: colors.accent }]}>{feature.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>{feature.title}</Text>
              <Text style={[styles.featureBody, { color: colors.textSecondary }]}>{feature.body}</Text>
            </Card>
          ))}
        </View>
      </View>

      <View
        style={[styles.securitySection, { backgroundColor: colors.primary, flexDirection: isDesktop ? 'row' : 'column' }]}
        onLayout={sectionLayout('security')}
      >
        <View style={styles.securityCopy}>
          <Text style={[styles.securityEyebrow, { color: colors.textOnPrimary }]}>SECURITY & CONTROL</Text>
          <Text style={[styles.securityTitle, { color: colors.textOnPrimary }]}>Trust the record, not the paperwork.</Text>
          <Text style={[styles.securityBody, { color: colors.textOnPrimary }]}>
            Role-based access, protected submissions, permanent snapshots, and controlled business rules keep your
            operational history accountable.
          </Text>
        </View>
        <View style={styles.securityChecks}>
          {[
            'Secure Firebase authentication',
            'Owner-controlled employee access',
            'Protected submitted settlements',
            'Timestamped activity and history',
            'Duplicate submission safeguards',
            'Photos tied to the relevant visit',
          ].map(item => (
            <View key={item} style={styles.securityCheck}>
              <View style={[styles.securityCheckIcon, { backgroundColor: colors.textOnPrimary }]}>
                <Ionicons name="checkmark" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.securityCheckText, { color: colors.textOnPrimary }]}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section} onLayout={sectionLayout('roles')}>
        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>CHOOSE YOUR ROLE</Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>The right workspace for the work you do.</Text>
        </View>
        <View style={[styles.roleGrid, { flexDirection: isDesktop ? 'row' : 'column' }]}>
          <Card style={[styles.ownerRole, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.roleIcon, { backgroundColor: colors.primarySubtle }]}>
              <Ionicons name="briefcase-outline" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.roleLabel, { color: colors.primary }]}>OWNER</Text>
            <Text style={[styles.roleTitle, { color: colors.textPrimary }]}>Run the operation.</Text>
            <Text style={[styles.roleBody, { color: colors.textSecondary }]}>
              Create stores and machines, provide employee access, review visits, manage settlements, and understand
              what is happening across the business.
            </Text>
            <View style={styles.roleActions}>
              <RouteButton href="/owner/register" label="Create Owner Account" icon="arrow-forward" />
              <RouteButton href="/owner/login" label="Owner Sign In" variant="secondary" />
            </View>
          </Card>
          <Card style={[styles.employeeRole, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <View style={[styles.roleIcon, { backgroundColor: colors.accentSubtle }]}>
              <Ionicons name="people-outline" size={28} color={colors.accent} />
            </View>
            <Text style={[styles.roleLabel, { color: colors.accent }]}>EMPLOYEE</Text>
            <Text style={[styles.roleTitle, { color: colors.textPrimary }]}>Complete store visits.</Text>
            <Text style={[styles.roleBody, { color: colors.textSecondary }]}>
              Select an assigned store, capture readings and photos, review calculations, print receipts, and submit
              eligible settlements.
            </Text>
            <Text style={[styles.roleNote, { color: colors.textMuted }]}>Employee access is provided by your business owner.</Text>
            <RouteButton href="/employee/login" label="Employee Sign In" variant="secondary" icon="arrow-forward" />
          </Card>
        </View>
      </View>

      <View style={[styles.finalCta, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <BrandMark size={55} />
        <Text style={[styles.finalTitle, { color: colors.textPrimary }]}>Every visit accounted for.</Text>
        <Text style={[styles.finalBody, { color: colors.textSecondary }]}>Start building a cleaner operational record today.</Text>
        <RouteButton href="/owner/register" label="Get Started" icon="arrow-forward" />
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={styles.brand}>
          <BrandMark size={36} />
          <Text style={[styles.footerBrand, { color: colors.textPrimary }]}>Skillrout</Text>
        </View>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>Bookkeeping built around real store operations.</Text>
        <View style={styles.footerLinks}>
          <Pressable onPress={() => scrollTo('features')} style={styles.footerLink} accessibilityRole="button">
            <Text style={[styles.footerLinkText, { color: colors.textSecondary }]}>Features</Text>
          </Pressable>
          <Pressable onPress={() => scrollTo('security')} style={styles.footerLink} accessibilityRole="button">
            <Text style={[styles.footerLinkText, { color: colors.textSecondary }]}>Security</Text>
          </Pressable>
          <Link href="/owner/login" asChild>
            <Pressable style={styles.footerLink} accessibilityRole="link">
              <Text style={[styles.footerLinkText, { color: colors.textSecondary }]}>Sign In</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSizes.body,
  },
  nav: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderBottomWidth: 1,
    zIndex: 1000,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: letterSpacings.wide,
  },
  brandName: {
    fontSize: fontSizes.h3,
    fontWeight: '800',
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  navLink: {
    minHeight: 44,
    justifyContent: 'center',
  },
  navLinkText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  topCta: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    fontSize: fontSizes.body,
    fontWeight: '800',
    textDecorationLine: 'none',
    flexShrink: 0,
  },
  signInMenu: {
    position: 'relative',
    zIndex: 1001,
  },
  signInTrigger: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  signInText: {
    fontSize: fontSizes.body,
    fontWeight: '700',
  },
  signInDropdown: {
    position: 'absolute',
    top: 48,
    right: 0,
    minWidth: 230,
    padding: spacing.xs,
    borderWidth: 1,
    borderRadius: radii.md,
    zIndex: 1002,
    elevation: 12,
  },
  signInOption: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
  signInOptionTitle: {
    fontSize: fontSizes.body,
    fontWeight: '700',
  },
  signInOptionBody: {
    fontSize: fontSizes.caption,
    marginTop: 2,
  },
  routeButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  routeButtonText: {
    fontSize: fontSizes.body,
    fontWeight: '700',
  },
  hero: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    alignItems: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  heroCopy: {
    flex: 1,
    minWidth: 280,
  },
  kicker: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    marginBottom: spacing.lg,
  },
  kickerText: {
    fontSize: fontSizes.caption,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: fontSizes.display,
    lineHeight: lineHeights.display,
    fontWeight: '800',
    letterSpacing: -1.2,
    marginBottom: spacing.lg,
  },
  heroBody: {
    maxWidth: 600,
    fontSize: fontSizes.h3,
    lineHeight: 25,
    marginBottom: spacing.lg,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  textAction: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  textActionLabel: {
    fontSize: fontSizes.body,
    fontWeight: '700',
  },
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trustText: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
  },
  heroPreview: {
    flex: 1,
    minWidth: 280,
    width: '100%',
    maxWidth: 540,
  },
  previewShell: {
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radii.xl,
    gap: spacing.md,
  },
  previewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  previewEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: letterSpacings.wide,
  },
  previewStore: {
    fontSize: fontSizes.h2,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: radii.pill,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
  },
  scanPanel: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  scanIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  scanCopy: {
    flex: 1,
  },
  scanTitle: {
    fontSize: fontSizes.body,
    fontWeight: '800',
  },
  scanBody: {
    fontSize: fontSizes.caption,
    marginTop: spacing.xs,
  },
  readingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  readingCard: {
    width: '48%',
    flexGrow: 1,
    minWidth: 140,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  readingLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  readingValue: {
    fontSize: fontSizes.h2,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  calculation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  calculationLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  calculationFormula: {
    fontSize: fontSizes.caption,
    marginTop: spacing.xs,
  },
  netValue: {
    fontSize: fontSizes.h1,
    fontWeight: '800',
  },
  readyBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
  },
  readyText: {
    fontSize: fontSizes.body,
    fontWeight: '700',
  },
  proofBar: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radii.lg,
  },
  proofLead: {
    fontSize: fontSizes.h3,
    fontWeight: '800',
  },
  proofItem: {
    alignItems: 'center',
  },
  proofValue: {
    fontSize: fontSizes.h3,
    fontWeight: '800',
  },
  proofLabel: {
    fontSize: fontSizes.caption,
    marginTop: spacing.xs,
  },
  section: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingTop: spacing.xxl + spacing.xl,
    paddingBottom: spacing.xxl,
  },
  sectionHeading: {
    maxWidth: 700,
    marginBottom: spacing.xl,
  },
  sectionEyebrow: {
    fontSize: fontSizes.caption,
    fontWeight: '800',
    letterSpacing: letterSpacings.uppercase,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSizes.h1,
    lineHeight: lineHeights.h1,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginBottom: spacing.md,
  },
  sectionBody: {
    fontSize: fontSizes.h3,
    lineHeight: 25,
  },
  workflowSteps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  workflowStep: {
    flex: 1,
    minWidth: 170,
    paddingRight: spacing.md,
  },
  stepIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  stepNumber: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: letterSpacings.wide,
    marginBottom: spacing.xs,
  },
  stepTitle: {
    fontSize: fontSizes.h3,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  stepBody: {
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  featureCard: {
    flex: 1,
    minWidth: 240,
    minHeight: 210,
    borderWidth: 1,
    justifyContent: 'flex-start',
  },
  featureCardLarge: {
    minWidth: 340,
    flexGrow: 2,
  },
  featureTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  featureIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  featureBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  featureBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  featureTitle: {
    fontSize: fontSizes.h2,
    fontWeight: '800',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  featureBody: {
    maxWidth: 430,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
  },
  securitySection: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    gap: spacing.xl,
    padding: spacing.xl,
    borderRadius: radii.xl,
    marginVertical: spacing.xl,
  },
  securityCopy: {
    flex: 1,
  },
  securityEyebrow: {
    fontSize: fontSizes.caption,
    fontWeight: '800',
    letterSpacing: letterSpacings.uppercase,
    opacity: 0.78,
    marginBottom: spacing.md,
  },
  securityTitle: {
    fontSize: fontSizes.h1,
    lineHeight: lineHeights.h1,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  securityBody: {
    fontSize: fontSizes.h3,
    lineHeight: 25,
    opacity: 0.88,
  },
  securityChecks: {
    flex: 1,
    gap: spacing.md,
  },
  securityCheck: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  securityCheckIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  securityCheckText: {
    flex: 1,
    fontSize: fontSizes.body,
    fontWeight: '700',
  },
  roleGrid: {
    gap: spacing.lg,
  },
  ownerRole: {
    flex: 1.2,
    borderWidth: 1,
    padding: spacing.xl,
  },
  employeeRole: {
    flex: 0.8,
    borderWidth: 1,
    padding: spacing.xl,
  },
  roleIcon: {
    width: 55,
    height: 55,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
  },
  roleLabel: {
    fontSize: fontSizes.caption,
    fontWeight: '800',
    letterSpacing: letterSpacings.uppercase,
    marginBottom: spacing.sm,
  },
  roleTitle: {
    fontSize: fontSizes.h1,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  roleBody: {
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
    marginBottom: spacing.lg,
  },
  roleNote: {
    fontSize: fontSizes.caption,
    marginBottom: spacing.md,
  },
  roleActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  finalCta: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderRadius: radii.xl,
    marginVertical: spacing.xxl,
  },
  finalTitle: {
    fontSize: fontSizes.h1,
    fontWeight: '800',
    textAlign: 'center',
  },
  finalBody: {
    fontSize: fontSizes.h3,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  footer: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    minHeight: 84,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: 1,
  },
  footerBrand: {
    fontSize: fontSizes.h3,
    fontWeight: '800',
  },
  footerText: {
    fontSize: fontSizes.caption,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  footerLink: {
    minHeight: 44,
    justifyContent: 'center',
  },
  footerLinkText: {
    fontSize: fontSizes.caption,
    fontWeight: '700',
  },
});
