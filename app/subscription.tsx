import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { hasPremiumEntitlement, useRevenueCat } from '../context/RevenueCatProvider';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAppConfig } from '../context/AppConfigProvider';
import type { FeatureFlag } from '../lib/featureFlags';
import { analytics } from '../lib/analytics';


const { width } = Dimensions.get('window');

// Anime cover images for the background collage
const COLLAGE_IMAGES = [
  'https://cdn.myanimelist.net/images/anime/1000/110531l.jpg',  // Attack on Titan
  'https://cdn.myanimelist.net/images/anime/1286/99889l.jpg',  // Demon Slayer
  'https://cdn.myanimelist.net/images/anime/1171/109222l.jpg',  // Jujutsu Kaisen
  'https://cdn.myanimelist.net/images/anime/1244/138851l.jpg',  // One Piece
  'https://cdn.myanimelist.net/images/anime/1141/142503l.jpg',  // Solo Leveling
  'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg',  // Death Note
  'https://cdn.myanimelist.net/images/anime/1506/138982l.jpg',  // Spy x Family
  'https://cdn.myanimelist.net/images/anime/1806/126216l.jpg',  // Chainsaw Man
];

type PlanKey = 'monthly' | 'annual';

type Benefit = { key: string; icon: React.ReactNode; flag?: FeatureFlag };

const ICON_COLOR = '#854D0E';

// Only benefits whose module is switched on are advertised, so the paywall never promises
// something the build doesn't deliver. Ad-free is always part of premium.
const BENEFITS: Benefit[] = [
  { key: 'AdFree', icon: <Ionicons name="ban" size={20} color={ICON_COLOR} /> },
  { key: 'Stats', icon: <Ionicons name="stats-chart" size={20} color={ICON_COLOR} />, flag: 'premium_stats' },
  { key: 'SmartRecs', icon: <MaterialCommunityIcons name="creation" size={20} color={ICON_COLOR} />, flag: 'premium_smart_recs' },
  { key: 'Notifications', icon: <Ionicons name="notifications" size={20} color={ICON_COLOR} />, flag: 'premium_notifications' },
  { key: 'ListTools', icon: <Ionicons name="pricetags" size={20} color={ICON_COLOR} />, flag: 'premium_list_tools' },
  { key: 'Cosmetics', icon: <Ionicons name="color-palette" size={20} color={ICON_COLOR} />, flag: 'premium_cosmetics' },
  { key: 'Backup', icon: <Ionicons name="cloud-upload" size={20} color={ICON_COLOR} />, flag: 'premium_backup' },
  { key: 'Polls', icon: <Ionicons name="bar-chart" size={20} color={ICON_COLOR} />, flag: 'content_cards' },
];

/** Free-trial length in days from a product's intro offer, or 0 when it has no free trial. */
const freeTrialDays = (pkg: PurchasesPackage | null): number => {
  const intro = pkg?.product.introPrice;
  if (!intro || intro.price !== 0) return 0;
  const perUnit = intro.periodUnit === 'WEEK' ? 7 : intro.periodUnit === 'MONTH' ? 30 : intro.periodUnit === 'YEAR' ? 365 : 1;
  return intro.periodNumberOfUnits * perUnit;
};

export default function SubscriptionScreen() {
  const router = useRouter();
  const { packages, purchasePackage, restorePermissions, reloadOfferings, isPro, isReady } = useRevenueCat();
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const { config } = useAppConfig();
  const [isPurchasing, setIsPurchasing] = React.useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<PlanKey>('annual');
  // Product ids that are NOT eligible for their intro offer (iOS only; Play only returns eligible offers)
  const [introIneligible, setIntroIneligible] = React.useState<Set<string>>(new Set());
  const { source, feature } = useLocalSearchParams<{ source?: string; feature?: FeatureFlag }>();
  const isProRef = React.useRef(isPro);
  isProRef.current = isPro;

  const isWeb = Platform.OS === 'web';
  const hasPlans = !!(packages.monthly || packages.annual);
  // Fall back to whichever plan exists if the preferred one isn't offered
  const selectedPackage = (selectedPlan === 'annual' ? packages.annual ?? packages.monthly : packages.monthly ?? packages.annual) ?? null;

  // Paywall funnel: viewed -> purchase_* (from RevenueCatProvider) or dismissed
  React.useEffect(() => {
    const openedAt = Date.now();
    analytics.track('paywall_viewed', { source: source ?? 'unknown', feature: feature ?? null });
    return () => {
      if (!isProRef.current) {
        analytics.track('paywall_dismissed', { source: source ?? 'unknown', seconds_open: Math.round((Date.now() - openedAt) / 1000) });
      }
    };
  }, []);


  // If already pro, go back or show success
  React.useEffect(() => {
    if (isPro) {
      router.back();
    }
  }, [isPro]);

  const loadPlans = async () => {
    setIsLoadingPlans(true);
    try {
      await reloadOfferings();
    } finally {
      setIsLoadingPlans(false);
    }
  };

  // The initial fetch may have failed (offline at launch) — try once more when the paywall opens
  React.useEffect(() => {
    if (isReady && !hasPlans && !isWeb) loadPlans();
  }, [isReady]);

  React.useEffect(() => {
    if (Platform.OS !== 'ios' || !hasPlans) return;
    const ids = [packages.monthly, packages.annual].filter(Boolean).map(p => p!.product.identifier);
    Purchases.checkTrialOrIntroductoryPriceEligibility(ids)
      .then(result => {
        setIntroIneligible(new Set(
          Object.entries(result)
            .filter(([, e]) => e.status === Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE)
            .map(([id]) => id)
        ));
      })
      .catch(() => { });
  }, [packages]);

  // Never show a made-up price: until the store returns a real product we show a loading or retry state
  const plansLoading = !hasPlans && !isWeb && (!isReady || isLoadingPlans);
  const plansUnavailable = !hasPlans && !plansLoading;

  const trialDaysFor = (pkg: PurchasesPackage | null) =>
    pkg && !introIneligible.has(pkg.product.identifier) ? freeTrialDays(pkg) : 0;
  const trialDays = trialDaysFor(selectedPackage);

  // Annual discount vs. paying monthly for a year (≈ 2 months free)
  const annualSavingPercent = packages.monthly && packages.annual && packages.monthly.product.price > 0
    ? Math.round((1 - packages.annual.product.price / (packages.monthly.product.price * 12)) * 100)
    : 0;

  const selectPlan = (plan: PlanKey) => {
    setSelectedPlan(plan);
    analytics.track('paywall_plan_selected', { plan });
  };

  const handlePurchase = async () => {
    if (!selectedPackage) {
      if (plansUnavailable && !isWeb) loadPlans();
      return;
    }
    setIsPurchasing(true);
    try {
      await purchasePackage(selectedPackage);
      // Success is handled by the useEffect above
    } catch (e) {
      // Error handled in provider (except user cancellation)
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsPurchasing(true);
    try {
      const info = await restorePermissions();
      if (hasPremiumEntitlement(info)) {
        // The isPro effect above closes the paywall
        Alert.alert(t('common.success'), t('subscription.restoreSuccess'));
      } else {
        Alert.alert(t('subscription.restoreNothingTitle'), t('subscription.restoreNothing'));
      }
    } catch (e) {
      Alert.alert(t('common.error'), t('subscription.restoreError'));
    } finally {
      setIsPurchasing(false);
    }

  };

  const ctaLabel = isPurchasing
    ? t('subscription.ctaProcessing')
    : plansLoading
      ? t('subscription.loadingPlans')
      : plansUnavailable
        ? t('subscription.retryPlans')
        : trialDays > 0
          ? t('subscription.ctaTrial', { days: trialDays })
          : t('subscription.ctaSubscribe');

  // The module the user tapped "Unlock" on is listed first
  const benefits = BENEFITS
    .filter(b => !b.flag || config[b.flag])
    .sort((a, b) => Number(b.flag === feature) - Number(a.flag === feature));

  const renderPlan = (plan: PlanKey, pkg: PurchasesPackage | null) => {
    if (!pkg) return null;
    const selected = selectedPackage?.identifier === pkg.identifier;
    const days = trialDaysFor(pkg);
    const isAnnual = plan === 'annual';
    return (
      <TouchableOpacity
        key={plan}
        style={[
          styles.planCard,
          { backgroundColor: colors.card, borderColor: selected ? colors.primary : colors.border },
          selected && styles.planCardSelected,
        ]}
        onPress={() => selectPlan(plan)}
        activeOpacity={0.85}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
      >
        {isAnnual && annualSavingPercent > 0 && (
          <View style={[styles.saveBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.saveBadgeText}>{t('subscription.savePercent', { percent: annualSavingPercent })}</Text>
          </View>
        )}
        <View style={styles.planRow}>
          <Ionicons
            name={selected ? 'radio-button-on' : 'radio-button-off'}
            size={22}
            color={selected ? colors.primary : colors.subtext}
          />
          <View style={styles.planInfo}>
            <Text style={[styles.planName, { color: colors.text }]}>
              {t(isAnnual ? 'subscription.annualPlan' : 'subscription.monthlyPlan')}
            </Text>
            {days > 0 && (
              <Text style={[styles.planTrial, { color: colors.primary }]}>{t('subscription.trialBadge', { days })}</Text>
            )}
          </View>
          <View style={styles.planPriceCol}>
            <Text style={[styles.planPrice, { color: colors.text }]}>{pkg.product.priceString}</Text>
            <Text style={[styles.planPeriod, { color: colors.subtext }]}>
              {isAnnual && pkg.product.pricePerMonthString
                ? t('subscription.annualPerMonth', { price: pkg.product.pricePerMonthString })
                : `/ ${t(isAnnual ? 'subscription.year' : 'subscription.month')}`}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Background Collage */}
      <View style={styles.collageContainer}>
        <View style={styles.collageGrid}>
          {COLLAGE_IMAGES.map((img, index) => (
            <Image key={index} source={{ uri: img }} style={styles.collageImage} />
          ))}
        </View>
        <LinearGradient
          colors={[isDark ? 'rgba(15,15,15,0)' : 'rgba(249,250,251,0)', colors.background]}
          style={styles.collageGradient}
        />
      </View>

      {/* Close Button */}
      <SafeAreaView style={styles.safeAreaHeader}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          {/* Premium Badge */}
          <View style={[styles.premiumBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.premiumText}>{t('subscription.premium')}</Text>
          </View>


          {/* Headlines */}
          <Text style={[styles.headline, { color: colors.text }]}>
            {t('subscription.headline')}
          </Text>
          <Text style={[styles.subheadline, { color: colors.subtext }]}>
            {t('subscription.subheadline')}
          </Text>


          {/* Plans */}
          {hasPlans ? (
            <View style={styles.plans}>
              {renderPlan('annual', packages.annual)}
              {renderPlan('monthly', packages.monthly)}
              <Text style={[styles.priceSubtext, { color: colors.subtext }]}>
                {trialDays > 0 && selectedPackage
                  ? t('subscription.trialThen', {
                    days: trialDays,
                    price: selectedPackage.product.priceString,
                    period: t(selectedPackage === packages.annual ? 'subscription.year' : 'subscription.month'),
                  })
                  : t('subscription.cancelAnytime')}
              </Text>
            </View>
          ) : (
            <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {plansLoading ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : (
                <Text style={[styles.statusText, { color: colors.subtext }]}>
                  {t(isWeb ? 'subscription.webUnavailable' : 'subscription.plansUnavailable')}
                </Text>
              )}
            </View>
          )}


          {/* Benefits Section */}
          <Text style={[styles.benefitsTitle, { color: colors.subtext }]}>{t('subscription.benefitsTitle')}</Text>

          {benefits.map(b => (
            <View
              key={b.key}
              style={[
                styles.benefitItem,
                { backgroundColor: colors.card, borderColor: b.flag && b.flag === feature ? colors.primary : colors.border },
              ]}
            >
              <View style={styles.iconContainer}>{b.icon}</View>
              <View style={styles.benefitTextContainer}>
                <Text style={[styles.benefitTitle, { color: colors.text }]}>{t(`subscription.benefit${b.key}Title`)}</Text>
                <Text style={[styles.benefitDesc, { color: colors.subtext }]}>{t(`subscription.benefit${b.key}Desc`)}</Text>
              </View>
            </View>
          ))}

          {hasPlans && (
            <Text style={[styles.legal, { color: colors.subtext }]}>
              {t(Platform.OS === 'ios' ? 'subscription.legalIos' : 'subscription.legalAndroid')}
            </Text>
          )}


          <View style={{ height: 180 }} />
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {!isWeb && (
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: colors.primary, shadowColor: colors.primary, opacity: isPurchasing || plansLoading ? 0.7 : 1 }]}
            activeOpacity={0.9}
            onPress={handlePurchase}
            disabled={isPurchasing || plansLoading}
          >
            <Text style={styles.ctaButtonText}>{ctaLabel}</Text>
            {!isPurchasing && !plansLoading && (
              <Ionicons name={plansUnavailable ? 'refresh' : 'arrow-forward'} size={20} color="#111827" />
            )}
          </TouchableOpacity>
        )}


        <View style={styles.footerLinks}>
          {!isWeb && (
            <>
              <TouchableOpacity onPress={handleRestore} disabled={isPurchasing}>
                <Text style={[styles.footerLinkText, { color: colors.subtext }]}>{t('subscription.restorePurchase')}</Text>
              </TouchableOpacity>
              <Text style={[styles.footerLinkText, { color: colors.subtext }]}> • </Text>
            </>
          )}
          <TouchableOpacity onPress={() => router.push('/settings/terms')}>
            <Text style={[styles.footerLinkText, { color: colors.subtext }]}>{t('subscription.terms')}</Text>
          </TouchableOpacity>
          <Text style={[styles.footerLinkText, { color: colors.subtext }]}> • </Text>
          <TouchableOpacity onPress={() => router.push('/settings/privacy')}>
            <Text style={[styles.footerLinkText, { color: colors.subtext }]}>{t('subscription.privacyPolicy')}</Text>
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  collageContainer: {
    height: 340,
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  collageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: width,
    padding: 3,
    gap: 3,
  },
  collageImage: {
    width: (width - 15) / 4, // 4 columns: padding(3*2) + gaps(3*3) = 15
    height: 160,
    resizeMode: 'cover',
    borderRadius: 6,
    opacity: 0.9,
  },
  collageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '80%',
  },
  safeAreaHeader: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
    marginTop: 10,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 240, // Push content down below collage
  },
  contentContainer: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  premiumBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  premiumText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: '#111827',
    letterSpacing: 1,
  },
  headline: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
  },
  subheadline: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  plans: {
    width: '100%',
    gap: 12,
    marginBottom: 28,
  },
  planCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  planCardSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  planTrial: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 2,
  },
  planPriceCol: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
  },
  planPeriod: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
  },
  saveBadge: {
    position: 'absolute',
    top: -11,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  saveBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: '#111827',
  },
  priceSubtext: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
  },
  statusCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
  },
  benefitsTitle: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 1,
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    width: '100%',
    borderWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF9C3', // Light yellow
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
  },
  legal: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#111827',
    marginRight: 8,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLinkText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
  },
});
