import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRevenueCat } from '../context/RevenueCatProvider';

const { width } = Dimensions.get('window');

// Images for the background collage
const COLLAGE_IMAGES = [
  'https://images.unsplash.com/photo-1541562232579-512a21360020?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1620336655055-088d06e36bf0?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1601850494422-3cf395d5251e?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?q=80&w=300&auto=format&fit=crop',
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const { currentOffering, purchasePackage, restorePermissions, isPro } = useRevenueCat();
  const [isPurchasing, setIsPurchasing] = React.useState(false);

  // If already pro, go back or show success
  React.useEffect(() => {
    if (isPro) {
      router.back();
    }
  }, [isPro]);

  const handlePurchase = async () => {
    if (!currentOffering) return;
    setIsPurchasing(true);
    try {
      await purchasePackage(currentOffering);
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
      await restorePermissions();
      // Success handled by useEffect if entitlement found
      alert("Restore completed.");
    } catch (e) {
      alert("Failed to restore purchases.");
    } finally {
      setIsPurchasing(false);
    }
  };

  const priceString = currentOffering?.product?.priceString || '$19.99';
  // const pricePerMonth = currentOffering?.product?.price ? (currentOffering.product.price / 12).toFixed(2) : '1.66';
  const currencySymbol = currentOffering?.product?.priceString?.charAt(0) || '$';

  return (
    <View style={styles.container}>

      {/* Background Collage */}
      <View style={styles.collageContainer}>
        <View style={styles.collageGrid}>
          {COLLAGE_IMAGES.map((img, index) => (
            <Image key={index} source={{ uri: img }} style={styles.collageImage} />
          ))}
        </View>
        <LinearGradient
          colors={['rgba(255,255,255,0)', '#F9FAFB']}
          style={styles.collageGradient}
        />
      </View>

      {/* Close Button */}
      <SafeAreaView style={styles.safeAreaHeader}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
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
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumText}>PREMIUM</Text>
          </View>

          {/* Headlines */}
          <Text style={styles.headline}>
            Unlock the Full{'\n'}AnimeDex Experience
          </Text>
          <Text style={styles.subheadline}>
            Support development and track your favorite anime without any interruptions.
          </Text>

          {/* Pricing Card */}
          <View style={styles.pricingCard}>
            <View style={styles.bestValueBadge}>
              <Text style={styles.bestValueText}>BEST VALUE</Text>
            </View>

            <Text style={styles.planName}>Monthly Plan</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceAmount}>{priceString}</Text>
              <Text style={styles.pricePeriod}> / month</Text>
            </View>
            <Text style={styles.priceSubtext}>Cancel anytime</Text>
          </View>

          {/* Benefits Section */}
          <Text style={styles.benefitsTitle}>PRO BENEFITS</Text>

          <View style={styles.benefitItem}>
            <View style={styles.iconContainer}>
              <Ionicons name="ban" size={20} color="#854D0E" />
            </View>
            <View style={styles.benefitTextContainer}>
              <Text style={styles.benefitTitle}>Ad-Free Experience</Text>
              <Text style={styles.benefitDesc}>Enjoy zero distractions while browsing.</Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="infinity" size={20} color="#854D0E" />
            </View>
            <View style={styles.benefitTextContainer}>
              <Text style={styles.benefitTitle}>Unlimited Tracking</Text>
              <Text style={styles.benefitDesc}>Add unlimited shows to your lists.</Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="check-decagram" size={20} color="#854D0E" />
            </View>
            <View style={styles.benefitTextContainer}>
              <Text style={styles.benefitTitle}>Exclusive Badges</Text>
              <Text style={styles.benefitDesc}>Show off your status to the community.</Text>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.ctaButton, { opacity: isPurchasing ? 0.7 : 1 }]}
          activeOpacity={0.9}
          onPress={handlePurchase}
          disabled={isPurchasing}
        >
          <Text style={styles.ctaButtonText}>{isPurchasing ? "Processing..." : "Start Monthly Plan"}</Text>
          {!isPurchasing && <Ionicons name="arrow-forward" size={20} color="#111827" />}
        </TouchableOpacity>

        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={handleRestore} disabled={isPurchasing}>
            <Text style={styles.footerLinkText}>Restore Purchase</Text>
          </TouchableOpacity>
          <Text style={styles.footerLinkText}> • </Text>
          <TouchableOpacity>
            <Text style={styles.footerLinkText}>Terms</Text>
          </TouchableOpacity>
          <Text style={styles.footerLinkText}> • </Text>
          <TouchableOpacity>
            <Text style={styles.footerLinkText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  collageContainer: {
    height: 300,
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  collageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: width + 20, // Slight overflow
    marginLeft: -10,
  },
  collageImage: {
    width: (width / 4) + 2,
    height: 120,
    resizeMode: 'cover',
    margin: 1,
    opacity: 0.8,
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
    paddingTop: 220, // Push content down below collage
  },
  contentContainer: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  premiumBadge: {
    backgroundColor: '#FACC15',
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
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
  },
  subheadline: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  pricingCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    position: 'relative',
    marginBottom: 32,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -12,
    right: -12,
    backgroundColor: '#FACC15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderBottomLeftRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bestValueText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: '#111827',
  },
  planName: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#4B5563',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  priceSymbol: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: '#111827',
    marginRight: 2,
  },
  priceAmount: {
    fontSize: 42,
    fontFamily: 'Poppins_700Bold',
    color: '#111827',
    letterSpacing: -1,
  },
  pricePeriod: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: '#6B7280',
  },
  priceSubtext: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FACC15', // Yellow text
  },
  benefitsTitle: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: '#6B7280',
    letterSpacing: 1,
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: '#F3F4F6',
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
    color: '#111827',
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: '#6B7280',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  ctaButton: {
    backgroundColor: '#FACC15',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#FACC15',
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
    color: '#6B7280',
  },
});
