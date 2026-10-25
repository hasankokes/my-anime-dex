import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { VsMark } from './VsMark';
import { ARENA_GOLD } from './arenaTheme';

interface ArenaHomeBannerProps {
  onPress: () => void;
}

/** Labelled Arena entry for the Home header (replaces the floating action button). */
export const ArenaHomeBanner: React.FC<ArenaHomeBannerProps> = ({ onPress }) => {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      // Stays dark in both themes on purpose (stage look); in light mode a soft shadow seats it on the page.
      // The shadow lives on this outer view because overflow: hidden on the card would clip it on iOS.
      style={({ pressed }) => [styles.outer, !isDark && styles.lightLift, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      <View style={[styles.card, { borderColor: isDark ? colors.border : 'rgba(0,0,0,0.08)' }]}>
        <Image source={require('../../assets/images/arena-hero-bg.jpg')} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient
          colors={['rgba(8,8,12,0.94)', 'rgba(8,8,12,0.78)', 'rgba(60,40,0,0.7)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <VsMark size={44} />
        <View style={styles.textCol}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>{t('arena.title')}</Text>
            <View style={styles.newPill}>
              <Text style={styles.newText}>{t('arena.new_badge')}</Text>
            </View>
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>{t('arena.home_banner_sub')}</Text>
        </View>
        <View style={styles.cta}>
          <Ionicons name="play" size={16} color="#000" style={{ marginLeft: 2 }} />
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  outer: { marginTop: 12, borderRadius: 18 },
  card: {
    height: 68,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 12,
    gap: 12,
    backgroundColor: '#0B0B10',
  },
  lightLift: {
    backgroundColor: '#0B0B10',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  textCol: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#FFF', fontFamily: 'Poppins_700Bold', fontSize: 15, letterSpacing: 0.3, flexShrink: 1 },
  newPill: { backgroundColor: ARENA_GOLD, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  newText: { color: '#000', fontFamily: 'Poppins_700Bold', fontSize: 9, letterSpacing: 0.5 },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontFamily: 'Poppins_500Medium', fontSize: 11, marginTop: -1 },
  cta: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ARENA_GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
