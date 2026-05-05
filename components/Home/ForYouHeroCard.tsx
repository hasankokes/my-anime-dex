import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Animated, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import TextTicker from 'react-native-text-ticker';
interface ForYouHeroCardProps {
  userListCount: number;
  topGenre?: string;
  onPress: () => void;
  onDicePress: () => void;
  discoverRef?: React.RefObject<View | null>;
  rollDiceRef?: React.RefObject<View | null>;
  measureRef?: (ref: React.RefObject<View | null>, stepIndex: number) => void;
}

export const ForYouHeroCard: React.FC<ForYouHeroCardProps> = ({
  userListCount,
  topGenre,
  onPress,
  onDicePress,
  discoverRef,
  rollDiceRef,
  measureRef,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  // Removed animated loop for testing touch events on Android

  // Determine state
  let title = '';
  let subtitle = '';

  if (userListCount === 0) {
    title = t('home.forYou.newUserTitle');
    subtitle = t('home.forYou.newUserSubtitle');
  } else if (userListCount > 0 && userListCount < 10) {
    title = t('home.forYou.fewItemsTitle');
    subtitle = t('home.forYou.newUserSubtitle');
  } else {
    // Normal / high count
    title = t('home.forYou.personalTitle');
    subtitle = topGenre ? t('home.forYou.personalSubtitle').replace('{genre}', topGenre) : t('home.forYou.newUserSubtitle');
  }

  const { width } = useWindowDimensions();
  const totalWidth = width - 40 - 12; // 40 is horizontal padding, 12 is gap between buttons
  const rightWidth = 135; // Fixed width to match My Lists button

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Personalized Recommendation Card */}
        <Pressable
          ref={discoverRef as any}
          {...({ collapsable: false } as any)}
          onPress={onPress}
          onLayout={() => measureRef && measureRef(discoverRef as any, 2)}
          style={({ pressed }) => [
            styles.splitCard,
            { 
              flex: 1, 
              backgroundColor: colors.card, 
              borderColor: colors.border, 
              opacity: pressed ? 0.9 : 1, 
              paddingVertical: 10,
              paddingLeft: 19,
              paddingRight: 12,
              gap: 8,
            }
          ]}
          android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
        >
          <Ionicons name="sparkles" size={18} color="#FACC15" />
          <View style={[styles.textContainer, { overflow: 'hidden' }]}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
            <TextTicker
              style={[styles.subtitle, { color: colors.subtext }]}
              duration={8000}
              loop
              bounce={false}
              repeatSpacer={50}
              marqueeDelay={1500}
            >
              {subtitle}
            </TextTicker>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#FACC15" />
        </Pressable>

        {/* Dice Roll Card */}
        <Pressable
          ref={rollDiceRef as any}
          {...({ collapsable: false } as any)}
          onPress={onDicePress}
          onLayout={() => measureRef && measureRef(rollDiceRef as any, 3)}
          style={({ pressed }) => [
            styles.splitCard,
            { 
              width: rightWidth, 
              backgroundColor: colors.card, 
              borderColor: colors.border, 
              opacity: pressed ? 0.9 : 1, 
              paddingLeft: 14,
              paddingRight: 12,
              gap: 12,
              justifyContent: 'flex-start'
            }
          ]}

          android_ripple={{ color: 'rgba(250, 204, 21, 0.2)' }}
        >
          <Ionicons name="dice" size={20} color="#FACC15" />
          <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: colors.text }} numberOfLines={1}>
            {t('home.forYou.rollDice')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    marginTop: 12,
    marginBottom: 4,
    zIndex: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  splitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  emoji: {
    fontSize: 18,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    marginBottom: 0,
  },
  subtitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    marginTop: -2,
  },
});
