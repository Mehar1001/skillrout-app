import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useState } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { type Colors, fontSizes, letterSpacings, lineHeights, radii, spacing } from '../constants/designTokens';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../contexts/AuthContext';

type SectionId =
  | 'about'
  | 'howItWorks'
  | 'features'
  | 'ocr'
  | 'accuracy'
  | 'insights'
  | 'security'
  | 'comingSoon';

interface Section {
  id: SectionId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const SECTIONS: Section[] = [
  { id: 'about', label: 'About', icon: 'information-circle-outline' },
  { id: 'howItWorks', label: 'How It Works', icon: 'list-outline' },
  { id: 'features', label: 'Features', icon: 'grid-outline' },
  { id: 'ocr', label: 'OCR Scanning', icon: 'camera-outline' },
  { id: 'accuracy', label: 'Accuracy & Controls', icon: 'shield-checkmark-outline' },
  { id: 'insights', label: 'Insights', icon: 'bar-chart-outline' },
  { id: 'security', label: 'Security', icon: 'lock-closed-outline' },
  { id: 'comingSoon', label: 'Coming Soon', icon: 'rocket-outline' },
];

const MiniWorkflow = ({ colors, styles }: { colors: Colors; styles: any }) => (
  <Card style={[styles.workflow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.workflowHeader}>
      <Ionicons name="storefront-outline" size={18} color={colors.primary} />
      <Text style={[styles.workflowTitle, { color: colors.textPrimary }]}>STORE VISIT</Text>
    </View>
    <Text style={[styles.workflowStore, { color: colors.textPrimary }]}>ABC Market</Text>

    <View style={styles.workflowRow}>
      <View style={styles.workflowHalf}>
        <Text style={[styles.workflowSub, { color: colors.textMuted }]}>Last Settled</Text>
        <View style={styles.workflowPair}>
          <Text style={[styles.workflowLabel, { color: colors.textSecondary }]}>IN</Text>
          <Text style={[styles.workflowValue, { color: colors.textPrimary }]}>10,000</Text>
        </View>
        <View style={styles.workflowPair}>
          <Text style={[styles.workflowLabel, { color: colors.textSecondary }]}>OUT</Text>
          <Text style={[styles.workflowValue, { color: colors.textPrimary }]}>7,500</Text>
        </View>
      </View>
      <View style={[styles.workflowHalf, { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: spacing.md }]}>
        <Text style={[styles.workflowSub, { color: colors.textMuted }]}>Present Reading</Text>
        <View style={styles.workflowPair}>
          <Text style={[styles.workflowLabel, { color: colors.textSecondary }]}>IN</Text>
          <Text style={[styles.workflowValue, { color: colors.textPrimary }]}>10,850</Text>
        </View>
        <View style={styles.workflowPair}>
          <Text style={[styles.workflowLabel, { color: colors.textSecondary }]}>OUT</Text>
          <Text style={[styles.workflowValue, { color: colors.textPrimary }]}>8,100</Text>
        </View>
      </View>
    </View>

    <View style={[styles.workflowDiff, { backgroundColor: colors.surfaceSecondary }]}>
      <Text style={[styles.workflowDiffTitle, { color: colors.textPrimary }]}>New Activity</Text>
      <View style={styles.workflowRow}>
        <View style={styles.workflowHalf}>
          <Text style={[styles.workflowDiffLabel, { color: colors.textSecondary }]}>New IN</Text>
          <Text style={[styles.workflowDiffValue, { color: colors.success }]}>+850</Text>
        </View>
        <View style={styles.workflowHalf}>
          <Text style={[styles.workflowDiffLabel, { color: colors.textSecondary }]}>New OUT</Text>
          <Text style={[styles.workflowDiffValue, { color: colors.success }]}>+600</Text>
        </View>
      </View>
      <View style={[styles.workflowNet, { borderTopColor: colors.border }]}>
        <Text style={[styles.workflowNetLabel, { color: colors.textSecondary }]}>Net</Text>
        <Text style={[styles.workflowNetValue, { color: colors.accent }]}>+250</Text>
      </View>
    </View>

    <View style={styles.workflowStatus}>
      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
      <Text style={[styles.workflowStatusText, { color: colors.success }]}>Ready to Submit</Text>
    </View>
  </Card>
);

const SectionAbout = ({ colors, router, onSelect, styles }: { colors: Colors; router: any; onSelect: (id: SectionId) => void; styles: any }) => (
  <View>
    <Text style={[styles.eyebrow, { color: colors.primary }]}>Bookkeeping by</Text>
    <Text style={[styles.display, { color: colors.textPrimary }]}>Skillrout</Text>
    <Text style={[styles.hero, { color: colors.textPrimary }]}>
      Bookkeeping built around the way your stores actually operate.
    </Text>
    <Text style={[styles.body, { color: colors.textSecondary }]}>
      Track machine readings, employee visits, settlements, receipts, photos, and history — without spreadsheets,
      paper calculations, or missing records.
    </Text>

    <View style={styles.heroActions}>
      <Button title="Create Owner Account" onPress={() => router.push('/owner/register')} iconName="arrow-forward" />
      <Button title="Owner Sign In" onPress={() => router.push('/owner/login')} variant="secondary" />
      <Button title="Employee Sign In" onPress={() => router.push('/employee/login')} variant="secondary" />
      <Button title="See How It Works" onPress={() => onSelect('howItWorks')} variant="secondary" />
    </View>

    <Text style={[styles.trustLine, { color: colors.textMuted }]}>
      Every visit recorded. Every calculation traceable.
    </Text>

    <MiniWorkflow colors={colors} styles={styles} />

    <View style={styles.tiles}>
      {[
        { title: 'Stores', icon: 'storefront-outline' },
        { title: 'Machines', icon: 'hardware-chip-outline' },
        { title: 'Employees', icon: 'people-outline' },
        { title: 'Settlements', icon: 'cash-outline' },
      ].map(tile => (
        <View key={tile.title} style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name={tile.icon as any} size={28} color={colors.primary} />
          <Text style={[styles.tileTitle, { color: colors.textPrimary }]}>{tile.title}</Text>
        </View>
      ))}
    </View>
  </View>
);

const SectionHowItWorks = ({ colors, styles }: { colors: Colors; styles: any }) => {
  const steps = [
    { n: '01', title: 'Select Store', body: 'Employee opens the assigned location.' },
    { n: '02', title: 'Capture Readings', body: 'Enter machine IN/OUT readings or scan them.' },
    { n: '03', title: 'RUN', body: 'Skillrout calculates activity from the last settled reading.' },
    { n: '04', title: 'Review', body: 'Positive, zero, or negative result is clearly identified.' },
    { n: '05', title: 'Submit or Print', body: 'Valid settlements advance the baseline.' },
    { n: '06', title: 'History', body: 'Every completed visit stays permanently traceable.' },
  ];
  return (
    <View>
      <Text style={[styles.eyebrow, { color: colors.primary }]}>How Skillrout Works</Text>
      <Text style={[styles.h2, { color: colors.textPrimary }]}>Six steps. Less confusion.</Text>
      <View style={styles.steps}>
        {steps.map(step => (
          <View key={step.n} style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primarySubtle, borderColor: colors.border }]}>
              <Text style={[styles.stepNumberText, { color: colors.primary }]}>{step.n}</Text>
            </View>
            <View style={styles.stepBody}>
              <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>{step.title}</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{step.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const SectionFeatures = ({ colors, styles }: { colors: Colors; styles: any }) => (
  <View>
    <Text style={[styles.eyebrow, { color: colors.primary }]}>Features</Text>
    <Text style={[styles.h2, { color: colors.textPrimary }]}>Everything that keeps your records straight.</Text>
    <View style={styles.bento}>
      <Card style={[styles.bentoLarge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="storefront-outline" size={28} color={colors.primary} />
        <Text style={[styles.bentoTitle, { color: colors.textPrimary }]}>Store & Machine Tracking</Text>
        <Text style={[styles.bentoBody, { color: colors.textSecondary }]}>Keep every location and machine organized.</Text>
      </Card>
      <Card style={[styles.bentoSmall, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="time-outline" size={24} color={colors.primary} />
        <Text style={[styles.bentoTitle, { color: colors.textPrimary }]}>Visit History</Text>
        <Text style={[styles.bentoBody, { color: colors.textSecondary }]}>Every RUN creates a permanent record.</Text>
      </Card>
      <Card style={[styles.bentoSmall, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="calculator-outline" size={24} color={colors.primary} />
        <Text style={[styles.bentoTitle, { color: colors.textPrimary }]}>Auto Calculations</Text>
        <Text style={[styles.bentoBody, { color: colors.textSecondary }]}>Changes from the last settled reading.</Text>
      </Card>
      <Card style={[styles.bentoSmall, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="camera-outline" size={24} color={colors.primary} />
        <Text style={[styles.bentoTitle, { color: colors.textPrimary }]}>Machine Photos</Text>
        <Text style={[styles.bentoBody, { color: colors.textSecondary }]}>Attach evidence directly to the visit.</Text>
      </Card>
      <Card style={[styles.bentoSmall, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="receipt-outline" size={24} color={colors.primary} />
        <Text style={[styles.bentoTitle, { color: colors.textPrimary }]}>Thermal Receipts</Text>
        <Text style={[styles.bentoBody, { color: colors.textSecondary }]}>Generate print-ready settlement reports.</Text>
      </Card>
      <Card style={[styles.bentoLarge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="people-outline" size={28} color={colors.primary} />
        <Text style={[styles.bentoTitle, { color: colors.textPrimary }]}>Employee Accountability</Text>
        <Text style={[styles.bentoBody, { color: colors.textSecondary }]}>Know who visited, when, and what they recorded.</Text>
      </Card>
      <Card style={[styles.bentoSmall, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="bar-chart-outline" size={24} color={colors.primary} />
        <Text style={[styles.bentoTitle, { color: colors.textPrimary }]}>Insights</Text>
        <Text style={[styles.bentoBody, { color: colors.textSecondary }]}>Understand visits, trends, and exceptions.</Text>
      </Card>
    </View>
  </View>
);

const SectionOcr = ({ colors, styles }: { colors: Colors; styles: any }) => (
  <View>
    <Text style={[styles.eyebrow, { color: colors.primary }]}>OCR Scanning</Text>
    <Text style={[styles.h2, { color: colors.textPrimary }]}>Faster readings with OCR</Text>
    <View style={[styles.comingSoonPill, { backgroundColor: colors.accentSubtle, borderColor: colors.border }]}>
      <Text style={[styles.comingSoonPillText, { color: colors.accent }]}>Coming Soon</Text>
    </View>
    <Text style={[styles.body, { color: colors.textSecondary }]}>
      Point your camera at a machine meter and Skillrout will help capture the reading automatically.
    </Text>
    <Card style={[styles.ocrFlow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {['Scan Meter', 'Review reading', 'Confirm'].map((step, i) => (
        <View key={step} style={styles.ocrStep}>
          <View style={[styles.ocrDot, { backgroundColor: colors.primary }]}>
            <Text style={[styles.ocrDotText, { color: colors.textOnPrimary }]}>{i + 1}</Text>
          </View>
          <Text style={[styles.ocrText, { color: colors.textPrimary }]}>{step}</Text>
          {i < 2 && <Ionicons name="arrow-down" size={18} color={colors.textMuted} style={styles.ocrArrow} />}
        </View>
      ))}
    </Card>
    <Text style={[styles.body, { color: colors.textSecondary }]}>
      You stay in control. Scanned readings are reviewed before they are accepted.
    </Text>
  </View>
);

const SectionAccuracy = ({ colors, styles }: { colors: Colors; styles: any }) => (
  <View>
    <Text style={[styles.eyebrow, { color: colors.primary }]}>Accuracy & Controls</Text>
    <Text style={[styles.h2, { color: colors.textPrimary }]}>Built-in safeguards for every settlement.</Text>
    <View style={styles.checks}>
      {[
        'Last settled values preserved',
        'Automatic IN / OUT calculation',
        'Positive-only settlement submission',
        'Store + Vendor % validation',
        'Duplicate/concurrent submission protection',
        'Permanent RUN history',
        'Submitted records protected from normal editing',
      ].map(item => (
        <View key={item} style={styles.check}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={[styles.checkText, { color: colors.textSecondary }]}>{item}</Text>
        </View>
      ))}
    </View>
    <View style={[styles.callout, { backgroundColor: colors.accentSubtle, borderColor: colors.border }]}>
      <Text style={[styles.calloutTitle, { color: colors.accentDark }]}>RUN ≠ PRINT ≠ SUBMIT</Text>
      <Text style={[styles.calloutBody, { color: colors.textSecondary }]}>
        RUN records the visit. PRINT produces the report. SUBMIT advances the settlement.
      </Text>
    </View>
    <Text style={[styles.body, { color: colors.textSecondary }]}>
      Less manual calculation. More control. Better records.
    </Text>
  </View>
);

const SectionInsights = ({ colors, styles }: { colors: Colors; styles: any }) => (
  <View>
    <Text style={[styles.eyebrow, { color: colors.primary }]}>Insights</Text>
    <Text style={[styles.h2, { color: colors.textPrimary }]}>See what is happening across the business.</Text>
    <Card style={[styles.insightsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.insightsTitle, { color: colors.textPrimary }]}>THIS MONTH</Text>
      <View style={styles.insightsGrid}>
        {[
          { label: 'Store Visits', value: '48' },
          { label: 'Submitted', value: '36' },
          { label: 'Printed Only', value: '8' },
          { label: 'Pending', value: '4' },
        ].map(item => (
          <View key={item.label} style={styles.insight}>
            <Text style={[styles.insightValue, { color: colors.textPrimary }]}>{item.value}</Text>
            <Text style={[styles.insightLabel, { color: colors.textMuted }]}>{item.label}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.net, { borderTopColor: colors.border }]}>
        <Text style={[styles.netLabel, { color: colors.textSecondary }]}>Net Activity</Text>
        <Text style={[styles.netValue, { color: colors.accent }]}>$12,540</Text>
      </View>
    </Card>
    <Text style={[styles.body, { color: colors.textSecondary }]}>
      Track store activity, employee activity, settlement totals, positive/negative results, pending settlements,
      machine history, and visit frequency.
    </Text>
  </View>
);

const SectionSecurity = ({ colors, styles }: { colors: Colors; styles: any }) => (
  <View>
    <Text style={[styles.eyebrow, { color: colors.primary }]}>Security</Text>
    <Text style={[styles.h2, { color: colors.textPrimary }]}>Your operational history should stay yours.</Text>
    <View style={styles.checks}>
      {[
        'Secure authentication',
        'Role-based access',
        'Protected submitted settlements',
        'Timestamped activity',
        'Historical snapshots',
        'Controlled employee permissions',
      ].map(item => (
        <View key={item} style={styles.check}>
          <Ionicons name="lock-closed" size={18} color={colors.primary} />
          <Text style={[styles.checkText, { color: colors.textSecondary }]}>{item}</Text>
        </View>
      ))}
    </View>
  </View>
);

const SectionComingSoon = ({ colors, styles }: { colors: Colors; styles: any }) => (
  <View>
    <Text style={[styles.eyebrow, { color: colors.primary }]}>Coming Soon</Text>
    <Text style={[styles.h2, { color: colors.textPrimary }]}>What we’re building next.</Text>
    <View style={styles.comingSoonGrid}>
      {[
        { title: 'OCR Meter Scanning', body: 'Capture readings faster using the camera.', icon: 'camera-outline' },
        { title: 'Smarter Insights', body: 'Spot unusual activity and trends automatically.', icon: 'bulb-outline' },
        { title: 'Visit Reminders', body: 'Know when stores need attention.', icon: 'calendar-outline' },
      ].map(card => (
        <Card key={card.title} style={[styles.comingSoonCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name={card.icon as any} size={28} color={colors.accent} />
          <Text style={[styles.comingSoonTitle, { color: colors.textPrimary }]}>{card.title}</Text>
          <Text style={[styles.comingSoonBody, { color: colors.textSecondary }]}>{card.body}</Text>
          <View style={[styles.comingSoonPillInline, { backgroundColor: colors.accentSubtle }]}>
            <Text style={[styles.comingSoonPillText, { color: colors.accent }]}>Coming Soon</Text>
          </View>
        </Card>
      ))}
    </View>
  </View>
);

const SectionFooter = ({ colors, router, styles }: { colors: Colors; router: any; styles: any }) => (
  <View style={[styles.final, { borderTopColor: colors.border }]}>
    <Text style={[styles.finalTitle, { color: colors.textPrimary }]}>
      Spend less time reconciling records. Spend more time running the business.
    </Text>
    <View style={styles.finalActions}>
      <Button title="Create Owner Account" onPress={() => router.push('/owner/register')} iconName="arrow-forward" />
      <Button title="Employee Sign In" onPress={() => router.push('/employee/login')} variant="secondary" />
    </View>
    <Pressable onPress={() => router.push('/owner/login')} style={styles.finalSignIn} accessibilityRole="button">
      <Text style={[styles.finalSignInText, { color: colors.primary }]}>Already using Skillrout as an owner? Sign in.</Text>
    </Pressable>
  </View>
);

const SECTION_RENDERERS: Record<SectionId, (props: { colors: Colors; router: any; onSelect: (id: SectionId) => void; styles: any }) => React.ReactElement> = {
  about: SectionAbout,
  howItWorks: SectionHowItWorks,
  features: SectionFeatures,
  ocr: SectionOcr,
  accuracy: SectionAccuracy,
  insights: SectionInsights,
  security: SectionSecurity,
  comingSoon: SectionComingSoon,
};

export default function IndexScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const { width } = useWindowDimensions();
  const [activeSection, setActiveSection] = useState<SectionId>('about');
  const [signInOpen, setSignInOpen] = useState(false);
  const isWide = width >= 768;

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <Image
          source={require('../assets/images/skillrout-icon-blue.png')}
          style={[styles.logoSmall, { tintColor: colors.primary }]}
          accessibilityLabel="Skillrout"
        />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading Skillrout…</Text>
      </View>
    );
  }

  if (user && role) {
    return <Redirect href={role === 'owner' ? '/dashboard' : '/select-store'} />;
  }

  const ActiveComponent = SECTION_RENDERERS[activeSection];

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <Image
            source={require('../assets/images/skillrout-icon-blue.png')}
            style={[styles.logoSmall, { tintColor: colors.primary }]}
            accessibilityLabel="Skillrout"
          />
          <View>
            <Text style={[styles.brandEyebrow, { color: colors.primary }]}>BOOKKEEPING BY</Text>
            <Text style={[styles.brandName, { color: colors.textPrimary }]}>Skillrout</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <View style={styles.dropdown}>
            <Pressable
              onPress={() => setSignInOpen(v => !v)}
              style={styles.dropdownTrigger}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
            >
              <Text style={[styles.dropdownTriggerText, { color: colors.textPrimary }]}>Sign In</Text>
              <Ionicons name={signInOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textPrimary} />
            </Pressable>
            {signInOpen && (
              <View style={[styles.dropdownMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Pressable
                  onPress={() => { setSignInOpen(false); router.push('/owner/login'); }}
                  style={styles.dropdownItem}
                  accessibilityRole="button"
                >
                  <Ionicons name="briefcase-outline" size={18} color={colors.primary} />
                  <Text style={[styles.dropdownItemText, { color: colors.textPrimary }]}>Owner Sign In</Text>
                </Pressable>
                <Pressable
                  onPress={() => { setSignInOpen(false); router.push('/employee/login'); }}
                  style={styles.dropdownItem}
                  accessibilityRole="button"
                >
                  <Ionicons name="people-outline" size={18} color={colors.primary} />
                  <Text style={[styles.dropdownItemText, { color: colors.textPrimary }]}>Employee Sign In</Text>
                </Pressable>
              </View>
            )}
          </View>
          <Button title="Create Owner Account" onPress={() => router.push('/owner/register')} compact />
        </View>
      </View>

      <View style={[isWide ? styles.split : styles.stack, { flexDirection: isWide ? 'row' : 'column' }]}>
        <View style={[styles.left, isWide && styles.leftWide]}>
          <Text style={[styles.discover, { color: colors.textMuted }]}>Discover Skillrout</Text>
          {SECTIONS.map(section => {
            const active = activeSection === section.id;
            return (
              <Pressable
                key={section.id}
                onPress={() => setActiveSection(section.id)}
                style={[styles.navItem, active && { borderLeftColor: colors.accent }]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Ionicons name={section.icon} size={20} color={active ? colors.accent : colors.textMuted} />
                <Text
                  style={[
                    styles.navLabel,
                    { color: active ? colors.accent : colors.textSecondary },
                    active && styles.navLabelActive,
                  ]}
                >
                  {section.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.right, isWide && styles.rightWide]}>
          <ActiveComponent colors={colors} router={router} onSelect={setActiveSection} styles={styles} />
          <SectionFooter colors={colors} router={router} styles={styles} />
        </View>
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: spacing.lg,
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
    logoSmall: {
      width: spacing.xxl,
      height: spacing.xxl,
      borderRadius: radii.lg,
      resizeMode: 'contain',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: spacing.lg,
      marginBottom: spacing.xl,
      gap: spacing.md,
      zIndex: 1000,
    },
    brand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    brandEyebrow: {
      fontSize: fontSizes.caption,
      fontWeight: '700',
      letterSpacing: letterSpacings.wide,
    },
    brandName: {
      fontSize: fontSizes.h3,
      fontWeight: '800',
      letterSpacing: letterSpacings.tight,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    dropdown: {
      position: 'relative',
      zIndex: 1001,
    },
    dropdownTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      minHeight: 44,
      paddingHorizontal: spacing.sm,
    },
    dropdownTriggerText: {
      fontSize: fontSizes.body,
      fontWeight: '600',
    },
    dropdownMenu: {
      position: 'absolute',
      top: 40,
      right: 0,
      minWidth: 180,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.xs,
      zIndex: 1002,
      elevation: 12,
    },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 44,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.sm,
    },
    dropdownItemText: {
      fontSize: fontSizes.body,
      fontWeight: '600',
    },
    split: {
      flex: 1,
      gap: spacing.xl,
    },
    stack: {
      flex: 1,
      gap: spacing.lg,
    },
    left: {
      gap: spacing.xs,
    },
    leftWide: {
      width: '38%',
      maxWidth: 280,
    },
    discover: {
      fontSize: fontSizes.caption,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: letterSpacings.wide,
      marginBottom: spacing.sm,
    },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 48,
      paddingHorizontal: spacing.sm,
      borderLeftWidth: 2,
      borderLeftColor: 'transparent',
      borderRadius: radii.sm,
    },
    navLabel: {
      fontSize: fontSizes.body,
      fontWeight: '600',
    },
    navLabelActive: {
      fontWeight: '800',
    },
    right: {
      flex: 1,
      gap: spacing.xl,
      paddingBottom: spacing.xxl,
    },
    rightWide: {
      width: '62%',
    },
    eyebrow: {
      fontSize: fontSizes.caption,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: letterSpacings.wide,
      marginBottom: spacing.xs,
    },
    display: {
      fontSize: fontSizes.display,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: spacing.sm,
      letterSpacing: letterSpacings.tight,
    },
    hero: {
      fontSize: fontSizes.h1,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: spacing.md,
      lineHeight: lineHeights.h1,
    },
    body: {
      fontSize: fontSizes.body,
      lineHeight: lineHeights.body,
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    heroActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    trustLine: {
      fontSize: fontSizes.caption,
      fontStyle: 'italic',
      marginBottom: spacing.xl,
    },
    workflow: {
      maxWidth: 400,
      padding: spacing.lg,
      borderWidth: 1,
      marginTop: spacing.md,
      marginBottom: spacing.xl,
    },
    workflowHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    workflowTitle: {
      fontSize: fontSizes.caption,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: letterSpacings.wide,
    },
    workflowStore: {
      fontSize: fontSizes.h2,
      fontWeight: '700',
      marginBottom: spacing.md,
    },
    workflowRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    workflowHalf: {
      flex: 1,
    },
    workflowSub: {
      fontSize: fontSizes.caption,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    workflowPair: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    workflowLabel: {
      fontSize: fontSizes.body,
    },
    workflowValue: {
      fontSize: fontSizes.body,
      fontWeight: '700',
    },
    workflowDiff: {
      borderRadius: radii.md,
      padding: spacing.md,
      marginTop: spacing.md,
      marginBottom: spacing.md,
    },
    workflowDiffTitle: {
      fontSize: fontSizes.caption,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: letterSpacings.wide,
      marginBottom: spacing.sm,
    },
    workflowDiffLabel: {
      fontSize: fontSizes.caption,
    },
    workflowDiffValue: {
      fontSize: fontSizes.h3,
      fontWeight: '800',
    },
    workflowNet: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      marginTop: spacing.md,
      paddingTop: spacing.md,
    },
    workflowNetLabel: {
      fontSize: fontSizes.body,
      fontWeight: '700',
    },
    workflowNetValue: {
      fontSize: fontSizes.h2,
      fontWeight: '800',
    },
    workflowStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    workflowStatusText: {
      fontSize: fontSizes.body,
      fontWeight: '700',
    },
    tiles: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      marginTop: spacing.md,
    },
    tile: {
      flex: 1,
      minWidth: 120,
      minHeight: 100,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    tileTitle: {
      fontSize: fontSizes.body,
      fontWeight: '700',
    },
    h2: {
      fontSize: fontSizes.h2,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: spacing.lg,
      lineHeight: lineHeights.h2,
    },
    steps: {
      gap: spacing.md,
    },
    step: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    stepNumber: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumberText: {
      fontSize: fontSizes.body,
      fontWeight: '800',
    },
    stepBody: {
      flex: 1,
      paddingTop: spacing.xs,
    },
    stepTitle: {
      fontSize: fontSizes.h3,
      fontWeight: '700',
      marginBottom: spacing.xs,
    },
    stepDesc: {
      fontSize: fontSizes.body,
      lineHeight: lineHeights.body,
    },
    bento: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    bentoLarge: {
      width: '100%',
      minWidth: 240,
      flex: 1,
    },
    bentoSmall: {
      width: '47%',
      minWidth: 160,
      flex: 1,
    },
    bentoTitle: {
      fontSize: fontSizes.h3,
      fontWeight: '700',
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    bentoBody: {
      fontSize: fontSizes.body,
      lineHeight: lineHeights.body,
    },
    comingSoonPill: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.pill,
      borderWidth: 1,
      marginBottom: spacing.md,
    },
    comingSoonPillText: {
      fontSize: fontSizes.caption,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: letterSpacings.wide,
    },
    ocrFlow: {
      padding: spacing.lg,
      marginTop: spacing.md,
      marginBottom: spacing.md,
      alignItems: 'center',
      borderWidth: 1,
    },
    ocrStep: {
      alignItems: 'center',
      gap: spacing.xs,
    },
    ocrDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ocrDotText: {
      fontSize: fontSizes.body,
      fontWeight: '700',
    },
    ocrText: {
      fontSize: fontSizes.body,
      fontWeight: '600',
    },
    ocrArrow: {
      marginVertical: spacing.xs,
    },
    checks: {
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    check: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 36,
    },
    checkText: {
      fontSize: fontSizes.body,
      lineHeight: lineHeights.body,
    },
    callout: {
      borderRadius: radii.md,
      padding: spacing.lg,
      borderWidth: 1,
      marginBottom: spacing.lg,
    },
    calloutTitle: {
      fontSize: fontSizes.h3,
      fontWeight: '800',
      marginBottom: spacing.xs,
    },
    calloutBody: {
      fontSize: fontSizes.body,
      lineHeight: lineHeights.body,
    },
    insightsCard: {
      padding: spacing.lg,
      borderWidth: 1,
      marginBottom: spacing.md,
    },
    insightsTitle: {
      fontSize: fontSizes.caption,
      fontWeight: '700',
      letterSpacing: letterSpacings.wide,
      marginBottom: spacing.md,
    },
    insightsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    insight: {
      width: '45%',
      minWidth: 120,
    },
    insightValue: {
      fontSize: fontSizes.h2,
      fontWeight: '800',
    },
    insightLabel: {
      fontSize: fontSizes.caption,
    },
    net: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      paddingTop: spacing.md,
    },
    netLabel: {
      fontSize: fontSizes.body,
      fontWeight: '700',
    },
    netValue: {
      fontSize: fontSizes.h2,
      fontWeight: '800',
    },
    comingSoonGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    comingSoonCard: {
      flex: 1,
      minWidth: 220,
      borderWidth: 1,
    },
    comingSoonTitle: {
      fontSize: fontSizes.h3,
      fontWeight: '700',
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    comingSoonBody: {
      fontSize: fontSizes.body,
      lineHeight: lineHeights.body,
      marginBottom: spacing.md,
    },
    comingSoonPillInline: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.pill,
    },
    final: {
      borderTopWidth: 1,
      paddingTop: spacing.xl,
      marginTop: spacing.xl,
    },
    finalTitle: {
      fontSize: fontSizes.h2,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: spacing.lg,
      lineHeight: lineHeights.h2,
    },
    finalActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    finalSignIn: {
      alignSelf: 'center',
      minHeight: 44,
      justifyContent: 'center',
    },
    finalSignInText: {
      fontSize: fontSizes.body,
      fontWeight: '600',
    },
  });

