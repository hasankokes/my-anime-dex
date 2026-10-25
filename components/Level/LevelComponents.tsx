import React, { useEffect } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import {
    RANKS,
    Rank,
    XP_SOURCES,
    getLevelProgress,
    getNextRank,
    getRank,
    rankIndex,
    xpToNextRank,
} from '../../lib/levelSystem';

const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 1 };

/** Round gradient icon of a rank. */
export const RankIcon: React.FC<{ rank: Rank; size?: number; locked?: boolean }> = ({ rank, size = 28, locked }) => {
    const { colors } = useTheme();
    return (
        <LinearGradient
            colors={locked ? [colors.border, colors.border] : rank.gradient}
            start={GRADIENT_START}
            end={GRADIENT_END}
            style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
        >
            <Ionicons name={locked ? 'lock-closed' : rank.icon} size={size * 0.55} color={locked ? colors.subtext : '#FFFFFF'} />
        </LinearGradient>
    );
};

/** Gradient pill with the rank icon and name (and optionally the level). */
export const RankBadge: React.FC<{
    level: number;
    size?: 'sm' | 'md';
    showLevel?: boolean;
    onPress?: () => void;
}> = ({ level, size = 'md', showLevel, onPress }) => {
    const { t } = useLanguage();
    const rank = getRank(level);
    const sm = size === 'sm';
    const content = (
        <LinearGradient
            colors={rank.gradient}
            start={GRADIENT_START}
            end={{ x: 1, y: 0 }}
            style={[styles.badge, sm ? styles.badgeSm : styles.badgeMd]}
        >
            <Ionicons name={rank.icon} size={sm ? 11 : 15} color="#FFFFFF" />
            <Text style={[styles.badgeText, { fontSize: sm ? 10 : 13 }]} numberOfLines={1}>
                {t(`level.ranks.${rank.id}`)}
                {showLevel ? `  ·  ${t('level.levelShort', { level })}` : ''}
            </Text>
            {onPress && <Ionicons name="chevron-forward" size={sm ? 10 : 13} color="rgba(255,255,255,0.85)" />}
        </LinearGradient>
    );
    if (!onPress) return content;
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${t(`level.ranks.${rank.id}`)}, ${t('level.levelShort', { level })}`}
        >
            {content}
        </TouchableOpacity>
    );
};

/** "Lv 7 · 23/35 XP" + gradient bar + hint towards the next rank. */
export const LevelProgress: React.FC<{ xp: number; level: number; showNextRankHint?: boolean }> = ({
    xp, level, showNextRankHint = true,
}) => {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const progress = getLevelProgress(xp, level);
    const rank = getRank(progress.level);
    const nextRank = getNextRank(progress.level);
    const toNext = xpToNextRank(xp, progress.level);

    const fill = useSharedValue(0);
    useEffect(() => {
        fill.value = withTiming(progress.percent, { duration: 700, easing: Easing.out(Easing.cubic) });
    }, [progress.percent]);
    const fillStyle = useAnimatedStyle(() => ({ width: `${Math.max(fill.value * 100, 3)}%` }));

    return (
        <View style={styles.progressWrap}>
            <View style={styles.progressHeader}>
                <Text style={[styles.progressLevel, { color: colors.text }]}>
                    {t('level.levelShort', { level: progress.level })}
                </Text>
                <Text style={[styles.progressXp, { color: colors.subtext }]}>
                    {progress.current}/{progress.total} XP
                </Text>
            </View>
            <View style={[styles.track, { backgroundColor: colors.border }]}>
                <Animated.View style={[styles.fill, fillStyle]}>
                    <LinearGradient colors={rank.gradient} start={GRADIENT_START} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                </Animated.View>
            </View>
            {showNextRankHint && (
                <Text style={[styles.progressHint, { color: colors.subtext }]}>
                    {nextRank && toNext !== null
                        ? t('level.toNextRank', { xp: toNext, rank: t(`level.ranks.${nextRank.id}`) })
                        : t('level.maxRank')}
                </Text>
            )}
        </View>
    );
};

/** Bottom sheet with every rank and the ways to earn XP. */
export const RankLadderSheet: React.FC<{ visible: boolean; onClose: () => void; xp: number; level: number }> = ({
    visible, onClose, xp, level,
}) => {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();
    const current = rankIndex(level);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
            <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
                <View style={[styles.grabber, { backgroundColor: colors.border }]} />
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('level.ladderTitle')}</Text>
                    <Text style={[styles.sheetSubtitle, { color: colors.subtext }]}>{t('level.ladderSubtitle')}</Text>

                    <View style={[styles.sheetProgress, { backgroundColor: colors.background }]}>
                        <RankBadge level={level} showLevel />
                        <LevelProgress xp={xp} level={level} />
                    </View>

                    {RANKS.map((rank, i) => {
                        const locked = i > current;
                        const isCurrent = i === current;
                        return (
                            <View
                                key={rank.id}
                                style={[
                                    styles.rankRow,
                                    { borderColor: isCurrent ? rank.colorHex : colors.border },
                                    isCurrent && { backgroundColor: `${rank.colorHex}1A` },
                                ]}
                            >
                                <RankIcon rank={rank} size={40} locked={locked} />
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.rankName, { color: locked ? colors.subtext : colors.text }]}>
                                        {t(`level.ranks.${rank.id}`)}
                                    </Text>
                                    <Text style={[styles.rankMeta, { color: colors.subtext }]}>
                                        {t('level.fromLevel', { level: rank.minLevel })}
                                    </Text>
                                </View>
                                {isCurrent ? (
                                    <Text style={[styles.currentTag, { color: rank.colorHex }]}>{t('level.current')}</Text>
                                ) : !locked ? (
                                    <Ionicons name="checkmark-circle" size={20} color={rank.colorHex} />
                                ) : null}
                            </View>
                        );
                    })}

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('level.howToEarn')}</Text>
                    {XP_SOURCES.map(source => (
                        <View key={source.key} style={[styles.sourceRow, { borderBottomColor: colors.border }]}>
                            <Ionicons name={source.icon} size={18} color={colors.subtext} />
                            <Text style={[styles.sourceText, { color: colors.text }]}>{t(`level.sources.${source.key}`)}</Text>
                            <Text style={styles.sourceXp}>+{source.xp} XP</Text>
                        </View>
                    ))}
                </ScrollView>
            </View>
        </Modal>
    );
};

/** Celebration shown once after the level (or rank) went up. */
export const LevelUpModal: React.FC<{ level: number | null; rankUp: boolean; onClose: () => void }> = ({
    level, rankUp, onClose,
}) => {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const visible = level !== null;
    const rank = getRank(level ?? 1);

    const scale = useSharedValue(0.4);
    const glow = useSharedValue(0);
    useEffect(() => {
        if (!visible) return;
        scale.value = 0.4;
        scale.value = withSpring(1, { damping: 9, stiffness: 140 });
        glow.value = withDelay(250, withRepeat(withSequence(
            withTiming(1, { duration: 900 }),
            withTiming(0.35, { duration: 900 }),
        ), -1));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }, [visible, level]);

    const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value * 0.45, transform: [{ scale: 1 + glow.value * 0.25 }] }));

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.celebrateBackdrop}>
                <View style={[styles.celebrateCard, { backgroundColor: colors.card }]}>
                    <View style={styles.celebrateIconWrap}>
                        <Animated.View style={[styles.celebrateGlow, { backgroundColor: rank.colorHex }, glowStyle]} />
                        <Animated.View style={iconStyle}>
                            <RankIcon rank={rank} size={96} />
                        </Animated.View>
                    </View>
                    <Text style={[styles.celebrateTitle, { color: colors.text }]}>
                        {rankUp ? t('level.rankUpTitle') : t('level.levelUpTitle')}
                    </Text>
                    <Text style={[styles.celebrateBody, { color: colors.subtext }]}>
                        {rankUp
                            ? t('level.rankUpBody', { rank: t(`level.ranks.${rank.id}`), level })
                            : t('level.levelUpBody', { level })}
                    </Text>
                    <RankBadge level={level ?? 1} showLevel />
                    <TouchableOpacity onPress={onClose} activeOpacity={0.85} style={{ alignSelf: 'stretch', marginTop: 20 }}>
                        <LinearGradient colors={rank.gradient} start={GRADIENT_START} end={{ x: 1, y: 0 }} style={styles.celebrateButton}>
                            <Text style={styles.celebrateButtonText}>{t('level.continue')}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 999,
    },
    badgeSm: { paddingHorizontal: 7, paddingVertical: 2, gap: 3 },
    badgeMd: { paddingHorizontal: 12, paddingVertical: 5, gap: 6 },
    badgeText: {
        color: '#FFFFFF',
        fontWeight: '800',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        textShadowColor: 'rgba(0,0,0,0.25)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    progressWrap: { width: '100%', marginTop: 10 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    progressLevel: { fontSize: 13, fontWeight: '700' },
    progressXp: { fontSize: 12, fontWeight: '600' },
    track: { height: 10, borderRadius: 5, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 5, overflow: 'hidden' },
    progressHint: { fontSize: 12, marginTop: 6, textAlign: 'center' },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
        maxHeight: '85%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
    sheetTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
    sheetSubtitle: { fontSize: 14, textAlign: 'center', marginTop: 4, marginBottom: 16 },
    sheetProgress: { borderRadius: 16, padding: 16, marginBottom: 16, alignItems: 'center' },
    rankRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 8,
    },
    rankName: { fontSize: 15, fontWeight: '700' },
    rankMeta: { fontSize: 12, marginTop: 2 },
    currentTag: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
    sectionTitle: { fontSize: 17, fontWeight: '800', marginTop: 16, marginBottom: 6 },
    sourceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 11,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    sourceText: { flex: 1, fontSize: 14 },
    sourceXp: { fontSize: 14, fontWeight: '800', color: '#FACC15' },
    celebrateBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    celebrateCard: { width: '100%', maxWidth: 340, borderRadius: 24, padding: 24, alignItems: 'center' },
    celebrateIconWrap: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    celebrateGlow: { position: 'absolute', width: 120, height: 120, borderRadius: 60 },
    celebrateTitle: { fontSize: 26, fontWeight: '900', marginBottom: 6 },
    celebrateBody: { fontSize: 15, textAlign: 'center', marginBottom: 14 },
    celebrateButton: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    celebrateButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
