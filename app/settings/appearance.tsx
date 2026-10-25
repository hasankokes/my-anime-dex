import React, { useEffect } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { upperCase } from '../../lib/textCase';
import { useAuth } from '../../context/AuthProvider';
import { useCosmetics } from '../../context/CosmeticsProvider';
import { useFeature } from '../../hooks/usePremium';
import { PremiumGate } from '../../components/Premium/PremiumGate';
import { AvatarCutout, AvatarFrame, BannerArt, CUTOUT_WIDTH, DecoratedName, hasBanner, ProfileBanner } from '../../components/Profile/ProfileDecorations';
import { CosmeticItem, CosmeticSelection, CosmeticType, cosmeticName, parseBannerPattern, resolveDecor } from '../../lib/cosmetics';
import { analytics } from '../../lib/analytics';

const HEX = /^#[0-9a-f]{3,8}$/i;
// Gradient stops from a server payload; a malformed entry renders grey instead of crashing
const gradient = (value: unknown): [string, string, ...string[]] => {
    const list = Array.isArray(value) ? value.filter((c): c is string => typeof c === 'string' && HEX.test(c)) : [];
    return list.length >= 2 ? (list as [string, string, ...string[]]) : ['#6B7280', '#6B7280'];
};

const SLOTS: { type: CosmeticType; slot: keyof CosmeticSelection; titleKey: string }[] = [
    { type: 'theme', slot: 'theme', titleKey: 'cosmetics.themes' },
    { type: 'frame', slot: 'frame', titleKey: 'cosmetics.frames' },
    { type: 'banner', slot: 'banner', titleKey: 'cosmetics.banners' },
    { type: 'name_color', slot: 'name_color', titleKey: 'cosmetics.nameColors' },
];

export default function AppearanceScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { t, language } = useLanguage();
    const { avatarUrl } = useAuth();
    const { catalog, byId, selection, select, reload } = useCosmetics();
    const { locked } = useFeature('premium_cosmetics');
    const [saving, setSaving] = React.useState<string | null>(null);

    useEffect(() => {
        analytics.track('appearance_viewed', { locked });
        reload();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Preview always shows the picks (even while locked, behind the blur)
    const previewDecor = resolveDecor(selection, byId, true);

    const choose = async (slot: keyof CosmeticSelection, id: string | null) => {
        if (selection[slot] === id) return;
        setSaving(`${slot}:${id}`);
        await select({ [slot]: id });
        setSaving(null);
    };

    const renderSwatch = (item: CosmeticItem) => {
        switch (item.type) {
            case 'theme': {
                const p = item.payload?.[isDark ? 'dark' : 'light'] ?? {};
                return (
                    <View style={[styles.themeSwatch, { backgroundColor: p.background ?? colors.background, borderColor: p.border ?? colors.border }]}>
                        <View style={[styles.themeCard, { backgroundColor: p.card ?? colors.card }]} />
                        <View style={[styles.themeDot, { backgroundColor: p.primary ?? colors.primary }]} />
                    </View>
                );
            }
            case 'frame':
                return (
                    <LinearGradient colors={gradient(item.payload?.colors)} style={styles.frameSwatch}>
                        <View style={[styles.frameInner, { backgroundColor: colors.card }]} />
                    </LinearGradient>
                );
            case 'banner':
                return (
                    <View style={styles.bannerSwatch}>
                        <BannerArt colors={gradient(item.payload?.colors)} pattern={parseBannerPattern(item.payload)} />
                    </View>
                );
            case 'name_color':
                return (
                    <View style={[styles.nameSwatch, { backgroundColor: colors.inputBg }]}>
                        <Text style={[styles.nameSwatchText, { color: HEX.test(item.payload?.color) ? item.payload.color : colors.text }]}>Aa</Text>
                    </View>
                );
        }
    };

    const renderOption = (slot: keyof CosmeticSelection, item: CosmeticItem | null) => {
        const id = item?.id ?? null;
        const selected = (selection[slot] ?? null) === id;
        const busy = saving === `${slot}:${id}`;
        return (
            <TouchableOpacity
                key={id ?? 'none'}
                style={[styles.option, { borderColor: selected ? colors.primary : colors.border, backgroundColor: colors.card }]}
                onPress={() => choose(slot, id)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
            >
                {item ? renderSwatch(item) : (
                    <View style={[styles.noneSwatch, { borderColor: colors.border }]}>
                        <Ionicons name="close" size={20} color={colors.subtext} />
                    </View>
                )}
                <Text style={[styles.optionName, { color: colors.text }]} numberOfLines={1}>
                    {item ? cosmeticName(item, language) : t('cosmetics.none')}
                </Text>
                {busy ? (
                    <ActivityIndicator size="small" color={colors.primary} style={styles.check} />
                ) : selected ? (
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.check} />
                ) : null}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel={t('common.back')}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('cosmetics.title')}</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <PremiumGate feature="premium_cosmetics" source="appearance" description={t('cosmetics.locked')}>
                    {/* Live preview of the profile header */}
                    <View style={[styles.preview, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <ProfileBanner
                            decor={previewDecor}
                            // Half the 72pt avatar (+ frame and cutout rings) sits on the banner, plus the body's top padding
                            overlap={(72 + (previewDecor.frameColors ? 12 : 0) + (hasBanner(previewDecor) ? CUTOUT_WIDTH * 2 : 0)) / 2 + 12}
                            style={styles.previewBanner}
                        />
                        <View style={styles.previewBody}>
                            <AvatarCutout active={hasBanner(previewDecor)} color={colors.card}>
                            <AvatarFrame colors={previewDecor.frameColors} size={6} animation={previewDecor.frameAnimation} animate>
                                <Image
                                    source={{ uri: avatarUrl || 'https://via.placeholder.com/150' }}
                                    style={[styles.previewAvatar, { backgroundColor: colors.inputBg }]}
                                />
                            </AvatarFrame>
                            </AvatarCutout>
                            <DecoratedName
                                name={t('cosmetics.previewName')}
                                decor={previewDecor}
                                defaultColor={colors.text}
                                style={styles.previewName}
                                badgeSize="md"
                            />
                        </View>
                    </View>

                    {catalog.length === 0 ? (
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
                    ) : (
                        SLOTS.map(({ type, slot, titleKey }) => (
                            <View key={type} style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>{upperCase(t(titleKey), language)}</Text>
                                <View style={styles.grid}>
                                    {renderOption(slot, null)}
                                    {catalog.filter(item => item.type === type).map(item => renderOption(slot, item))}
                                </View>
                            </View>
                        ))
                    )}
                </PremiumGate>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 36,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
    },
    content: {
        padding: 20,
        paddingBottom: 48,
    },
    preview: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        paddingBottom: 16,
    },
    previewBanner: {
        marginHorizontal: 0,
        borderRadius: 0,
        height: 100,
    },
    previewBody: {
        alignItems: 'center',
        gap: 10,
        paddingTop: 12,
    },
    previewAvatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
    },
    previewName: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 18,
    },
    section: {
        marginTop: 24,
    },
    sectionTitle: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 12,
        letterSpacing: 1,
        marginBottom: 12,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    option: {
        width: '30.5%',
        borderWidth: 2,
        borderRadius: 16,
        padding: 10,
        alignItems: 'center',
        gap: 8,
    },
    optionName: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 12,
    },
    check: {
        position: 'absolute',
        top: 6,
        right: 6,
    },
    noneSwatch: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 1,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    themeSwatch: {
        width: 56,
        height: 56,
        borderRadius: 14,
        borderWidth: 1,
        padding: 8,
        justifyContent: 'space-between',
    },
    themeCard: {
        height: 16,
        borderRadius: 4,
    },
    themeDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        alignSelf: 'flex-end',
    },
    frameSwatch: {
        width: 56,
        height: 56,
        borderRadius: 28,
        padding: 5,
    },
    frameInner: {
        flex: 1,
        borderRadius: 28,
    },
    bannerSwatch: {
        width: 72,
        height: 56,
        borderRadius: 12,
        overflow: 'hidden',
    },
    nameSwatch: {
        width: 56,
        height: 56,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nameSwatchText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 22,
    },
});
