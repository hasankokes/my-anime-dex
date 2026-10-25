import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { DiscoverItem } from '../../services/recommendationService';
import { genreLabel, metaLine, reasonIcon, reasonText } from './discoverText';

interface Props {
  item: DiscoverItem;
  saved: boolean;
  onPress: () => void;
  onSave: () => void;
  onHide: () => void;
  /** Premium: list the entries that led to this pick (with the user's rating) */
  showContributors?: boolean;
  /** Accessibility label of the hide button (premium "Don't recommend") */
  hideLabel?: string;
}

export const DiscoverCard: React.FC<Props> = React.memo(({ item, saved, onPress, onSave, onHide, showContributors, hideLabel }) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { anime } = item;
  const imageUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      {/* The poster fills the card's height (set by the text column) instead of sizing it */}
      <View style={styles.posterBox}>
        <Image source={imageUrl ? { uri: imageUrl } : undefined} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        {item.match != null && (
          <View style={styles.matchBadge}>
            <Text style={styles.matchText}>{t('discover.match', { percent: item.match })}</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {anime.title_english || anime.title}
          </Text>
          {item.averageScore ? (
            <View style={styles.score}>
              <Ionicons name="star" size={11} color="#FACC15" />
              <Text style={[styles.scoreText, { color: colors.text }]}>{(item.averageScore / 10).toFixed(1)}</Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.meta, { color: colors.subtext }]} numberOfLines={1}>
          {metaLine(t, item)}
        </Text>

        {anime.genres?.length > 0 && (
          <View style={styles.genreRow}>
            {anime.genres.slice(0, 3).map(g => (
              <View key={g.name} style={[styles.genreTag, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
                <Text style={[styles.genreText, { color: colors.subtext }]} numberOfLines={1}>
                  {genreLabel(t, g.name)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {item.reasons.length > 0 && (
          <View style={[styles.reasonBox, { backgroundColor: isDark ? 'rgba(250, 204, 21, 0.08)' : 'rgba(250, 204, 21, 0.12)' }]}>
            {item.reasons.map((r, i) => (
              <View key={i} style={styles.reasonRow}>
                <Ionicons name={reasonIcon(r) as any} size={12} color={isDark ? '#FACC15' : '#B45309'} style={styles.reasonIcon} />
                <Text style={[styles.reasonText, { color: colors.text }]} numberOfLines={2}>
                  {reasonText(t, r)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {showContributors && !!item.contributors?.length && (
          <Text style={[styles.contributors, { color: colors.subtext }]} numberOfLines={2}>
            {t('smartRecs.contributors', {
              list: item.contributors.map(c => (c.rating ? `${c.title} (★${c.rating})` : c.title)).join(' · '),
            })}
          </Text>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onSave}
            disabled={saved}
            style={[
              styles.saveButton,
              saved
                ? { backgroundColor: 'transparent', borderColor: colors.border }
                : { backgroundColor: '#FACC15', borderColor: '#FACC15' },
            ]}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name={saved ? 'checkmark' : 'bookmark-outline'} size={14} color={saved ? colors.subtext : '#000'} />
            <Text style={[styles.saveText, { color: saved ? colors.subtext : '#000' }]} numberOfLines={1}>
              {saved ? t('discover.saved') : t('discover.planToWatch')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onHide}
            style={[styles.hideButton, { borderColor: colors.border }]}
            accessibilityLabel={hideLabel ?? t('discover.notInterested')}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="eye-off-outline" size={15} color={colors.subtext} />
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  );
});

DiscoverCard.displayName = 'DiscoverCard';

const styles = StyleSheet.create({
  contributors: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    marginTop: 6,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
  posterBox: {
    width: 112,
    minHeight: 190,
    alignSelf: 'stretch',
  },
  matchBadge: {
    position: 'absolute',
    left: 6,
    top: 6,
    backgroundColor: '#FACC15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  matchText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
    color: '#000',
  },
  body: {
    flex: 1,
    padding: 12,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  title: {
    flex: 1,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 19,
  },
  score: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  scoreText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
  },
  meta: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  genreTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  genreText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
  },
  reasonBox: {
    padding: 8,
    borderRadius: 8,
    gap: 3,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  reasonIcon: {
    marginTop: 2,
  },
  reasonText: {
    flex: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    lineHeight: 15,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 'auto',
    paddingTop: 2,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
  },
  saveText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  hideButton: {
    width: 36,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
